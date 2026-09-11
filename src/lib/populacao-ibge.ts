// ── POPULAÇÃO E MUNICÍPIO POR CÓDIGO, SEM REDE ──
//
// Consultava o IBGE ao vivo (agregado 6579). Passou a ler a tabela local em
// src/dados/municipios.json, gerada por scripts/atualizar-municipios.mjs —
// mesma fonte, sem depender de o IBGE responder no segundo do clique.
// As funções continuam async por compatibilidade com quem já chamava.

import { municipioPorCodigo, type Municipio } from "@/lib/municipios";

export type MunicipioIbge = Municipio & { populacao: number };

/** Código IBGE de município: sete dígitos. Tudo que não for isso é ignorado. */
export function ehCodigoIbge(v: unknown): v is string {
  return typeof v === "string" && /^\d{7}$/.test(v);
}

export async function buscarPopulacao(codigoIbge: string): Promise<number | null> {
  return municipioPorCodigo(codigoIbge)?.populacao ?? null;
}

/**
 * Código → nome, UF e população.
 *
 * É o que torna o porte inviolável: o pedido de proposta leva só o código,
 * e o servidor resolve daqui. Não existe parâmetro de URL que diga "sou de
 * 10 mil habitantes" — a tabela do IBGE é que diz.
 */
export async function buscarMunicipioPorCodigo(codigo: string): Promise<MunicipioIbge | null> {
  if (!ehCodigoIbge(codigo)) return null;
  const m = municipioPorCodigo(codigo);
  return m && m.populacao ? { ...m, populacao: m.populacao } : null;
}
