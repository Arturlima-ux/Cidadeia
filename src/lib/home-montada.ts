// ── QUANDO A HOME PRECISA SER MONTADA NO SERVIDOR ──
//
// "/" sai pronta do cache (app/page.tsx). Estes são os pedidos que mudam o
// que a página mostra e por isso vão para a montagem a cada pedido
// (app/inicio/page.tsx), por reescrita no proxy.ts:
//   ?m=   o município escolhido no Raio-X do topo
//   ?uf=  a troca de estado no seletor
//   ?para= a porta do morador (?para=morador) ou a volta à da prefeitura
//   sessão: o cabeçalho troca "Entrar" por "Ir para o painel"
// Qualquer outro parâmetro (utm_source, fbclid…) não muda nada na tela e
// continua na versão do cache.

export const PARAMETROS_DA_HOME_MONTADA = ["m", "uf", "para"] as const;

export function homePrecisaSerMontada(parametros: URLSearchParams, temSessao: boolean): boolean {
  return temSessao || PARAMETROS_DA_HOME_MONTADA.some((p) => parametros.has(p));
}

/** O que a versão montada entrega à home (app/inicio → app/page.tsx). */
export type PedidoDaHome = {
  m?: string;
  uf?: string;
  para?: string;
  /** Sessão de cliente (a de demonstração não conta). */
  sessaoAtiva: boolean;
};
