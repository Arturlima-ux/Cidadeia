// ── O RAIO-X EM TEXTO, PARA O E-MAIL ──
// A leitura de cada número, nas mesmas palavras cautelosas da tela: o
// percentual da receita é indício, não cálculo de mínimo; RREO faltando é
// o achado que dói. Puro, sem rede, testável.

import { proporcaoDaReceita } from "@/lib/raio-x-calculo";
import type { RaioX } from "@/lib/raio-x";

function moeda(v: number | null): string {
  if (v === null) return "não publicado";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}
function pct(v: number | null): string {
  return v === null ? "—" : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v)}%`;
}

export function resumoDoRaioX(r: RaioX): string[] {
  const linhas: string[] = [];
  linhas.push(`Município: ${r.municipio}/${r.uf} — código IBGE ${r.codigoIbge} — exercício ${r.exercicio}.`);
  if (r.bimestreReferencia === null) {
    linhas.push(
      r.rreoEsperados === 0
        ? "Nenhum bimestre do exercício se encerrou ainda; não há RREO a cobrar."
        : `${r.rreoEsperados} bimestre(s) já se encerraram e nenhum RREO consta publicado no Tesouro. É falha de transparência apontável pelo Tribunal de Contas.`
    );
    return linhas;
  }
  linhas.push(`Dado mais recente: ${r.bimestreReferencia}º bimestre.`);
  linhas.push(`Receita realizada: ${moeda(r.receita.valor)}.`);
  const ps = proporcaoDaReceita(r.despesaSaude.valor, r.receita.valor);
  const pe = proporcaoDaReceita(r.despesaEducacao.valor, r.receita.valor);
  linhas.push(`Aplicado em saúde: ${moeda(r.despesaSaude.valor)} (${pct(ps)} da receita realizada).`);
  linhas.push(`Aplicado em educação: ${moeda(r.despesaEducacao.valor)} (${pct(pe)} da receita realizada).`);
  linhas.push(`Aplicado em obras (urbanismo): ${moeda(r.despesaObras.valor)}.`);
  linhas.push(
    r.rreoFaltando.length === 0
      ? `RREO: ${r.rreoEntregues} de ${r.rreoEsperados} bimestres encerrados constam publicados — em dia.`
      : `RREO: faltam ${r.rreoFaltando.length} de ${r.rreoEsperados} bimestres encerrados (${r.rreoFaltando.map((b) => `${b}º`).join(", ")}). Cada um é uma pendência apontável.`
  );
  linhas.push(RESSALVA_MINIMOS);
  return linhas;
}

/**
 * A ressalva sobre o percentual da receita, em um lugar só.
 *
 * O Raio-X e a home dizem a mesma coisa sobre o mesmo número. Duas cópias do
 * texto é como uma delas deixa de ser corrigida — e aqui a frase existe
 * justamente para impedir que alguém leia "14,5% da receita" como "abaixo do
 * mínimo da saúde", que é leitura errada sobre base errada.
 */
export const RESSALVA_MINIMOS =
  "Os percentuais da receita são indício, não cálculo de mínimo constitucional: a base legal do mínimo (15% em saúde, 25% em educação) é a receita de impostos e transferências, não a receita total.";
