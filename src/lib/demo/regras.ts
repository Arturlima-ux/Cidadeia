// ── O QUE A SESSÃO DE DEMONSTRAÇÃO NÃO PODE FAZER ──
//
// A demonstração é o painel real, com uma prefeitura fictícia. A proteção
// não está em cada botão — está numa regra só, no proxy, antes de qualquer
// código de tela rodar:
//
//   1. Nenhuma requisição que não seja GET. Toda gravação do painel é uma
//      ação de servidor, e ação de servidor é POST. Uma regra cobre todas.
//   2. Nenhum download: relatório em PDF e exportação de dados. São GET, e
//      por isso precisam de exceção própria — senão a demonstração vira um
//      gerador de relatório com dados inventados e a marca do CidadeIA.
//
// Pura, para ser testada sem levantar o servidor.

export const ROTAS_DE_DOWNLOAD = ["/api/relatorios", "/api/exportacao"];

export type DecisaoDemo = { permitido: true } | { permitido: false; motivo: string };

export function decidirNaDemo(metodo: string, pathname: string): DecisaoDemo {
  if (metodo.toUpperCase() !== "GET" && metodo.toUpperCase() !== "HEAD") {
    return {
      permitido: false,
      motivo: "Na demonstração nada é gravado. Para usar o sistema de verdade, peça a proposta.",
    };
  }
  if (ROTAS_DE_DOWNLOAD.some((r) => pathname.startsWith(r))) {
    return {
      permitido: false,
      motivo: "Relatório e exportação ficam desligados na demonstração — os dados são fictícios.",
    };
  }
  return { permitido: true };
}
