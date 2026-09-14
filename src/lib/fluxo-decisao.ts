// ── ANTES E DEPOIS: COMO A DECISÃO ACONTECE ──
//
// A home comparava o CidadeIA com as incumbentes numa tabela sobre COMPRAR:
// preço, caminho legal, processo, exportação. Tudo verdade — e tudo sobre
// contratação, na página que deveria vender o produto. Essa tabela foi para
// /como-contratar, que é onde quem está comprando a procura.
//
// No lugar entra o que o produto muda de fato: o caminho entre um dado e
// uma decisão. Cada passo do lado "com" corresponde a algo que existe no
// sistema — a importação, a leitura automática com memória, a lista "O que
// precisa da sua atenção", a linha que leva à tela. Nada aqui é promessa de
// roadmap.

export type PassoFluxo = { titulo: string; detalhe: string };

export const FLUXO_ANTES: PassoFluxo[] = [
  { titulo: "O secretário manda uma planilha", detalhe: "Quando lembra, no formato que tem." },
  { titulo: "O prefeito espera o relatório", detalhe: "Que consolida três sistemas à mão, uma vez por mês." },
  { titulo: "O número chega sem história", detalhe: "71% de frequência — era 78%? Ninguém sabe de cabeça." },
  { titulo: "O problema aparece no parecer", detalhe: "Do Tribunal de Contas, meses depois, quando já é sanção." },
];

export const FLUXO_COM: PassoFluxo[] = [
  { titulo: "O dado entra", detalhe: "Por planilha, pelo Tesouro Nacional (SICONFI) ou digitado pelo secretário." },
  { titulo: "A leitura automática compara", detalhe: "Com o limite legal e com a leitura anterior: \"caiu 7 pontos desde junho\"." },
  { titulo: "Vira uma linha na Visão Geral", detalhe: "\"3 pontos pedem sua decisão hoje\" — ordenados por urgência." },
  { titulo: "A linha leva à tela onde se resolve", detalhe: "Com o número, o artigo da lei e a ação sugerida — a quem pedir o quê." },
  { titulo: "A decisão sai antes do parecer", detalhe: "E fica registrada, com data, para o Tribunal." },
];
