/**
 * Siglas das 27 unidades federativas.
 *
 * Mora aqui, e não junto da server action que usa a lista, porque arquivo
 * marcado com "use server" só pode exportar função assíncrona: um array
 * exportado de lá vira referência de servidor no cliente e quebra em tempo de
 * execução com "ESTADOS.map is not a function" — foi assim que este arquivo
 * nasceu.
 */
export const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
] as const;

export type Estado = (typeof ESTADOS)[number];
