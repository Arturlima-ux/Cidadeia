import { municipiosDaUf } from "@/lib/municipios";
import { porteDaPopulacao, PORTES, type PorteMunicipio } from "@/lib/precos";
import type { Estado } from "@/lib/estados";

// ── O RETRATO DE UM ESTADO, SÓ COM O QUE JÁ ESTÁ NA MÁQUINA ──
//
// A página por UF não consulta o Tesouro: seriam centenas de chamadas por
// visita. Ela conta o que a tabela local do IBGE já sabe — quantos
// municípios, quanta gente, quantos em cada faixa, quantos cabem na
// dispensa — e aponta para a página de cada município, onde os números do
// SICONFI estão. Puro e testável.

export type RetratoUf = {
  uf: Estado;
  total: number;
  populacao: number;
  porFaixa: { chave: PorteMunicipio; rotulo: string; quantidade: number; garanteDispensa: boolean }[];
  cabemNaDispensa: number;
  /** Do maior para o menor. */
  municipios: { codigo: string; nome: string; populacao: number; porte: PorteMunicipio }[];
};

export function retratoDaUf(uf: Estado): RetratoUf {
  const lista = municipiosDaUf(uf)
    .map((m) => ({ codigo: m.codigo, nome: m.nome, populacao: m.populacao ?? 0, porte: porteDaPopulacao(m.populacao) }))
    .sort((a, b) => b.populacao - a.populacao || a.nome.localeCompare(b.nome, "pt-BR"));

  const contagem = new Map<PorteMunicipio, number>();
  for (const m of lista) contagem.set(m.porte, (contagem.get(m.porte) ?? 0) + 1);

  const porFaixa = PORTES.map((p) => ({
    chave: p.chave,
    rotulo: p.rotulo,
    quantidade: contagem.get(p.chave) ?? 0,
    garanteDispensa: p.garanteDispensa,
  }));

  return {
    uf,
    total: lista.length,
    populacao: lista.reduce((s, m) => s + m.populacao, 0),
    porFaixa,
    cabemNaDispensa: porFaixa.filter((f) => f.garanteDispensa).reduce((s, f) => s + f.quantidade, 0),
    municipios: lista,
  };
}
