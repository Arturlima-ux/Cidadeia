import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { faturas, pedidoEventos, pedidosProposta, prefeituras, auditoria } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { enviarEmail } from "@/lib/email";
import { formatarMoeda } from "@/lib/formatadores";
import { NOME_PLANO_ADDON } from "@/lib/planos";
import { ativarModulos, modulosDoPedido } from "@/lib/pedidos";
import {
  competenciaDe,
  competenciaQueFalta,
  dataCurta,
  diasEntre,
  hojeEmBrasilia,
  rotuloCompetencia,
  situacaoDaConta,
  vencimentoDaCompetencia,
  vencimentoDaPrimeira,
  type FaturaResumo,
  type SituacaoFinanceira,
} from "@/lib/cobranca";

// ── O LADO DO BANCO DA REGRA DE COBRANÇA ──
//
// lib/cobranca.ts decide; este arquivo lê e grava. Fica separado para a regra
// continuar testável sem banco, e para que toda gravação que muda dinheiro ou
// acesso passe por um lugar só, deixando rastro na linha do tempo do pedido.

const BASE = () => process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://cidadeia.vercel.app";

/** Instruções de pagamento que vão no e-mail e no painel. Configuradas na Vercel. */
export function instrucoesDePagamento(): string | null {
  const t = process.env.PAGAMENTO_INSTRUCOES?.trim();
  return t ? t : null;
}

export function protocolo(pedidoId: string): string {
  return pedidoId.slice(-8).toUpperCase();
}

// ── linha do tempo ──

export async function registrarPasso(pedidoId: string, tipo: string, descricao: string, autor: string): Promise<void> {
  try {
    await db.insert(pedidoEventos).values({ id: gerarId("pev"), pedidoId, tipo, descricao, autor });
  } catch (e) {
    // A linha do tempo é registro, não condição: falhar aqui não pode desfazer
    // um pagamento confirmado.
    console.error("[pedido] passo não registrado:", e);
  }
}

// ── leitura ──

function resumo(f: typeof faturas.$inferSelect): FaturaResumo {
  return {
    id: f.id,
    competencia: f.competencia,
    vencimento: f.vencimento,
    status: f.status as FaturaResumo["status"],
    valor: f.valor,
  };
}

/** Faturas da prefeitura, agrupadas por contrato (pedido). */
export async function faturasDaPrefeitura(prefeituraId: string) {
  const pedidos = await db
    .select({ id: pedidosProposta.id, modulos: pedidosProposta.modulos, status: pedidosProposta.status })
    .from(pedidosProposta)
    .where(eq(pedidosProposta.prefeituraId, prefeituraId));
  if (pedidos.length === 0) return { pedidos, linhas: [] as (typeof faturas.$inferSelect)[] };
  const linhas = await db
    .select()
    .from(faturas)
    .where(inArray(faturas.pedidoId, pedidos.map((p) => p.id)))
    .orderBy(asc(faturas.vencimento));
  return { pedidos, linhas };
}

export async function situacaoDaPrefeitura(prefeituraId: string, hoje = hojeEmBrasilia()): Promise<SituacaoFinanceira> {
  try {
    const { pedidos, linhas } = await faturasDaPrefeitura(prefeituraId);
    const porPedido = pedidos.map((p) => linhas.filter((l) => l.pedidoId === p.id).map(resumo));
    return situacaoDaConta(porPedido, hoje);
  } catch (e) {
    // Se a leitura falhar, não trava ninguém por defeito nosso.
    console.error("[cobranca] situação não lida:", e);
    return { tipo: "sem_cobranca" };
  }
}

// ── contrato: sai a primeira fatura ──

export async function criarPrimeiraFatura(pedidoId: string, valor: number, hoje = hojeEmBrasilia()) {
  const id = gerarId("fat");
  const vencimento = vencimentoDaPrimeira(hoje);
  await db.insert(faturas).values({ id, pedidoId, competencia: competenciaDe(hoje), valor, vencimento });
  return { id, vencimento, competencia: competenciaDe(hoje) };
}

// ── pagamento: o que liga os módulos ──

export type ResultadoPagamento = { ok: true; ativou: string[]; aviso?: string } | { ok: false; erro: string };

