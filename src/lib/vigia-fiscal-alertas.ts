import { and, eq, isNotNull, like, notInArray, or } from "drizzle-orm";
import { db } from "@/db";
import { alertas, prefeituras, usuarios } from "@/db/schema";
import { enviarEmail } from "@/lib/email";
import { linkApp } from "@/lib/url-app";
import { formatarMoeda } from "@/lib/formatadores";
import { planosContratadosDe } from "@/lib/planos";
import { PREFEITURAS_INTERNAS } from "@/lib/prefeituras-internas";
import { rotuloDoPeriodoRgf } from "@/lib/fatos-do-municipio";
import { conferirSituacaoFiscal, type SituacaoFiscal } from "@/lib/vigia-fiscal";
import type { NumerosInconsistentes } from "@/lib/siconfi-rgf";

// ── A ROTINA DIÁRIA DA VIGIA FISCAL (plano Gestão) ──
//
// Todo dia, para cada prefeitura com o Gestão: confere no Tesouro o que foi
// entregue e se os números do RGF fecham, e transforma o que achou em alerta
// no painel, com e-mail ao prefeito e aos administradores.
//
// ── O ALERTA SE RESOLVE SOZINHO ──
//
// Cada alerta tem um id que descreve o fato ("fiscal:<prefeitura>:2026:rgf:2:
// vencida"). Inserir de novo o mesmo id não duplica nada, e o e-mail só sai
// quando o alerta é novo. Quando o fato deixa de existir (a entrega apareceu
// no Tesouro, o prazo de "vence em breve" passou a "vencida"), o alerta antigo
// é marcado como resolvido, sem ninguém clicar em nada.

export type AlertaFiscal = {
  id: string;
  titulo: string;
  descricao: string;
  prioridade: "urgente" | "medio";
};

const prefixo = (prefeituraId: string) => `fiscal:${prefeituraId}:`;

