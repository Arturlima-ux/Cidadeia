import { createHmac, timingSafeEqual } from "node:crypto";
import type { SituacaoFiscal } from "@/lib/vigia-fiscal";

// ── "AVISE-ME SOBRE A MINHA CIDADE", DE GRAÇA ──
//
// O secretário que abriu o Raio-X hoje só volta ao site se alguém o chamar.
// Aqui ele deixa o e-mail e passa a receber, sem pagar nada, três tipos de
// aviso sobre o município dele, tirados do extrato de entregas do Tesouro:
//
//   - o RREO ou o RGF vence em até 7 dias e ainda não consta entregue;
//   - venceu e não consta entregue;
//   - foi entregue (e o número novo está no Raio-X).
//
// É a amostra grátis do módulo Gestão, que faz isso e muito mais todo dia:
// cada aviso termina com o convite. E é o que mantém a conversa viva entre a
// primeira visita e a compra, que em prefeitura leva meses.
//
// ── ONDE FICA, SEM MUDAR O BANCO ──
// A inscrição é um interessado (tabela leads) com origem "aviso". O que já
// foi avisado, e o cancelamento, vão para a linha do tempo dele
// (pedido_eventos), como o resto do atendimento (lib/oportunidades.ts).
// Este arquivo é a parte pura: o que avisar, e o texto. A rotina está em
// aviso-da-cidade-servidor.ts.

export const ORIGEM_AVISO = "aviso";
export const EVENTO_AVISO_ENVIADO = "aviso_enviado";
export const EVENTO_AVISO_CANCELADO = "aviso_cancelado";
/** Só avisa do prazo quando faltam até estes dias. */
export const DIAS_DE_ANTECEDENCIA = 7;

export type FatoDaCidade = {
  /** Estável entre execuções: é o que impede avisar duas vezes. */
  chave: string;
  tipo: "vence" | "vencida" | "entregue";
  texto: string;
};

const dataBr = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};

/** O que vale avisar hoje sobre a cidade, a partir da conferência do Tesouro. */
export function fatosDaCidade(s: SituacaoFiscal, municipio: string): FatoDaCidade[] {
  const fatos: FatoDaCidade[] = [];
  const ultimaEntrega = new Map<string, (typeof s.avaliadas)[number]>();

  for (const o of s.avaliadas) {
    const obr = o.obrigacao.chave;
    if (obr !== "rreo" && obr !== "rgf") continue;
    const id = `${obr}:${o.numero}`;
    // Sem resposta do Tesouro sobre o período, não se afirma nada sobre ele.
    if (s.inconclusivos.includes(id)) continue;
    const nome = `${o.obrigacao.sigla} do ${o.rotulo}`;
    const base = `${s.exercicio}:${id}`;

    if (o.situacao === "vence_breve" && o.diasRestantes <= DIAS_DE_ANTECEDENCIA) {
      const quando = o.diasRestantes === 0 ? "hoje" : o.diasRestantes === 1 ? "amanhã" : `em ${o.diasRestantes} dias`;
      fatos.push({
        chave: `${base}:vence`,
        tipo: "vence",
        texto: `O ${nome} de ${municipio} vence ${quando} (${dataBr(o.vencimento)}) e ainda não consta entregue no Tesouro Nacional.`,
      });
    } else if (o.situacao === "vencida") {
      fatos.push({
        chave: `${base}:vencida`,
        tipo: "vencida",
        texto: `O prazo do ${nome} de ${municipio} terminou em ${dataBr(o.vencimento)} e a entrega ainda não consta no Tesouro Nacional. Enquanto não regularizar, o município fica impedido de receber transferências voluntárias e de contratar operações de crédito (LRF, art. 52, § 2º, e art. 55, § 3º).`,
      });
    } else if (o.situacao === "entregue") {
      const anterior = ultimaEntrega.get(obr);
      if (!anterior || o.fimDoPeriodo > anterior.fimDoPeriodo) ultimaEntrega.set(obr, o);
    }
  }

  // Da entrega, só a mais recente de cada relatório: é a novidade.
  for (const o of ultimaEntrega.values()) {
    fatos.push({
      chave: `${s.exercicio}:${o.obrigacao.chave}:${o.numero}:entregue`,
      tipo: "entregue",
      texto:
        o.obrigacao.chave === "rgf"
          ? `O RGF do ${o.rotulo} de ${municipio} consta entregue no Tesouro Nacional. A despesa com pessoal declarada nele já está no Raio-X.`
          : `O RREO do ${o.rotulo} de ${municipio} consta entregue no Tesouro Nacional. Receita e aplicação em saúde e educação estão no Raio-X.`,
    });
  }

  const ordem = { vencida: 0, vence: 1, entregue: 2 } as const;
  return fatos.sort((a, b) => ordem[a.tipo] - ordem[b.tipo]);
}

