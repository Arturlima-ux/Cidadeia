// ── HORAS POR ANO, NUMA MEDIDA QUE SE ENXERGA ──
//
// A calculadora de Quem somos (TempoQueVolta.tsx) dizia "O mesmo que 1
// semana inteira" para 48 horas, que são 1,2 semana: arredondava para baixo
// e chamava de inteira. Com muitas horas, dizia "240 semanas inteiras", que
// ninguém enxerga. Aqui a medida acompanha o tamanho: dias, semanas, meses ou
// anos de trabalho de uma pessoa, com uma casa decimal quando precisa.
//
// Jornada de 8 h por dia e 40 h por semana (a mais comum no serviço público
// municipal); mês de 4 semanas e ano de 48 semanas, o mesmo ano da conta.

export const SEMANAS_DE_TRABALHO = 48;
export const HORAS_POR_DIA = 8;
export const HORAS_POR_SEMANA = 40;
const HORAS_POR_MES = HORAS_POR_SEMANA * 4; // 160
const HORAS_POR_ANO = HORAS_POR_SEMANA * SEMANAS_DE_TRABALHO; // 1.920

const MEDIDAS = [
  { a_partir_de: HORAS_POR_ANO, horas: HORAS_POR_ANO, um: "ano", varios: "anos" },
  { a_partir_de: HORAS_POR_MES * 2, horas: HORAS_POR_MES, um: "mês", varios: "meses" },
  { a_partir_de: HORAS_POR_SEMANA * 2, horas: HORAS_POR_SEMANA, um: "semana", varios: "semanas" },
  { a_partir_de: 0, horas: HORAS_POR_DIA, um: "dia", varios: "dias" },
] as const;

/** "6 dias", "1,2 semana", "9,6 semanas", "2,4 meses", "5 anos". */
export function emTempoDeTrabalho(horasPorAno: number): string {
  const m = MEDIDAS.find((x) => horasPorAno >= x.a_partir_de)!;
  const n = horasPorAno / m.horas;
  const arredondado = Math.round(n * 10) / 10;
  const texto = arredondado.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  // No português, o plural começa no 2: "1,5 semana", "2 semanas".
  return `${texto} ${arredondado < 2 ? m.um : m.varios}`;
}
