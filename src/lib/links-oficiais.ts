import type { FONTES_OFICIAIS } from "@/lib/fontes-oficiais";

// ── ONDE CONFERIR, COM O ENDEREÇO OFICIAL ──
//
// O site cita SICONFI, LRF, LAI e Lei 13.460 o tempo todo e, até a auditoria
// de SEO de outubro de 2026, não ligava para nenhuma: zero links de saída em
// 89 páginas. Quem vende conformidade mostra onde conferir. Para o jurídico
// da prefeitura é o caminho até o texto; para o Google e para assistentes de
// IA, é o sinal de que o número tem origem.
//
// Só endereços do próprio órgão (gov.br, planalto.gov.br, tesouro.gov.br).

export const LINK_DA_FONTE: Record<(typeof FONTES_OFICIAIS)[number], string> = {
  "Tesouro Nacional": "https://siconfi.tesouro.gov.br",
  IBGE: "https://www.ibge.gov.br",
  PNCP: "https://pncp.gov.br",
  DataSUS: "https://cnes.datasus.gov.br",
  INEP: "https://www.gov.br/inep",
  FNDE: "https://www.gov.br/fnde",
  Fiocruz: "https://info.dengue.mat.br",
  ObrasGov: "https://www.gov.br/obrasgov",
  Transferegov: "https://www.gov.br/transferegov",
};

export const SICONFI = LINK_DA_FONTE["Tesouro Nacional"];

export type ChaveLei = "lrf" | "lai" | "lei13460" | "lei14133" | "lgpd";

export const LEIS: Record<ChaveLei, { nome: string; numero: string; url: string }> = {
  lrf: {
    nome: "Lei de Responsabilidade Fiscal",
    numero: "Lei Complementar nº 101/2000",
    url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm",
  },
  lai: {
    nome: "Lei de Acesso à Informação",
    numero: "Lei nº 12.527/2011",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm",
  },
  lei13460: {
    nome: "Código de Defesa do Usuário do Serviço Público",
    numero: "Lei nº 13.460/2017",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13460.htm",
  },
  lei14133: {
    nome: "Lei de Licitações e Contratos",
    numero: "Lei nº 14.133/2021",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm",
  },
  lgpd: {
    nome: "Lei Geral de Proteção de Dados",
    numero: "Lei nº 13.709/2018",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm",
  },
};