export async function confirmarPagamento(
  faturaId: string,
  dados: { pagaEm: string; forma: string; notaFiscal?: string | null; autor: string }
): Promise<ResultadoPagamento> {
  const [fat] = await db.select().from(faturas).where(eq(faturas.id, faturaId)).limit(1);
  if (!fat) return { ok: false, erro: "Fatura não encontrada." };
  if (fat.status === "paga") return { ok: false, erro: "Esta fatura já está paga." };
  if (fat.status === "cancelada") return { ok: false, erro: "Esta fatura foi cancelada." };

  const [pedido] = await db.select().from(pedidosProposta).where(eq(pedidosProposta.id, fat.pedidoId)).limit(1);
  if (!pedido) return { ok: false, erro: "O pedido desta fatura não existe mais." };

  // Primeiro pagamento sem conta não tem onde ligar módulo. Melhor recusar do
  // que marcar "paga" e deixar o cliente pagando por nada.
  const primeiro = pedido.status === "contratado";
  if (primeiro && !pedido.prefeituraId) {
    return {
      ok: false,
      erro: "O pedido ainda não tem conta. Mande o link de cadastro ao cliente e confirme o pagamento depois.",
    };
  }

  await db
    .update(faturas)
    .set({ status: "paga", pagaEm: dados.pagaEm, formaPagamento: dados.forma, notaFiscal: dados.notaFiscal || null })
    .where(eq(faturas.id, faturaId));
  await registrarPasso(
    pedido.id,
    "pagamento",
    `Pagamento de ${rotuloCompetencia(fat.competencia)} confirmado (${formatarMoeda(fat.valor)}, ${dados.forma}, em ${dataCurta(dados.pagaEm)})`,
    dados.autor
  );

  if (!primeiro) return { ok: true, ativou: [] };

  const [pref] = await db
    .select({ id: prefeituras.id, nome: prefeituras.nome, planosContratados: prefeituras.planosContratados })
    .from(prefeituras)
    .where(eq(prefeituras.id, pedido.prefeituraId!))
    .limit(1);
  if (!pref) return { ok: false, erro: "A conta vinculada ao pedido não existe mais." };

  const modulos = modulosDoPedido(pedido.modulos);
  const nomes = modulos.map((m) => NOME_PLANO_ADDON[m]);
  const agora = new Date().toISOString();
  await db
    .update(prefeituras)
    .set({ planosContratados: ativarModulos(pref.planosContratados, modulos) })
    .where(eq(prefeituras.id, pref.id));
  await db.update(pedidosProposta).set({ status: "ativo", ativadoEm: agora }).where(eq(pedidosProposta.id, pedido.id));
  await registrarPasso(pedido.id, "ativacao", `Módulos ativados: ${nomes.join(", ")}`, dados.autor);

  // Na trilha da prefeitura: o controle interno dela precisa ver quando e
  // quais módulos ligaram, e por quê.
  try {
    await db.insert(auditoria).values({
      id: gerarId("aud"),
      prefeituraId: pref.id,
      usuarioId: "equipe",
      usuarioNome: "Equipe CidadeIA",
      usuarioCargo: "admin",
      acao: "ativar",
      entidade: "modulo",
      entidadeId: pedido.id,
      resumo: `módulos ativados após o pagamento da primeira fatura: ${nomes.join(", ")}`,
    });
  } catch (e) {
    console.error("[auditoria] ativação não registrada:", e);
  }

  const envio = await enviarEmail({
    para: pedido.email,
    assunto: `CidadeIA: pagamento confirmado, módulos ativos para ${pedido.municipio}/${pedido.uf}`,
    html: [
      `<p>Olá, ${pedido.nome}.</p>`,
      `<p>Recebemos o pagamento de ${rotuloCompetencia(fat.competencia)}. Os módulos <strong>${nomes.join(", ")}</strong> estão ativos na conta da ${pref.nome}.</p>`,
      `<p>Entre em <a href="${BASE()}/login">${BASE()}/login</a>. A Implantação, no painel, mostra o que cadastrar primeiro.</p>`,
      `<p>As próximas mensalidades vencem todo dia ${pedido.diaVencimento}. A fatura chega por e-mail e fica em Financeiro, no painel.</p>`,
      `<p style="color:#888">Protocolo ${protocolo(pedido.id)}.</p>`,
    ].join("\n"),
  });

  return envio.enviado
    ? { ok: true, ativou: nomes }
    : { ok: true, ativou: nomes, aviso: `O e-mail de confirmação não saiu (${envio.detalhe ?? envio.motivo}). Avise o cliente por outro canal.` };
}

