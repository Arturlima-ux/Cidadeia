import type { PlanoAddon } from "@/lib/planos";
import { PLANOS_ADDON, planosContratadosDe } from "@/lib/planos";

// ── O CAMINHO DE UM PEDIDO, DO CLIQUE AO DINHEIRO ──
//
// Na ordem em que acontece numa prefeitura:
//
//   recebido          o município pediu a proposta no site
//   proposta_enviada  a equipe mandou proposta, termo de referência e minuta
//   em_contratacao    a prefeitura abriu o processo (dispensa, parecer)
//   contratado        contrato assinado e empenho emitido; sai a 1ª fatura
//   ativo             a 1ª fatura foi paga: os módulos ligam
//   perdido           encerrado sem contrato, com o motivo anotado
//
// Até outubro de 2026 os módulos ligavam na assinatura e o pagamento vinha
// depois, pela liquidação. A regra mudou por decisão comercial: só liga com
// o primeiro pagamento, a mensalidade é antecipada e o atraso trava a conta
// (lib/cobranca.ts). Quem move o pedido é sempre a equipe.

export type StatusPedido =
  | "recebido"
  | "proposta_enviada"
  | "em_contratacao"
  | "contratado"
  | "ativo"
  | "perdido";

export const ORDEM_STATUS: StatusPedido[] = [
  "recebido",
  "proposta_enviada",
  "em_contratacao",
  "contratado",
  "ativo",
];

export const STATUS_PEDIDO: Record<StatusPedido, { rotulo: string; paraOCliente: string }> = {
  recebido: {
    rotulo: "Recebido",
    paraOCliente: "A proposta e o termo de referência chegam no seu e-mail em até um dia útil.",
  },
  proposta_enviada: {
    rotulo: "Proposta enviada",
    paraOCliente:
      "Confira o e-mail: proposta, termo de referência e minuta de contrato. Dúvida do jurídico, responda o mesmo e-mail.",
  },
  em_contratacao: {
    rotulo: "Em contratação",
    paraOCliente:
      "O processo está aberto na prefeitura. Assinado o contrato e emitido o empenho, a primeira fatura chega por e-mail.",
  },
  contratado: {
    rotulo: "Aguardando pagamento",
    paraOCliente:
      "Contrato registrado. Os módulos ligam assim que o pagamento da primeira fatura for confirmado.",
  },
  ativo: {
    rotulo: "Ativo",
    paraOCliente: "Módulos ativos nesta conta. As mensalidades seguem o dia de vencimento do contrato.",
  },
  perdido: {
    rotulo: "Encerrado",
    paraOCliente: "Este pedido foi encerrado sem contrato. Para retomar, faça um novo pedido de proposta.",
  },
};

/**
 * O próximo passo que se marca com um clique. Contrato e pagamento não estão
 * aqui de propósito: os dois pedem dados (número do contrato, empenho, data
 * do pagamento) e têm ação própria na mesa da equipe.
 */
export const PROXIMO_STATUS: Record<StatusPedido, StatusPedido | null> = {
  recebido: "proposta_enviada",
  proposta_enviada: "em_contratacao",
  em_contratacao: null,
  contratado: null,
  ativo: null,
  perdido: null,
};

/** Pedido que ainda está andando: nem ativo, nem encerrado. */
export function pedidoEmAberto(status: string): boolean {
  return status !== "ativo" && status !== "perdido";
}

/** Módulos do pedido, só os que existem. */
export function modulosDoPedido(raw: string | null | undefined): PlanoAddon[] {
  if (!raw) return [];
  try {
    const lista = JSON.parse(raw);
    if (!Array.isArray(lista)) return [];
    return lista.filter((m): m is PlanoAddon => PLANOS_ADDON.some((p) => p.chave === m));
  } catch {
    return [];
  }
}

/**
 * Une os módulos do pedido aos já contratados, sem repetir e sem perder
 * nenhum. Devolve o JSON pronto para gravar em prefeituras.planos_contratados.
 */
export function ativarModulos(planosContratadosRaw: string | null | undefined, novos: PlanoAddon[]): string {
  const atuais = planosContratadosDe(planosContratadosRaw);
  const uniao = PLANOS_ADDON.map((p) => p.chave).filter((c) => atuais.includes(c) || novos.includes(c));
  return JSON.stringify(uniao);
}

/**
 * Quem pode entrar em /admin: os e-mails listados em ADMIN_EMAILS (separados
 * por vírgula). Sem a variável, ninguém — a tela nem existe para o site.
 */
export function ehAdmin(email: string | null | undefined, lista = process.env.ADMIN_EMAILS): boolean {
  if (!email || !lista) return false;
  const alvo = email.trim().toLowerCase();
  return lista
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(alvo);
}

/** Link que o cliente usa para criar a conta já amarrada ao pedido. */
export function linkCadastroDoPedido(pedidoId: string): string {
  return `/cadastro?proposta=${encodeURIComponent(pedidoId)}`;
}
