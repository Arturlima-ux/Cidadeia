// ── "A RESPOSTA RESOLVEU?" ──
//
// Metade das prefeituras não pergunta ao cidadão se o atendimento resolveu
// (diagnóstico do TCE-RS, 2025). A prefeitura responde, marca "respondido" e
// o painel fica verde, mesmo quando a resposta foi um "estamos verificando".
// Aqui quem pediu diz, em um toque, se resolveu; a satisfação aparece no
// portal, em público, e o "não resolveu" chega na hora à equipe.
//
// Sem tabela nova: cada avaliação é um evento na linha do tempo da
// manifestação (pedido_eventos, pedidoId = id do atendimento). Vale a última.

export const EVENTO_AVALIACAO = "avaliacao_cidadao";

export const NOTAS = [
  { valor: "sim", rotulo: "Resolveu", cor: "var(--info)" },
  { valor: "parte", rotulo: "Em parte", cor: "var(--medio)" },
  { valor: "nao", rotulo: "Não resolveu", cor: "var(--urgente)" },
] as const;

export type Nota = (typeof NOTAS)[number]["valor"];

export const ehNota = (v: unknown): v is Nota => NOTAS.some((n) => n.valor === v);
export const rotuloDaNota = (n: Nota) => NOTAS.find((x) => x.valor === n)!.rotulo;

export type Avaliacao = { nota: Nota; comentario: string | null };

/** A descrição do evento, de volta para a avaliação. Linha estragada não conta. */
export function lerAvaliacao(descricao: string): Avaliacao | null {
  try {
    const d = JSON.parse(descricao) as { nota?: unknown; comentario?: unknown };
    if (!ehNota(d.nota)) return null;
    return { nota: d.nota, comentario: typeof d.comentario === "string" && d.comentario.trim() ? d.comentario.trim() : null };
  } catch {
    return null;
  }
}

/** A última avaliação de cada manifestação. Recebe do mais recente para o mais antigo. */
export function ultimaPorManifestacao(eventos: { pedidoId: string; descricao: string }[]): Map<string, Avaliacao> {
  const saida = new Map<string, Avaliacao>();
  for (const e of eventos) {
    if (saida.has(e.pedidoId)) continue;
    const a = lerAvaliacao(e.descricao);
    if (a) saida.set(e.pedidoId, a);
  }
  return saida;
}

export type Satisfacao = { total: number; sim: number; parte: number; nao: number; percentualResolveu: number | null };

export function resumirSatisfacao(avaliacoes: Iterable<Avaliacao>): Satisfacao {
  const s: Satisfacao = { total: 0, sim: 0, parte: 0, nao: 0, percentualResolveu: null };
  for (const a of avaliacoes) {
    s.total++;
    s[a.nota]++;
  }
  if (s.total) s.percentualResolveu = Math.round((s.sim / s.total) * 100);
  return s;
}
