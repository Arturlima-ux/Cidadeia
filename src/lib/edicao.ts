import type { Lembranca } from "@/lib/boletim-da-cidade";

// ── A CIDADE DA EDIÇÃO, NO PRÓPRIO NAVEGADOR ──
// A landing lembra a cidade que a pessoa escolheu, para abrir nela no dia
// seguinte, e o número da última edição vista, para dizer o que mudou
// (lib/boletim-da-cidade.ts, oQueMudou). Fica só no localStorage deste
// aparelho; nada vai para o servidor. Sem armazenamento (aba anônima,
// bloqueio), a página funciona igual, só não lembra.

export const CHAVE_EDICAO = "cidadeia-edicao";
/** A busca escolheu uma cidade: a edição vai buscar os números dela. */
export const EVENTO_ESCOLHA = "cidadeia:edicao-escolha";
/** A edição da cidade chegou: o mapa marca a sede e a tabela de preços acende o porte. */
export const EVENTO_EDICAO = "cidadeia:edicao";

export type CidadeDaEdicao = {
  codigo: string;
  nome: string;
  uf: string;
  lat?: number;
  lng?: number;
  porte?: string;
  lembranca?: Lembranca | null;
};

export function lerCidadeDaEdicao(): CidadeDaEdicao | null {
  try {
    const t = localStorage.getItem(CHAVE_EDICAO);
    if (!t) return null;
    const c = JSON.parse(t) as CidadeDaEdicao;
    return typeof c?.codigo === "string" && /^\d{7}$/.test(c.codigo) ? c : null;
  } catch {
    return null;
  }
}

export function guardarCidadeDaEdicao(c: CidadeDaEdicao) {
  try {
    localStorage.setItem(CHAVE_EDICAO, JSON.stringify(c));
  } catch {
    // sem armazenamento: só não lembra amanhã
  }
}

export function anunciarCidadeDaEdicao(c: CidadeDaEdicao) {
  window.dispatchEvent(new CustomEvent(EVENTO_EDICAO, { detail: c }));
}

export function escolherCidade(c: { codigo: string; nome: string; uf: string }) {
  window.dispatchEvent(new CustomEvent(EVENTO_ESCOLHA, { detail: c }));
}
