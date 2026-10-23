// ── AS BASES OFICIAIS QUE O CIDADEIA LÊ, NUMA LISTA SÓ ──
//
// A revisão de outubro de 2026 achou três listas diferentes no site: cinco
// bases na página inicial, seis na Governança e nove na Quem somos. Quem
// compara as páginas fica sem saber qual é a verdadeira. Agora todas leem
// daqui, e a lista é a das rotinas que de fato rodam
// (lib/importacao-automatica.ts): Tesouro (RGF e RREO), IBGE (população),
// PNCP (compras e contratos), DataSUS (CNES), INEP (Censo Escolar), FNDE
// (SIOPE), Fiocruz (InfoDengue), ObrasGov e Transferegov (Emendas Pix).

export const FONTES_OFICIAIS = [
  "Tesouro Nacional",
  "IBGE",
  "PNCP",
  "DataSUS",
  "INEP",
  "FNDE",
  "Fiocruz",
  "ObrasGov",
  "Transferegov",
] as const;

/** "Tesouro Nacional, IBGE, …, ObrasGov e Transferegov". */
export function fontesPorExtenso(): string {
  const l = [...FONTES_OFICIAIS];
  return `${l.slice(0, -1).join(", ")} e ${l[l.length - 1]}`;
}

/**
 * Municípios com prefeitura. A tabela do IBGE (lib/municipios.ts) tem uma
 * linha a mais, Brasília: o Distrito Federal não tem prefeitura nem entrega
 * RGF como município. Todo texto do site usa este número.
 */
export const MUNICIPIOS_COM_PREFEITURA = 5570;
