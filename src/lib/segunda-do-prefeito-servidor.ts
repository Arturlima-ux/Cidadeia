import { and, eq, gte, inArray, isNotNull, like, notInArray, or } from "drizzle-orm";
import { db } from "@/db";
import { alertas, auditoria, contratos, licitacoes, pedidoEventos, prefeituras, usuarios } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { enviarEmail } from "@/lib/email";
import { linkApp } from "@/lib/url-app";
import { planosContratadosDe } from "@/lib/planos";
import { PREFEITURAS_INTERNAS } from "@/lib/prefeituras-internas";
import { periodicidadeRgf, periodosDoExercicio } from "@/lib/obrigacoes-fiscais";
import { AREAS, type Area } from "@/lib/alerta-por-area";
import { EVENTO_REGRA_ENCERRADA } from "@/lib/vigia-dos-modulos";
import {
  EVENTO_SEGUNDA,
  emailDaSegunda,
  idDaSegunda,
  type DadosDaSemana,
  type Resolvido,
  type Vencimento,
} from "@/lib/segunda-do-prefeito";

// ── A ROTINA DA SEGUNDA ── (ver segunda-do-prefeito.ts)

const DIA = 86_400_000;
const curto = (t: string, n = 70) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

export async function dadosDaSemana(
  p: { id: string; municipio: string; populacao: number | null; planos: string },
  hoje: Date
): Promise<DadosDaSemana> {
  const planos = planosContratadosDe(p.planos);
  const hojeIso = hoje.toISOString().slice(0, 10);
  const limiteIso = new Date(hoje.getTime() + 7 * DIA).toISOString().slice(0, 10);
  // Só a data: as colunas guardam "AAAA-MM-DD hh:mm…-03", e a data pura compara certo com qualquer hora.
  const semanaPassada = new Date(hoje.getTime() - 7 * DIA).toISOString().slice(0, 10);

  const abertosDb = await db
    .select({ id: alertas.id, titulo: alertas.titulo, descricao: alertas.descricao, prioridade: alertas.prioridade, secretaria: alertas.secretaria })
    .from(alertas)
    .where(and(eq(alertas.prefeituraId, p.id), eq(alertas.resolvido, false)));
  const abertos = abertosDb.filter((a) => a.prioridade !== "info");
  const idsAbertos = new Set(abertosDb.map((a) => a.id));

  const vencimentos: Vencimento[] = [];

  // Prazos legais do Tesouro. O que se confere no Siconfi só entra se a
  // vigia fiscal ainda não viu a entrega (há o alerta "vence" aberto); o que
  // não tem consulta pública (SIOPS, SIOPE) entra como lembrete.
  if (planos.includes("gestao")) {
    const exercicio = hoje.getUTCFullYear();
    const periodos = [
      ...periodosDoExercicio(exercicio, { periodicidadeRgf: periodicidadeRgf(p.populacao) }),
      ...periodosDoExercicio(exercicio + 1, { periodicidadeRgf: periodicidadeRgf(p.populacao) }),
    ];
    for (const o of periodos) {
      if (o.vencimento < hojeIso || o.vencimento > limiteIso) continue;
      const exerc = o.fimDoPeriodo.slice(0, 4);
      const pendente = idsAbertos.has(`fiscal:${p.id}:${exerc}:${o.obrigacao.chave}:${o.numero}:vence`);
      if (o.obrigacao.verificavel && !pendente) continue;
      vencimentos.push({
        data: o.vencimento,
        texto: o.obrigacao.verificavel
          ? `${o.obrigacao.sigla} do ${o.rotulo}, ainda não consta entregue no Tesouro`
          : `${o.obrigacao.sigla} do ${o.rotulo} (${o.obrigacao.sistema}); sem consulta pública, confirme a entrega com a equipe`,
        secretaria: o.obrigacao.chave === "siops" ? "saude" : o.obrigacao.chave === "siope" ? "educacao" : null,
      });
    }
  }

  if (planos.includes("licitacoes")) {
    const [ls, cs] = await Promise.all([
      db
        .select({ numero: licitacoes.numero, objeto: licitacoes.objeto, prazoFinal: licitacoes.prazoFinal, status: licitacoes.status })
        .from(licitacoes)
        .where(eq(licitacoes.prefeituraId, p.id)),
      db
        .select({ numeroContrato: contratos.numeroContrato, objeto: contratos.objeto, vigenciaFim: contratos.vigenciaFim })
        .from(contratos)
        .where(eq(contratos.prefeituraId, p.id)),
    ]);
    for (const l of ls) {
      const data = l.prazoFinal?.slice(0, 10);
      if (!data || data < hojeIso || data > limiteIso) continue;
      if (l.status === "homologada" || l.status === "cancelada") continue;
      vencimentos.push({ data, texto: `prazo final da licitação ${l.numero} (${curto(l.objeto)})`, secretaria: "licitacoes" });
    }
    for (const c of cs) {
      const data = c.vigenciaFim?.slice(0, 10);
      if (!data || data < hojeIso || data > limiteIso) continue;
      vencimentos.push({
        data,
        texto: `fim da vigência do contrato${c.numeroContrato ? ` ${c.numeroContrato}` : ""} (${curto(c.objeto)}). Aditivo depois do fim não prorroga nada`,
        secretaria: "licitacoes",
      });
    }
  }

  // O que fechou: sozinho (a vigia viu o problema sumir) ou pela equipe.
  const [sumidos, fechadosAMao] = await Promise.all([
    db
      .select({ pedidoId: pedidoEventos.pedidoId, descricao: pedidoEventos.descricao })
      .from(pedidoEventos)
      .where(
        and(
          eq(pedidoEventos.tipo, EVENTO_REGRA_ENCERRADA),
          gte(pedidoEventos.criadoEm, semanaPassada),
          or(like(pedidoEventos.pedidoId, `regra:${p.id}:%`), like(pedidoEventos.pedidoId, `fiscal:${p.id}:%`))
        )
      ),
    db
      .select({ id: auditoria.entidadeId })
      .from(auditoria)
      .where(and(eq(auditoria.prefeituraId, p.id), eq(auditoria.entidade, "alerta"), eq(auditoria.acao, "resolver"), gte(auditoria.createdAt, semanaPassada))),
  ]);
  const resolvidos: Resolvido[] = [];
  for (const e of sumidos) {
    // Fechou e voltou na mesma semana: não está resolvido.
    if (idsAbertos.has(e.pedidoId)) continue;
    try {
      const d = JSON.parse(e.descricao) as { titulo?: string; secretaria?: string | null; pelaVigia?: boolean };
      if (d.pelaVigia && d.titulo) resolvidos.push({ titulo: d.titulo, secretaria: d.secretaria ?? null, sozinho: true });
    } catch {
      // linha antiga sem JSON: não entra no resumo
    }
  }
  const idsMao = [...new Set(fechadosAMao.map((f) => f.id).filter((x): x is string => !!x))];
  if (idsMao.length) {
    const linhas = await db
      .select({ titulo: alertas.titulo, secretaria: alertas.secretaria })
      .from(alertas)
      .where(and(eq(alertas.prefeituraId, p.id), inArray(alertas.id, idsMao), eq(alertas.resolvido, true)));
    for (const l of linhas) resolvidos.push({ titulo: l.titulo, secretaria: l.secretaria, sozinho: false });
  }

  return { municipio: p.municipio, abertos, vencimentos, resolvidos, linkPainel: linkApp("/dashboard/alertas") };
}

