"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { faturas, pedidosProposta } from "@/db/schema";
import { emailDaEquipe } from "@/lib/equipe";
import { enviarEmail } from "@/lib/email";
import { PROXIMO_STATUS, STATUS_PEDIDO, type StatusPedido } from "@/lib/pedidos";
import { formatarMoeda } from "@/lib/formatadores";
import { dataCurta, hojeEmBrasilia, rotuloCompetencia } from "@/lib/cobranca";
import { confirmarPagamento, criarPrimeiraFatura, emailFatura, registrarPasso, rodarCobranca } from "@/lib/cobranca-servidor";

// ── QUEM AVANÇA O PEDIDO É A EQUIPE ──
// Cada ação confere de novo que quem chama é admin (ADMIN_EMAILS). A tela
// esconde os botões, mas a ação é o que protege.

export type ResultadoAdmin = { ok: true; aviso?: string } | { ok: false; erro: string };


async function autorAdmin(): Promise<string | null> {
  return emailDaEquipe();
}

function revalidar() {
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/financeiro");
  revalidatePath("/dashboard", "layout");
}

/**
 * Os passos de um clique: recebido → proposta_enviada → em_contratacao.
 * Contrato e pagamento têm ação própria, porque pedem dados.
 */
export async function avancarPedido(pedidoId: string): Promise<ResultadoAdmin> {
  const autor = await autorAdmin();
  if (!autor) return { ok: false, erro: "Sem permissão." };
  const [pedido] = await db.select().from(pedidosProposta).where(eq(pedidosProposta.id, pedidoId)).limit(1);
  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };
  const proximo = PROXIMO_STATUS[pedido.status as StatusPedido];
  if (!proximo) return { ok: false, erro: "Este passo pede uma ação própria (contrato ou pagamento)." };
  await db.update(pedidosProposta).set({ status: proximo }).where(eq(pedidosProposta.id, pedidoId));
  await registrarPasso(pedidoId, proximo, `Etapa: ${STATUS_PEDIDO[proximo].rotulo}`, autor);
  revalidar();
  return { ok: true };
}

/**
 * Contrato assinado e empenho emitido: grava os números, fixa o valor e o
 * dia de vencimento, e emite a primeira fatura. Os módulos NÃO ligam aqui:
 * ligam quando o pagamento dela for confirmado (confirmarPagamentoAction).
 */
export async function registrarContrato(pedidoId: string, formData: FormData): Promise<ResultadoAdmin> {
  const autor = await autorAdmin();
  if (!autor) return { ok: false, erro: "Sem permissão." };
  const [pedido] = await db.select().from(pedidosProposta).where(eq(pedidosProposta.id, pedidoId)).limit(1);
  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };
  if (pedido.status === "contratado" || pedido.status === "ativo") return { ok: false, erro: "Este pedido já tem contrato." };
  if (pedido.status === "perdido") return { ok: false, erro: "Pedido encerrado. Reabra antes." };

  const numeroContrato = String(formData.get("numeroContrato") ?? "").trim();
  const numeroEmpenho = String(formData.get("numeroEmpenho") ?? "").trim();
  const valor = Number(String(formData.get("valor") ?? "").replace(/\./g, "").replace(",", "."));
  const dia = Number(formData.get("diaVencimento") ?? 10);
  if (!numeroContrato || !numeroEmpenho) return { ok: false, erro: "Informe o número do contrato e o da nota de empenho." };
  if (!Number.isFinite(valor) || valor <= 0) return { ok: false, erro: "Informe o valor mensal do contrato." };
  if (!Number.isInteger(dia) || dia < 1 || dia > 28) return { ok: false, erro: "Dia de vencimento entre 1 e 28." };

  await db
    .update(pedidosProposta)
    .set({
      status: "contratado",
      contratadoEm: new Date().toISOString(),
      numeroContrato,
      numeroEmpenho,
      valorContratado: valor,
      diaVencimento: dia,
    })
    .where(eq(pedidosProposta.id, pedidoId));
  const fat = await criarPrimeiraFatura(pedidoId, valor);
  await registrarPasso(pedidoId, "contratado", `Contrato ${numeroContrato}, empenho ${numeroEmpenho}, ${formatarMoeda(valor)}/mês, vencimento dia ${dia}`, autor);
  await registrarPasso(pedidoId, "fatura", `Primeira fatura emitida, vence em ${dataCurta(fat.vencimento)}`, autor);

  const [f] = await db.select().from(faturas).where(eq(faturas.id, fat.id)).limit(1);
  const [p2] = await db.select().from(pedidosProposta).where(eq(pedidosProposta.id, pedidoId)).limit(1);
  const envio = await enviarEmail(emailFatura(p2, f, "primeira fatura"));
  revalidar();
  return envio.enviado
    ? { ok: true }
    : { ok: true, aviso: `Contrato registrado e fatura emitida. O e-mail da fatura NÃO saiu (${envio.detalhe ?? envio.motivo}): mande por outro canal.` };
}

