import type { PlanoAddon } from "@/lib/planos";
import { PLANOS_ADDON, planosContratadosDe } from "@/lib/planos";

// ── O CAMINHO DE UM PEDIDO DE PROPOSTA ──
//
// Três estados, na ordem em que acontecem de verdade numa prefeitura:
// a equipe recebe, manda a proposta e o termo de referência, o município
// faz a dispensa e assina — e só então os módulos ligam. Não há "pago":
// prefeitura paga por empenho depois da nota, e o acesso não espera isso.

export type StatusPedido = "recebido" | "proposta_enviada" | "contratado";

export const STATUS_PEDIDO: Record<StatusPedido, { rotulo: string; paraOCliente: string }> = {
  recebido: {
    rotulo: "Recebido",
    paraOCliente: "A proposta e o termo de referência chegam no seu e-mail em até um dia útil.",
  },
  proposta_enviada: {
    rotulo: "Proposta enviada",
    paraOCliente:
      "Confira o e-mail. Assinado o contrato, os módulos são ativados aqui, nesta conta — você recebe um aviso.",
  },
  contratado: {
    rotulo: "Contratado",
    paraOCliente: "Módulos ativos nesta conta. Bom trabalho.",
  },
};

export const PROXIMO_STATUS: Record<StatusPedido, StatusPedido | null> = {
  recebido: "proposta_enviada",
  proposta_enviada: "contratado",
  contratado: null,
};

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