/** O que ainda não foi mandado a este inscrito. */
export function fatosNovos(fatos: FatoDaCidade[], jaEnviados: Set<string>): FatoDaCidade[] {
  return fatos.filter((f) => !jaEnviados.has(f.chave));
}

// ── a chave do "parar de receber" ──
// O id do inscrito, assinado: ninguém cancela o aviso de outra pessoa
// trocando um número no endereço.

function assinatura(leadId: string, segredo: string): string {
  return createHmac("sha256", segredo).update(`aviso:${leadId}`).digest("base64url").slice(0, 22);
}

export function chaveDoAviso(leadId: string, segredo = process.env.AUTH_SECRET?.trim() || null): string | null {
  return segredo ? `${leadId}.${assinatura(leadId, segredo)}` : null;
}

export function inscritoDaChave(valor: string, segredo = process.env.AUTH_SECRET?.trim() || null): string | null {
  if (!segredo) return null;
  const m = /^(lead_[A-Za-z0-9_-]{4,64})\.([A-Za-z0-9_-]{22})$/.exec(valor);
  if (!m) return null;
  const a = Buffer.from(assinatura(m[1], segredo));
  const b = Buffer.from(m[2]);
  return a.length === b.length && timingSafeEqual(a, b) ? m[1] : null;
}

// ── o e-mail ──

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

export function emailDoAviso(dados: {
  nome: string;
  municipio: string;
  uf: string;
  fatos: FatoDaCidade[];
  /** Primeiro envio: o retrato de hoje, e não "novidade". */
  primeiro: boolean;
  linkRaioX: string;
  linkProposta: string;
  linkCancelar: string | null;
}): { assunto: string; html: string } {
  const cidade = `${dados.municipio}/${dados.uf}`;
  const urgente = dados.fatos.find((f) => f.tipo === "vencida") ?? dados.fatos.find((f) => f.tipo === "vence");
  const assunto = dados.primeiro
    ? `${cidade}: como estão os relatórios fiscais hoje`
    : urgente
      ? urgente.tipo === "vencida"
        ? `${cidade}: relatório fiscal com prazo vencido`
        : `${cidade}: relatório fiscal vence nos próximos dias`
      : `${cidade}: relatório fiscal novo no Tesouro`;
  const primeiroNome = esc(dados.nome.split(" ")[0] ?? dados.nome);
  const itens = dados.fatos.length
    ? `<ul>${dados.fatos.map((f) => `<li>${esc(f.texto)}</li>`).join("")}</ul>`
    : `<p>Nenhum prazo vencendo nos próximos ${DIAS_DE_ANTECEDENCIA} dias e nada em atraso no Tesouro Nacional.</p>`;
  const html = [
    `<p>Olá, ${primeiroNome}.</p>`,
    dados.primeiro
      ? `<p>Este é o primeiro aviso sobre ${esc(cidade)}. Daqui para a frente, você recebe um e-mail quando um relatório fiscal estiver para vencer, vencer sem entrega ou for entregue.</p>`
      : `<p>Novidade no Tesouro Nacional sobre ${esc(cidade)}:</p>`,
    itens,
    `<p><a href="${dados.linkRaioX}">Ver o Raio-X de ${esc(dados.municipio)}</a></p>`,
    `<hr/>`,
    `<p>Este aviso é a parte gratuita. Com o módulo Gestão, o CidadeIA confere tudo isso todo dia, avisa o prefeito 15 dias antes de cada prazo, acompanha a despesa com pessoal na régua da LRF e os mínimos de saúde e educação. <a href="${dados.linkProposta}">Receber a proposta para ${esc(dados.municipio)}</a>.</p>`,
    `<p style="color:#888;font-size:13px">Fonte: extrato de entregas do Tesouro Nacional (Siconfi). ${
      dados.linkCancelar ? `<a href="${dados.linkCancelar}" style="color:#888">Parar de receber estes avisos</a>.` : ""
    }</p>`,
  ].join("\n");
  return { assunto, html };
}