function dataBr(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function pct(v: number): string {
  return `${v.toFixed(2).replace(".", ",")}%`;
}

/**
 * Os alertas que a situação pede. Função pura: é o que os testes cobrem.
 *
 * Só vira alerta de ATRASO o que foi conferido: período que o Tesouro não
 * respondeu não acusa ninguém, e SIOPS e SIOPE, que não têm consulta pública,
 * entram só como lembrete antes do prazo.
 */
export function alertasDaSituacao(prefeituraId: string, s: SituacaoFiscal): AlertaFiscal[] {
  const lista: AlertaFiscal[] = [];
  const base = `${prefixo(prefeituraId)}${s.exercicio}:`;

  for (const o of s.avaliadas) {
    const chave = `${o.obrigacao.chave}:${o.numero}`;
    const conferido = o.obrigacao.verificavel && !s.inconclusivos.includes(chave);
    const nome = `${o.obrigacao.sigla} do ${o.rotulo}`;

    if (o.situacao === "vencida" && conferido) {
      lista.push({
        id: `${base}${chave}:vencida`,
        prioridade: "urgente",
        titulo: `${nome} não consta entregue no Tesouro`,
        descricao:
          `O prazo terminou em ${dataBr(o.vencimento)} e a entrega não aparece no Tesouro Nacional (Siconfi). ` +
          `${o.obrigacao.consequencia} O alerta some sozinho quando a entrega aparecer no Tesouro.`,
      });
    }

    if (o.situacao === "vence_breve" && (conferido || !o.obrigacao.verificavel)) {
      const dias = o.diasRestantes;
      lista.push({
        id: `${base}${chave}:vence`,
        prioridade: "medio",
        titulo: `${nome} vence ${dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `em ${dias} dias`}`,
        descricao:
          `Prazo: ${dataBr(o.vencimento)}, no ${o.obrigacao.sistema}. ` +
          (o.obrigacao.verificavel
            ? "Ainda não consta entregue. "
            : "Esta entrega não tem consulta pública; confirme com a equipe. ") +
          o.obrigacao.consequencia,
      });
    }
  }

  const inconsistente: NumerosInconsistentes | undefined =
    s.pessoal && !s.pessoal.ok
      ? s.pessoal.numerosInconsistentes
      : s.pessoal?.ok
      ? s.pessoal.contexto?.inconsistenteMaisRecente
      : undefined;
  if (inconsistente) {
    const p = inconsistente.periodo;
    lista.push({
      id: `${prefixo(prefeituraId)}${p.exercicio}:rgf-numeros:${p.periodicidade}${p.periodo}`,
      prioridade: "urgente",
      titulo: `Os números do ${rotuloDoPeriodoRgf(p)} não fecham`,
      descricao:
        `O RGF entregue ao Tesouro declara ${formatarMoeda(inconsistente.despesa)} de despesa com pessoal ` +
        `sobre uma receita corrente líquida de ${formatarMoeda(inconsistente.rcl)} ` +
        `(${pct((inconsistente.despesa / inconsistente.rcl) * 100)}). Esses números aparecem no portal do Tesouro ` +
        `e no Raio-X público. Vale conferir o preenchimento com a contabilidade e retificar no Siconfi.`,
    });
  }

  return lista;
}

/** Grava os alertas novos, resolve os que deixaram de valer e avisa por e-mail. */
/**
 * Só se pode dar um alerta por resolvido quando a conferência foi completa.
 * Se o Tesouro não respondeu sobre algum período, a ausência do alerta hoje
 * não quer dizer que o problema acabou.
 */
export function conferenciaCompleta(s: SituacaoFiscal): boolean {
  if (s.inconclusivos.length > 0) return false;
  return !(s.pessoal && !s.pessoal.ok && s.pessoal.causa === "consulta_falhou");
}

async function aplicarAlertas(
  prefeituraId: string,
  lista: AlertaFiscal[],
  podeResolver: boolean
): Promise<{ novos: AlertaFiscal[]; resolvidos: number }> {
  const novos: AlertaFiscal[] = [];
  for (const a of lista) {
    const inseridos = await db
      .insert(alertas)
      .values({ id: a.id, prefeituraId, titulo: a.titulo, descricao: a.descricao, prioridade: a.prioridade })
      .onConflictDoNothing()
      .returning({ id: alertas.id });
    if (inseridos.length) novos.push(a);
  }

  if (!podeResolver) return { novos, resolvidos: 0 };
  const ids = lista.map((a) => a.id);
  const resolvidos = await db
    .update(alertas)
    .set({ resolvido: true })
    .where(
      and(
        eq(alertas.prefeituraId, prefeituraId),
        like(alertas.id, `${prefixo(prefeituraId)}%`),
        eq(alertas.resolvido, false),
        ...(ids.length ? [notInArray(alertas.id, ids)] : [])
      )
    )
    .returning({ id: alertas.id });

  return { novos, resolvidos: resolvidos.length };
}

async function avisarPorEmail(prefeituraId: string, municipio: string, novos: AlertaFiscal[]) {
  if (!novos.length) return;
  const destinatarios = await db
    .select({ email: usuarios.email })
    .from(usuarios)
    .where(
      and(
        eq(usuarios.prefeituraId, prefeituraId),
        isNotNull(usuarios.email),
        or(eq(usuarios.cargo, "prefeito"), eq(usuarios.cargo, "admin"))
      )
    );
  const urgentes = novos.filter((a) => a.prioridade === "urgente").length;
  const assunto =
    urgentes > 0
      ? `${municipio}: ${urgentes === 1 ? "1 pendência fiscal" : `${urgentes} pendências fiscais`} no Tesouro`
      : `${municipio}: prazo fiscal chegando`;
  const html = `
    <p><strong>A vigia fiscal do CidadeIA conferiu o Tesouro Nacional hoje.</strong></p>
    ${novos.map((a) => `<p><strong>${a.titulo}</strong><br>${a.descricao}</p>`).join("")}
    <p><a href="${linkApp("/dashboard/alertas")}">Ver os alertas no painel</a></p>
  `;
  await Promise.all(
    destinatarios
      .filter((d): d is { email: string } => !!d.email)
      .map((d) => enviarEmail({ para: d.email, assunto, html }))
  );
}

export type RelatorioVigiaFiscal = {
  conferidas: number;
  alertasNovos: number;
  resolvidos: number;
  /** Prefeituras que ficaram para a próxima rodada por falta de tempo. */
  adiadas: number;
  erros: string[];
};

/**
 * Roda a vigia para todas as prefeituras com o Gestão.
 *
 * Uma de cada vez, com pausa, para não martelar o Tesouro; e com orçamento de
 * tempo, porque a rotina divide a função com a cobrança. A ordem gira pelo
 * dia do ano, para a que ficou de fora hoje vir primeiro em outro dia.
 */
export async function rodarVigiaFiscal(opcoes: { orcamentoMs?: number; hoje?: Date } = {}): Promise<RelatorioVigiaFiscal> {
  const inicio = Date.now();
  const orcamento = opcoes.orcamentoMs ?? 40_000;
  const hoje = opcoes.hoje ?? new Date();
  const relatorio: RelatorioVigiaFiscal = { conferidas: 0, alertasNovos: 0, resolvidos: 0, adiadas: 0, erros: [] };

  const todas = await db
    .select({
      id: prefeituras.id,
      municipio: prefeituras.municipio,
      populacao: prefeituras.populacao,
      codigoIbge: prefeituras.codigoIbge,
      planos: prefeituras.planosContratados,
    })
    .from(prefeituras)
    .where(and(isNotNull(prefeituras.codigoIbge), notInArray(prefeituras.id, PREFEITURAS_INTERNAS)));

  const comGestao = todas.filter((p) => planosContratadosDe(p.planos).includes("gestao"));
  const giro = Math.floor(hoje.getTime() / 86_400_000) % Math.max(1, comGestao.length);
  const fila = [...comGestao.slice(giro), ...comGestao.slice(0, giro)];

  for (const [i, p] of fila.entries()) {
    if (Date.now() - inicio > orcamento) {
      relatorio.adiadas = fila.length - i;
      break;
    }
    try {
      const situacao = await conferirSituacaoFiscal({ codigoIbge: p.codigoIbge!, populacao: p.populacao, hoje });
      const { novos, resolvidos } = await aplicarAlertas(
        p.id,
        alertasDaSituacao(p.id, situacao),
        conferenciaCompleta(situacao)
      );
      await avisarPorEmail(p.id, p.municipio, novos);
      relatorio.conferidas++;
      relatorio.alertasNovos += novos.length;
      relatorio.resolvidos += resolvidos;
    } catch (e) {
      relatorio.erros.push(`${p.municipio}: ${e instanceof Error ? e.message : String(e)}`);
    }
    await new Promise((ok) => setTimeout(ok, 500));
  }
  return relatorio;
}
