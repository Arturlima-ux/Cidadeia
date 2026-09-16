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

/** Nome por extenso, para título de página e texto corrido. */
export const NOME_DOS_ESTADOS: Record<Estado, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão",
  MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará",
  PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima",
  SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

/** "do Piauí", "de Minas Gerais", "da Bahia" — a preposição que o nome pede. */
export function doEstado(uf: Estado): string {
  const nome = NOME_DOS_ESTADOS[uf];
  const artigoO: Estado[] = ["AC", "AP", "AM", "CE", "DF", "ES", "MA", "MT", "MS", "PA", "PR", "PI", "RJ", "RN", "RS", "TO"];
  const artigoA: Estado[] = ["BA", "PB"];
  if (artigoO.includes(uf)) return `do ${nome}`;
  if (artigoA.includes(uf)) return `da ${nome}`;
  return `de ${nome}`;
}
