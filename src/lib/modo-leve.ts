// ── MODO LEVE: O MESMO SITE, PARADO ──
//
// Ver globals.css (html[data-leve]) e layout.tsx (o palpite pelo hardware,
// antes da primeira pintura). Aqui ficam o atributo, a chave guardada e a
// regra de decisão por quadros medidos, pura, para teste.

export const ATRIBUTO_LEVE = "data-leve";
export const CHAVE_LEVE = "cidadeia-leve";
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
 * Pelos intervalos entre quadros (ms), o computador está sofrendo? Quadro
 * lento é o que passa de 34 ms (perdeu dois quadros a 60 Hz). Os que caem
 * numa tarefa longa conhecida (o próprio carregamento do site) já vêm fora.
 * Precisa de pelo menos 40 quadros para decidir, e de 12% deles lentos.
 *
 * O corte veio da medição da primeira rolagem pela home (outubro de 2026):
 * com a CPU normal, 2% de quadros lentos; 2x mais lenta, 7%; 4x, 15%; 6x,
 * 34%. Em 12%, liga a partir de 4x e deixa em paz quem só está um pouco
 * abaixo do normal.
 */
export const FRACAO_LENTA = 0.12;
export function quadrosLentos(intervalos: number[]): boolean {
  if (intervalos.length < 40) return false;
  const lentos = intervalos.filter((ms) => ms > 34).length;
  return lentos / intervalos.length >= FRACAO_LENTA;
}
