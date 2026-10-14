/**
 * O Postgres grava "2026-10-14 12:04:43.865568-03" (now()::text). O Date do
 * JavaScript não entende o fuso de duas casas nem os microssegundos de forma
 * confiável; aqui vira ISO de verdade.
 */
export function dataDoBanco(texto: string): Date {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}(?::?\d{2})?)?$/.exec(texto.trim());
  if (!m) return new Date(texto);
  const ms = (m[3] ?? "0").padEnd(3, "0").slice(0, 3);
  let fuso = m[4] ?? "Z";
  if (fuso !== "Z") fuso = fuso.length === 3 ? `${fuso}:00` : fuso.includes(":") ? fuso : `${fuso.slice(0, 3)}:${fuso.slice(3)}`;
  return new Date(`${m[1]}T${m[2]}.${ms}${fuso}`);
}