export type RelatorioSegunda = { prefeituras: number; emails: number; jaEnviadas: number; erros: string[] };

export async function rodarSegundaDoPrefeito(opcoes: { hoje?: Date; soPrefeitura?: string } = {}): Promise<RelatorioSegunda> {
  const hoje = opcoes.hoje ?? new Date();
  const r: RelatorioSegunda = { prefeituras: 0, emails: 0, jaEnviadas: 0, erros: [] };

  const todas = await db
    .select({ id: prefeituras.id, municipio: prefeituras.municipio, populacao: prefeituras.populacao, planos: prefeituras.planosContratados })
    .from(prefeituras)
    .where(opcoes.soPrefeitura ? eq(prefeituras.id, opcoes.soPrefeitura) : notInArray(prefeituras.id, PREFEITURAS_INTERNAS));
  const clientes = todas.filter((p) => planosContratadosDe(p.planos).length > 0);

  for (const p of clientes) {
    try {
      // Rodar duas vezes na mesma segunda não manda dois e-mails.
      const id = idDaSegunda(p.id, hoje);
      const ja = await db
        .select({ id: pedidoEventos.id })
        .from(pedidoEventos)
        .where(and(eq(pedidoEventos.pedidoId, id), eq(pedidoEventos.tipo, EVENTO_SEGUNDA)))
        .limit(1);
      if (ja.length) {
        r.jaEnviadas++;
        continue;
      }

      const dados = await dadosDaSemana(p, hoje);
      const pessoas = await db
        .select({ email: usuarios.email, cargo: usuarios.cargo, secretaria: usuarios.secretaria })
        .from(usuarios)
        .where(
          and(
            eq(usuarios.prefeituraId, p.id),
            isNotNull(usuarios.email),
            or(eq(usuarios.cargo, "prefeito"), eq(usuarios.cargo, "admin"), eq(usuarios.cargo, "secretario"))
          )
        );
      const planos = planosContratadosDe(p.planos);
      const enviados: string[] = [];
      const jaRecebeu = new Set<string>();
      for (const pessoa of pessoas) {
        if (!pessoa.email || jaRecebeu.has(pessoa.email)) continue;
        let msg: ReturnType<typeof emailDaSegunda>;
        if (pessoa.cargo === "secretario") {
          const area = (AREAS as readonly string[]).includes(pessoa.secretaria ?? "") ? (pessoa.secretaria as Area) : null;
          if (!area || !planos.includes(area)) continue;
          msg = emailDaSegunda(dados, hoje, "secretario", area);
        } else {
          msg = emailDaSegunda(dados, hoje, pessoa.cargo === "prefeito" ? "prefeito" : "admin");
        }
        if (!msg) continue;
        jaRecebeu.add(pessoa.email);
        const envio = await enviarEmail({ para: pessoa.email, assunto: msg.assunto, html: msg.html });
        if (envio.enviado) enviados.push(pessoa.email);
      }

      await db.insert(pedidoEventos).values({
        id: gerarId("pev"),
        pedidoId: id,
        tipo: EVENTO_SEGUNDA,
        descricao: JSON.stringify({ prefeituraId: p.id, para: enviados, abertos: dados.abertos.length, vencimentos: dados.vencimentos.length, resolvidos: dados.resolvidos.length }),
        autor: "segunda do prefeito",
      });
      r.prefeituras++;
      r.emails += enviados.length;
    } catch (e) {
      r.erros.push(`${p.municipio}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return r;
}