export async function marcarPerdido(pedidoId: string, motivo: string): Promise<ResultadoAdmin> {
  const autor = await autorAdmin();
  if (!autor) return { ok: false, erro: "Sem permissão." };
  const texto = motivo.trim();
  if (texto.length < 3) return { ok: false, erro: "Anote o motivo: é ele que ensina a próxima venda." };
  const [pedido] = await db.select({ status: pedidosProposta.status }).from(pedidosProposta).where(eq(pedidosProposta.id, pedidoId)).limit(1);
  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };
  if (pedido.status === "ativo") return { ok: false, erro: "Contrato ativo não se encerra por aqui." };
  await db.update(pedidosProposta).set({ status: "perdido", motivoPerda: texto }).where(eq(pedidosProposta.id, pedidoId));
  await db
    .update(faturas)
    .set({ status: "cancelada", observacao: "pedido encerrado sem contrato" })
    .where(and(eq(faturas.pedidoId, pedidoId), eq(faturas.status, "aberta")));
  await registrarPasso(pedidoId, "perdido", `Encerrado: ${texto}`, autor);
  revalidar();
  return { ok: true };
}

export async function confirmarPagamentoAction(faturaId: string, formData: FormData): Promise<ResultadoAdmin> {
  const autor = await autorAdmin();
  if (!autor) return { ok: false, erro: "Sem permissão." };
  const pagaEm = String(formData.get("pagaEm") ?? "").trim() || hojeEmBrasilia();
  const forma = String(formData.get("forma") ?? "").trim();
  if (!forma) return { ok: false, erro: "Informe a forma de pagamento (ordem bancária, PIX, boleto)." };
  const r = await confirmarPagamento(faturaId, { pagaEm, forma, notaFiscal: String(formData.get("notaFiscal") ?? "").trim(), autor });
  revalidar();
  if (!r.ok) return r;
  const msg = r.ativou.length > 0 ? `Pago. Módulos ativados: ${r.ativou.join(", ")}.` : "Pago. Se a conta estava suspensa, já voltou.";
  return { ok: true, aviso: r.aviso ? `${msg} ${r.aviso}` : msg };
}

export async function cancelarFatura(faturaId: string, motivo: string): Promise<ResultadoAdmin> {
  const autor = await autorAdmin();
  if (!autor) return { ok: false, erro: "Sem permissão." };
  const [f] = await db.select().from(faturas).where(eq(faturas.id, faturaId)).limit(1);
  if (!f) return { ok: false, erro: "Fatura não encontrada." };
  if (f.status !== "aberta") return { ok: false, erro: "Só fatura em aberto pode ser cancelada." };
  if (motivo.trim().length < 3) return { ok: false, erro: "Anote o motivo do cancelamento." };
  await db.update(faturas).set({ status: "cancelada", observacao: motivo.trim() }).where(eq(faturas.id, faturaId));
  await registrarPasso(f.pedidoId, "fatura_cancelada", `Fatura de ${rotuloCompetencia(f.competencia)} cancelada: ${motivo.trim()}`, autor);
  revalidar();
  return { ok: true };
}

export async function gerarCobrancasAgora(): Promise<ResultadoAdmin> {
  const autor = await autorAdmin();
  if (!autor) return { ok: false, erro: "Sem permissão." };
  const r = await rodarCobranca();
  revalidar();
  return {
    ok: true,
    aviso: `${r.emitidas} fatura(s) emitida(s), ${r.avisos} aviso(s) enviado(s).${r.erros.length ? ` Erros: ${r.erros.join("; ")}` : ""}`,
  };
}
