import type { Municipio } from "@/lib/municipios";

// ── AS REGIÕES ADMINISTRATIVAS DO DISTRITO FEDERAL ──
//
// O DF tem um único município no IBGE, Brasília (5300108). Ceilândia,
// Taguatinga e as demais são regiões administrativas: não são municípios, não
// têm prefeitura e não mandam relatório próprio ao Tesouro. Quem as
// administra é o Governo do Distrito Federal.
//
// Mesmo assim, quem mora ou trabalha nelas procura pelo nome da região, e
// encontrar só "Brasília" parecia falha do site. Então elas aparecem no
// seletor, com código próprio (DF-RA-01 a DF-RA-35), e os números exibidos são
// os do Distrito Federal inteiro, com a tela dizendo isso.
//
// Lista oficial de 35 RAs, na ordem da numeração, com Arapoanga e Água Quente
// criadas em dezembro de 2022.

export const CODIGO_BRASILIA = "5300108";

export const REGIOES_DF = [
  "Plano Piloto", "Gama", "Taguatinga", "Brazlândia", "Sobradinho", "Planaltina",
  "Paranoá", "Núcleo Bandeirante", "Ceilândia", "Guará", "Cruzeiro", "Samambaia",
  "Santa Maria", "São Sebastião", "Recanto das Emas", "Lago Sul", "Riacho Fundo",
  "Lago Norte", "Candangolândia", "Águas Claras", "Riacho Fundo II", "Sudoeste/Octogonal",
  "Varjão", "Park Way", "SCIA/Estrutural", "Sobradinho II", "Jardim Botânico", "Itapoã",
  "SIA", "Vicente Pires", "Fercal", "Sol Nascente/Pôr do Sol", "Arniqueira", "Arapoanga",
  "Água Quente",
] as const;

export function codigoDaRegiao(indice: number): string {
  return `DF-RA-${String(indice + 1).padStart(2, "0")}`;
}

/** As regiões como opções do seletor, em ordem alfabética. */
export function regioesComoMunicipios(): Municipio[] {
  return REGIOES_DF.map((nome, i) => ({ codigo: codigoDaRegiao(i), nome, uf: "DF", populacao: null })).sort(
    (a, b) => a.nome.localeCompare(b.nome, "pt-BR")
  );
}

export function regiaoPorCodigo(codigo: string): Municipio | null {
  const m = /^DF-RA-(\d{2})$/.exec(codigo);
  if (!m) return null;
  const i = Number(m[1]) - 1;
  const nome = REGIOES_DF[i];
  return nome ? { codigo, nome, uf: "DF", populacao: null } : null;
}

export function ehRegiaoDf(m: Pick<Municipio, "codigo"> | null | undefined): boolean {
  return Boolean(m && /^DF-RA-\d{2}$/.test(m.codigo));
}

// ── O DF NÃO PRESTA CONTAS COMO MUNICÍPIO ──
//
// No SICONFI, o Distrito Federal reporta como ente estadual (código 53,
// esfera E), não como o município 5300108. Consultar o Tesouro pelo código
// de Brasília volta vazio, e o site lia isso como "0 de 4 relatórios
// publicados": uma acusação falsa contra o GDF. Os limites da LRF do DF
// também não são os de prefeitura.
//
// Até o Raio-X ter uma leitura própria para o DF, as telas não consultam o
// Tesouro para ele e dizem por quê, em vez de afirmar o que não verificaram.
export function ehDistritoFederal(uf: string | null | undefined): boolean {
  return (uf ?? "").toUpperCase() === "DF";
}

export const AVISO_DF =
  "O Distrito Federal presta contas ao Tesouro como unidade da federação, não como município, e tem limites " +
  "da Lei de Responsabilidade Fiscal próprios. O Raio-X municipal não se aplica ao DF: os números da " +
  "prefeitura que esta tela mostra para os outros municípios não existem para Brasília nem para as regiões " +
  "administrativas.";