// ── a rotina diária ──
//
// Roda pela Vercel (vercel.json, /api/cron/cobranca) e também pelo botão da
// mesa financeira. Faz duas coisas, e as duas são idempotentes:
// 1. emite a fatura do mês para cada contrato ativo que ainda não a tem;
// 2. avisa por e-mail a fatura que vence em 3 dias, a que venceu e a que
//    travou a conta, uma vez por situação.

export type RelatorioCobranca = { emitidas: number; avisos: number; erros: string[] };

function emailFatura(pedido: typeof pedidosProposta.$inferSelect, f: typeof faturas.$inferSelect, motivo: string) {
  const instrucoes = instrucoesDePagamento();
  return {
    para: pedido.email,
    assunto: `CidadeIA: ${motivo}, ${rotuloCompetencia(f.competencia)}, ${pedido.municipio}/${pedido.uf}`,
    html: [
      `<p>Olá, ${pedido.nome}.</p>`,
      `<p>Fatura de <strong>${rotuloCompetencia(f.competencia)}</strong>: ${formatarMoeda(f.valor)}, vencimento em ${dataCurta(f.vencimento)}.</p>`,
      `<p>${motivo === "fatura em atraso" ? "Sem o pagamento, o acesso ao painel é suspenso ao fim da carência prevista em contrato." : motivo === "acesso suspenso" ? "O acesso ao painel está suspenso até a confirmação do pagamento. A exportação dos dados continua disponível." : "Pagamento antecipado, conforme o contrato."}</p>`,
      instrucoes ? `<p><strong>Como pagar</strong><br>${instrucoes.replace(/\n/g, "<br>")}</p>` : "",
      `<p>Depois de pagar, responda este e-mail com o comprovante. Os detalhes ficam em Financeiro, no painel: <a href="${BASE()}/dashboard/financeiro">${BASE()}/dashboard/financeiro</a>.</p>`,
      `<p style="color:#888">Protocolo ${protocolo(pedido.id)}.</p>`,
    ].join("\n"),
  };
}

export async function rodarCobranca(hoje = hojeEmBrasilia()): Promise<RelatorioCobranca> {
  const rel: RelatorioCobranca = { emitidas: 0, avisos: 0, erros: [] };

  // 1. Mensalidades dos contratos ativos.
  const ativos = await db.select().from(pedidosProposta).where(eq(pedidosProposta.status, "ativo"));
  for (const p of ativos) {
    try {
      const dele = await db.select().from(faturas).where(eq(faturas.pedidoId, p.id));
      const falta = competenciaQueFalta(dele.map(resumo), hoje);
      const valor = p.valorContratado ?? p.mensal;
      if (!falta || valor == null) continue;
      await db.insert(faturas).values({
        id: gerarId("fat"),
        pedidoId: p.id,
        competencia: falta,
        valor,
        vencimento: vencimentoDaCompetencia(falta, p.diaVencimento),
      });
      await registrarPasso(p.id, "fatura", `Fatura de ${rotuloCompetencia(falta)} emitida (${formatarMoeda(valor)})`, "rotina diária");
      rel.emitidas++;
    } catch (e) {
      rel.erros.push(`${p.municipio}/${p.uf}: ${(e as Error).message}`);
    }
  }

  // 2. Avisos, uma vez por situação de cada fatura aberta.
  const abertas = await db
    .select({ f: faturas, p: pedidosProposta })
    .from(faturas)
    .innerJoin(pedidosProposta, eq(faturas.pedidoId, pedidosProposta.id))
    .where(and(eq(faturas.status, "aberta")));
  for (const { f, p } of abertas) {
    const dias = diasEntre(hoje, f.vencimento);
    const etapa = dias >= 0 && dias <= 3 ? "vence" : dias < 0 && -dias <= 5 ? "atraso" : dias < -5 && p.status === "ativo" ? "suspenso" : null;
    if (!etapa || f.avisoEnviado?.startsWith(etapa)) continue;
    const motivo = etapa === "vence" ? "fatura a vencer" : etapa === "atraso" ? "fatura em atraso" : "acesso suspenso";
    const envio = await enviarEmail(emailFatura(p, f, motivo));
    if (envio.enviado) {
      await db.update(faturas).set({ avisoEnviado: `${etapa}:${hoje}` }).where(eq(faturas.id, f.id));
      rel.avisos++;
    } else {
      rel.erros.push(`aviso de ${p.municipio}/${p.uf}: ${envio.detalhe ?? envio.motivo}`);
    }
  }

  return rel;
}

export { emailFatura };
