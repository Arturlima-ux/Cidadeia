"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { faturas, pedidosProposta } from "@/db/schema";
import { emailDaEquipe } from "@/lib/equipe";
import { h, montarEmail, saudacao } from "@/lib/email-modelo";
import { enviarEmail } from "@/lib/email";
import { PROXIMO_STATUS, STATUS_PEDIDO, type StatusPedido } from "@/lib/pedidos";
import { formatarMoeda } from "@/lib/formatadores";
import { dataCurta, hojeEmBrasilia, rotuloCompetencia, type Modalidade } from "@/lib/cobranca";
import { ativarPedido, confirmarPagamento, criarPrimeiraFatura, emailFatura, protocolo, registrarPasso, rodarCobranca } from "@/lib/cobranca-servidor";
import { renderToBuffer } from "@react-pdf/renderer";
import { empresaDoAmbiente, montarPropostaComercial } from "@/lib/proposta-comercial";
import { PropostaComercialPDF } from "@/lib/relatorios/PropostaComercial";
import { CONTATO_PUBLICO } from "@/lib/contato-comercial";
import { linkRastreavel } from "@/lib/abertura-da-proposta";

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
  // Pós-pago é o padrão (Lei 4.320, art. 62); antecipado só quando a
  // prefeitura escolheu e justificou no processo (Lei 14.133, art. 145, § 1º).
  const modalidade: Modalidade = formData.get("modalidade") === "antecipado" ? "antecipado" : "pos_pago";
  if (modalidade === "pos_pago" && !pedido.prefeituraId) {
    return { ok: false, erro: "No pós-pago os módulos ligam no registro do contrato, e o pedido ainda não tem conta. Mande o link de cadastro ao cliente antes." };
  }
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
  await registrarPasso(pedidoId, "contratado", `Contrato ${numeroContrato}, empenho ${numeroEmpenho}, ${formatarMoeda(valor)}/mês`, autor);
  await registrarPasso(pedidoId, "modalidade", modalidade === "pos_pago" ? "Pagamento pós-pago, após o atesto mensal" : `Pagamento antecipado, vencimento dia ${dia}`, autor);

  if (modalidade === "pos_pago") {
    const [contratado] = await db.select().from(pedidosProposta).where(eq(pedidosProposta.id, pedidoId)).limit(1);
    const r = await ativarPedido(contratado, autor, null);
    revalidar();
    if (!r.ok) return r;
    return r.aviso ? { ok: true, aviso: `Contrato registrado e módulos ativos. ${r.aviso}` } : { ok: true };
  }

  const fat = await criarPrimeiraFatura(pedidoId, valor);
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

// ── A PROPOSTA EM UM CLIQUE ──
//
// O site promete proposta em um dia útil. Antes, a equipe baixava o PDF,
// abria o próprio e-mail, anexava, escrevia e voltava para marcar a etapa.
// Agora é um botão: gera o PDF, manda ao interessado com o kit de
// contratação, e só avança a etapa se o e-mail saiu. A resposta do cliente
// volta para a equipe (reply-to). Os lembretes seguintes saem sozinhos
// (lib/rotina-comercial.ts).


export async function enviarPropostaAoCliente(pedidoId: string): Promise<ResultadoAdmin> {
  const autor = await autorAdmin();
  if (!autor) return { ok: false, erro: "Sem permissão." };
  const [pedido] = await db.select().from(pedidosProposta).where(eq(pedidosProposta.id, pedidoId)).limit(1);
  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };
  if (pedido.status !== "recebido" && pedido.status !== "proposta_enviada") {
    return { ok: false, erro: "Este pedido já passou da etapa de proposta." };
  }

  const proposta = montarPropostaComercial(pedido, empresaDoAmbiente());
  const pdf = await renderToBuffer(PropostaComercialPDF({ p: proposta }));
  const arquivo = `proposta-cidadeia-${pedido.municipio
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .toLowerCase()}-${proposta.numero}.pdf`;
  const base = process.env.APP_URL ?? "https://cidadeia.vercel.app";

  const envio = await enviarEmail({
    guardarNaCaixaDeSaida: true,
    para: pedido.email,
    responderPara: CONTATO_PUBLICO,
    assunto: `Proposta do CidadeIA para ${pedido.municipio}/${pedido.uf}`,
    anexos: [{ nome: arquivo, conteudo: new Uint8Array(pdf) }],
    pedidoId: pedido.id,
    html: montarEmail({
      remetente: { tipo: "cidadeia" },
      previa: `A proposta ${proposta.numero} segue em anexo, com o kit de contratação pronto para o jurídico.`,
      etiqueta: { texto: `Proposta ${proposta.numero}` },
      titulo: `Proposta do CidadeIA para ${pedido.municipio}`,
      saudacao: saudacao(pedido.nome),
      blocos: [
        { p: `Obrigado pelo interesse. Segue em anexo a proposta do CidadeIA para a Prefeitura de ${pedido.municipio}/${pedido.uf}. Se preferir, ela também abre direto no navegador, sem baixar.` },
        { botao: "Abrir a proposta", link: linkRastreavel(base, pedido.id, "proposta", protocolo(pedido.id)), depois: { texto: "Abrir o kit de contratação", link: linkRastreavel(base, pedido.id, "kit", protocolo(pedido.id)) } },
        { secao: "O processo de contratação já vai pronto" },
        { p: "Para o setor de compras e o jurídico revisarem, o kit traz:" },
        {
          lista: [
            "termo de referência e estudo técnico preliminar;",
            "justificativa da contratação direta e da escolha do fornecedor;",
            "minuta do contrato, acordo de tratamento de dados e nível de serviço.",
          ],
        },
        { p: "Se surgir qualquer dúvida, é só responder este e-mail. Se preferir conversar, mande um telefone e o melhor horário que a gente liga." },
        {
          dados: [
            ["Protocolo", protocolo(pedido.id)],
            ["Acompanhar", h`<a href="${linkRastreavel(base, pedido.id, "acompanhar", protocolo(pedido.id))}">ver o andamento do pedido</a>`],
          ],
        },
      ],
      motivo: `Você recebe este e-mail porque pediu uma proposta do CidadeIA para ${pedido.municipio}/${pedido.uf}.`,
    }),
  });
  if (!envio.enviado) {
    return {
      ok: false,
      erro:
        envio.causa === "nao-configurado"
          ? "O envio de e-mail não está configurado. Baixe o PDF e mande pelo seu e-mail."
          : `O e-mail não saiu (${envio.detalhe ?? envio.motivo}). Ele ficou na caixa de saída (/admin/saida), com o texto pronto e o PDF para baixar e mandar pelo seu e-mail.`,
    };
  }

  if (pedido.status === "recebido") {
    await db.update(pedidosProposta).set({ status: "proposta_enviada" }).where(eq(pedidosProposta.id, pedidoId));
    await registrarPasso(pedidoId, "proposta_enviada", `Proposta ${proposta.numero} enviada por e-mail a ${pedido.email}, com o kit`, autor);
  } else {
    await registrarPasso(pedidoId, "proposta_reenviada", `Proposta ${proposta.numero} reenviada por e-mail a ${pedido.email}`, autor);
  }
  revalidar();
  return { ok: true, aviso: `Proposta enviada a ${pedido.email}. Os lembretes saem sozinhos no 3º e no 8º dia útil.` };
}
