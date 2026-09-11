// ── TENDÊNCIA: O NÚMERO DE HOJE COMPARADO COM O DE ONTEM ──
//
// O motor de análise olhava só a última leitura de cada indicador e a
// comparava com um limiar fixo: "frequência em 71%, abaixo de 75%". Isso
// diz COMO ESTÁ; não diz DE ONDE VEIO. Para quem decide, a diferença é
// grande: 71% estável há um ano e 71% depois de cair de 88% em dois meses
// pedem reações opostas — e a segunda situação pode acontecer com o número
// ainda acima do limiar, sem disparar regra nenhuma.
//
// Cada atualização de indicador já grava uma linha nova no banco. Este
// módulo lê a série e responde duas perguntas:
//
//   1. Quanto mudou desde a leitura anterior?
//   2. Quanto se afasta do padrão das leituras anteriores?
//
// ── O QUE ELE NÃO FAZ ──
//
// Não extrapola. Duas leituras dão uma variação, não uma "tendência de
// queda"; quatro leituras dão um padrão fraco. A descrição diz o que foi
// medido e quando — nunca "vai cair" ou "tende a".

import { FUSO_PADRAO } from "@/lib/horario";

export type Leitura = { valor: number; em: string };

export type Tendencia = {
  atual: number;
  anterior: number;
  /** atual − anterior, na unidade do indicador. */
  variacao: number;
  /** Data (ISO) da leitura anterior — "desde junho". */
  anteriorEm: string;
  /** Média das leituras ANTERIORES à atual; null com menos de 3 anteriores. */
  mediaAnterior: number | null;
  /** atual − mediaAnterior; null quando não há média. */
  desvioDaMedia: number | null;
  /** Quantas leituras entraram, incluindo a atual. */
  n: number;
};

/** Leituras anteriores que bastam para falar em "padrão histórico". */
export const MINIMO_PARA_PADRAO = 3;

/**
 * `serie` vem da leitura mais recente para a mais antiga (ordem do banco).
 * Ignora leituras sem valor. Devolve null com menos de duas leituras.
 */
export function calcularTendencia(serie: Array<{ valor: number | null; em: string }>): Tendencia | null {
  const validas = serie.filter((l): l is Leitura => l.valor !== null && Number.isFinite(l.valor));
  if (validas.length < 2) return null;

  const [atual, anterior, ...resto] = validas;
  const anteriores = [anterior, ...resto];
  const temPadrao = anteriores.length >= MINIMO_PARA_PADRAO;
  const mediaAnterior = temPadrao
    ? anteriores.reduce((s, l) => s + l.valor, 0) / anteriores.length
    : null;

  return {
    atual: atual.valor,
    anterior: anterior.valor,
    variacao: atual.valor - anterior.valor,
    anteriorEm: anterior.em,
    mediaAnterior,
    desvioDaMedia: mediaAnterior === null ? null : atual.valor - mediaAnterior,
    n: validas.length,
  };
}

/**
 * "junho" ou "junho de 2025" quando o ano é outro.
 *
 * Com fuso, pelo mesmo motivo de lib/horario.ts: uma leitura gravada às 22h
 * de 31 de julho no Brasil já é 1º de agosto em UTC — e "desde agosto" seria
 * mentira por uma hora de diferença.
 */
export function nomeDoMes(iso: string, fuso = FUSO_PADRAO, agora = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "a leitura anterior";
  const partes = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, month: "long", year: "numeric" })
    .formatToParts(d);
  const mes = partes.find((x) => x.type === "month")?.value ?? "";
  const ano = partes.find((x) => x.type === "year")?.value ?? "";
  const anoAgora = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, year: "numeric" }).format(agora);
  return ano === anoAgora ? mes : `${mes} de ${ano}`;
}

export type UnidadeTendencia =
  /** Percentual: variação em pontos percentuais. */
  | "pp"
  /** Número absoluto (nota, minutos, pessoas). */
  | { sufixo: string; casas?: number };

function fmt(v: number, casas: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas }).format(v);
}

/**
 * "caiu 7 pontos desde junho (era 78%)" / "subiu 12 min desde maio (era 26 min)".
 */
export function descreverVariacao(
  t: Tendencia,
  unidade: UnidadeTendencia,
  fuso = FUSO_PADRAO,
  agora = new Date()
): string {
  const casas = unidade === "pp" ? 1 : (unidade.casas ?? 1);
  const abs = Math.abs(t.variacao);
  const verbo = t.variacao < 0 ? "caiu" : "subiu";
  const quanto =
    unidade === "pp"
      ? `${fmt(abs, casas)} ${abs === 1 ? "ponto" : "pontos"}`
      : `${fmt(abs, casas)} ${unidade.sufixo}`.trim();
  const era = unidade === "pp" ? `${fmt(t.anterior, casas)}%` : `${fmt(t.anterior, casas)} ${unidade.sufixo}`.trim();
  return `${verbo} ${quanto} desde ${nomeDoMes(t.anteriorEm, fuso, agora)} (era ${era})`;
}

/**
 * "e está 9 pontos abaixo da média das 5 leituras anteriores" — só quando há
 * padrão (3+ anteriores) e o desvio é relevante.
 */
export function descreverDesvio(
  t: Tendencia,
  unidade: UnidadeTendencia,
  minimoRelevante: number
): string | null {
  if (t.desvioDaMedia === null || t.mediaAnterior === null) return null;
  if (Math.abs(t.desvioDaMedia) < minimoRelevante) return null;
  const casas = unidade === "pp" ? 1 : (unidade.casas ?? 1);
  const abs = Math.abs(t.desvioDaMedia);
  const lado = t.desvioDaMedia < 0 ? "abaixo" : "acima";
  const quanto =
    unidade === "pp"
      ? `${fmt(abs, casas)} ${abs === 1 ? "ponto" : "pontos"}`
      : `${fmt(abs, casas)} ${unidade.sufixo}`.trim();
  return `${quanto} ${lado} da média das ${t.n - 1} leituras anteriores`;
}
