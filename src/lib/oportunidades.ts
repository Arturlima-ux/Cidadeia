// ── O ATENDIMENTO COMERCIAL, EM REGRAS ──
//
// O site promete "proposta pronta em um dia útil" em seis lugares, e nada no
// sistema controlava isso. Os interessados do Raio-X e da projeção ficavam
// gravados numa tabela que nenhuma tela lia. E depois de enviada a proposta,
// ninguém voltava a falar com a prefeitura.
//
// Aqui ficam as regras, puras e testáveis: quando vence o prazo de um pedido,
// em que situação está cada interessado, e quando cabe um acompanhamento. A
// tela da equipe (/admin/interessados) e a rotina diária leem daqui.
//
// O andamento de cada interessado (contatado, descartado, telefone deixado)
// vai para a mesma linha do tempo dos pedidos (pedido_eventos), com o id do
// interessado no lugar do id do pedido. Assim nada exige mudar o banco.

/** Fuso de referência dos prazos: o da sede, que é o de Brasília. */
const FUSO_MS = -3 * 3600_000;

function diaLocal(ms: number): Date {
  return new Date(ms + FUSO_MS);
}

function ehDiaUtil(d: Date): boolean {
  const s = d.getUTCDay();
  return s !== 0 && s !== 6;
}

/**
 * Fim do prazo de "um dia útil": o fim do dia útil seguinte ao do pedido, no
 * horário de Brasília. Pedido de sexta à noite vence no fim de segunda.
 * Feriados não entram: o prazo fica mais curto, nunca mais longo.
 */
export function prazoDeUmDiaUtil(criadoEmIso: string): number {
  const inicio = diaLocal(Date.parse(criadoEmIso));
  const d = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate()));
  do {
    d.setUTCDate(d.getUTCDate() + 1);
  } while (!ehDiaUtil(d));
  // 23:59:59 local do dia útil seguinte, de volta em UTC.
  return d.getTime() + 86_400_000 - 1000 - FUSO_MS;
}

/** Dias úteis completos entre duas datas (para lembrete de 3 e 7 dias úteis). */
export function diasUteisEntre(deIso: string, ateMs: number): number {
  const a = diaLocal(Date.parse(deIso));
  const b = diaLocal(ateMs);
  const d = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()));
  const fim = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  let n = 0;
  while (d.getTime() < fim) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (ehDiaUtil(d)) n++;
  }
  return n;
}

// ── os interessados ──

export const TIPOS_EVENTO_LEAD = {
  contatado: "lead_contatado",
  descartado: "lead_descartado",
  telefone: "lead_telefone",
  virouPedido: "lead_virou_pedido",
  acompanhamento: "lead_acompanhamento",
} as const;

export type SituacaoLead = "novo" | "contatado" | "virou_pedido" | "descartado";

export const ROTULO_SITUACAO_LEAD: Record<SituacaoLead, string> = {
  novo: "Novo, sem contato",
  contatado: "Já contatado",
  virou_pedido: "Virou pedido",
  descartado: "Descartado",
};

type EventoSimples = { tipo: string; descricao: string; criadoEm: string };

/** A situação do interessado é o último evento que a decide. */
export function situacaoDoLead(eventos: EventoSimples[]): SituacaoLead {
  const decisivos = eventos
    .filter((e) => e.tipo === TIPOS_EVENTO_LEAD.contatado || e.tipo === TIPOS_EVENTO_LEAD.descartado || e.tipo === TIPOS_EVENTO_LEAD.virouPedido)
    .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  const ultimo = decisivos[decisivos.length - 1];
  if (!ultimo) return "novo";
  if (ultimo.tipo === TIPOS_EVENTO_LEAD.descartado) return "descartado";
  if (ultimo.tipo === TIPOS_EVENTO_LEAD.virouPedido) return "virou_pedido";
  return "contatado";
}

/** Telefone e melhor horário que o interessado deixou ("Peça uma ligação"). */
export function telefoneDoLead(eventos: EventoSimples[]): { telefone: string; horario: string | null } | null {
  const e = eventos.find((x) => x.tipo === TIPOS_EVENTO_LEAD.telefone);
  if (!e) return null;
  try {
    const dados = JSON.parse(e.descricao) as { telefone?: string; horario?: string | null };
    return dados.telefone ? { telefone: dados.telefone, horario: dados.horario ?? null } : null;
  } catch {
    return null;
  }
}

/**
 * Quanto vale um interessado, para ordenar a lista: quem decide e quem deixou
 * telefone primeiro. Imprensa e cidadão não somem, mas vão para o fim.
 */
export function prioridadeDoLead(l: { cargo: string | null; origem: string }, comTelefone: boolean): number {
  const cargo = (l.cargo ?? "").toLowerCase();
  let p = 0;
  if (comTelefone || l.origem === "ligacao") p += 50;
  if (/prefeit/.test(cargo)) p += 40;
  else if (/secret|contador|controlad|finan/.test(cargo)) p += 30;
  else if (/servidor|vereador/.test(cargo)) p += 15;
  else if (/imprensa|cidad/.test(cargo)) p -= 20;
  return p;
}

// ── o que a equipe precisa fazer hoje ──

export type PedidoParaAgenda = {
  id: string;
  municipio: string;
  uf: string;
  nome: string;
  email: string;
  status: string;
  createdAt: string;
};

export type AgendaComercial = {
  /** Pedidos recebidos cujo prazo de um dia útil já passou. */
  propostasAtrasadas: PedidoParaAgenda[];
  /** Pedidos recebidos que vencem hoje. */
  propostasVencendoHoje: PedidoParaAgenda[];
};

export function agendaComercial(pedidos: PedidoParaAgenda[], agora: number): AgendaComercial {
  const recebidos = pedidos.filter((p) => p.status === "recebido");
  const fimDeHoje = (() => {
    const d = diaLocal(agora);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + 86_400_000 - 1000 - FUSO_MS;
  })();
  return {
    propostasAtrasadas: recebidos.filter((p) => prazoDeUmDiaUtil(p.createdAt) < agora),
    propostasVencendoHoje: recebidos.filter((p) => {
      const prazo = prazoDeUmDiaUtil(p.createdAt);
      return prazo >= agora && prazo <= fimDeHoje;
    }),
  };
}

// ── o acompanhamento depois da proposta ──
//
// Prefeitura não responde no primeiro e-mail: a proposta entra num processo,
// passa pelo jurídico, espera o orçamento. Dois lembretes curtos, com o que
// costuma travar (o processo de contratação), e depois silêncio: insistir
// mais que isso com órgão público queima a relação.

export const ACOMPANHAMENTOS = [
  { chave: "acompanhamento_1", diasUteis: 3 },
  { chave: "acompanhamento_2", diasUteis: 8 },
] as const;

/** O próximo acompanhamento devido, ou null. */
export function acompanhamentoDevido(
  propostaEnviadaEm: string | null,
  jaEnviados: string[],
  agora: number
): (typeof ACOMPANHAMENTOS)[number] | null {
  if (!propostaEnviadaEm) return null;
  const passados = diasUteisEntre(propostaEnviadaEm, agora);
  for (const a of ACOMPANHAMENTOS) {
    if (jaEnviados.includes(a.chave)) continue;
    return passados >= a.diasUteis ? a : null;
  }
  return null;
}
