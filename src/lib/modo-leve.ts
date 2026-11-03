// ── MODO LEVE: O MESMO SITE, PARADO ──
//
// Ver globals.css (html[data-leve]) e layout.tsx (o palpite pelo hardware,
// antes da primeira pintura). Aqui ficam o atributo, a chave guardada e a
// regra de decisão por quadros medidos, pura, para teste.

export const ATRIBUTO_LEVE = "data-leve";
// "-3" desde 3/11/2026: a regra de quadros lentos tratava o iPhone em
// economia de bateria (30 quadros por segundo, ~33 ms cada) como aparelho
// sofrendo, ligava o modo leve e guardava a escolha: o fundador passou a ver o
// site sem animação nenhuma. As escolhas guardadas com a regra antiga são
// descartadas; quem trava de verdade volta ao modo leve pela medição.
// (Era "-2" desde o palpite pelo hardware mais justo, de novembro de 2026.)
export const CHAVE_LEVE = "cidadeia-leve-3";
/** Evento disparado quando o modo leve é ligado depois do carregamento. */
export const EVENTO_LEVE = "cidadeia:leve";

/** Está em modo leve agora? (no servidor, nunca) */
export function emModoLeve(): boolean {
  return typeof document !== "undefined" && document.documentElement.hasAttribute(ATRIBUTO_LEVE);
}

/** Movimento reduzido pelo sistema ou modo leve: o componente fica parado. */
export function semMovimento(): boolean {
  if (typeof window === "undefined") return false;
  return emModoLeve() || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Pelos intervalos entre quadros (ms), o aparelho está sofrendo?
 *
 * Duas coisas são sofrer: um ritmo médio pior que ~22 quadros por segundo
 * (mediana acima de 45 ms), ou travadas, isto é, 12% dos quadros levando
 * quase o dobro do ritmo normal do próprio aparelho (1,9 vez a mediana, e
 * nunca menos que 34 ms). Os quadros que caem numa tarefa longa conhecida (o
 * próprio carregamento do site) já vêm fora. Precisa de 40 quadros para decidir.
 *
 * Por que pelo ritmo do aparelho: até 3/11/2026 o corte era fixo, 34 ms. O
 * iPhone em economia de bateria desenha a 30 quadros por segundo (33,3 ms),
 * liso, e qualquer oscilação passava de 34: o site ligava o modo leve num
 * aparelho que não travava. A 60 quadros por segundo o corte continua 34 ms,
 * o mesmo da medição de outubro de 2026 (CPU normal: 2% de quadros lentos;
 * 4x mais lenta: 15%; 6x: 34%).
 */
export const FRACAO_LENTA = 0.12;
export const MEDIANA_LENTA_MS = 45;
export function quadrosLentos(intervalos: number[]): boolean {
  if (intervalos.length < 40) return false;
  const ordenados = [...intervalos].sort((a, b) => a - b);
  const mediana = ordenados[Math.floor(ordenados.length / 2)];
  if (mediana > MEDIANA_LENTA_MS) return true;
  const corte = Math.max(34, mediana * 1.9);
  const lentos = intervalos.filter((ms) => ms > corte).length;
  return lentos / intervalos.length >= FRACAO_LENTA;
}
