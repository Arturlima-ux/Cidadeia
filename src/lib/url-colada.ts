// ── LINK COLADO COM PONTUAÇÃO GRUDADA ──
//
// Um prospecto recebe o endereço da demonstração por WhatsApp, dentro de uma
// frase. Copia. No meio do caminho vem junto o ponto final, ou o parêntese que
// fechava, ou a seta que o remetente usou como enfeite — e o que chega ao
// servidor é `/demo%20→`, que não é rota nenhuma.
//
// O resultado é um 404 para alguém que fez tudo certo. Num produto que se
// vende mandando link por mensagem para prefeito e secretário, esse 404 não é
// um detalhe de navegação: é o lead que não chegou na tela.
//
// ── POR QUE NÃO É SÓ APARAR TUDO ──
//
// Aparar caracteres do fim de um endereço é perigoso: uma rota legítima pode
// terminar em qualquer coisa. Aqui a lista é fechada e conservadora — só
// pontuação que mensageiro gruda —, e nunca inclui letra, dígito, hífen,
// sublinhado ou a própria barra. As rotas do produto (slugs de município,
// chaves de módulo, protocolos) são todas alfanuméricas com hífen, então
// nenhuma delas pode ser mutilada por esta regra.
//
// E a limpeza compara com o endereço cru, sem decodificar a estrutura: decodificar
// o caminho inteiro transformaria um `%2F` em barra e mudaria a rota pedida,
// trocando um 404 por algo pior que um 404.

/** Pontuação que mensageiro, e-mail e editor de texto grudam no fim de um link. */
const PONTUACAO_COLADA = [
  " ",
  "\t",
  "\n",
  "\r",
  " ", // espaço que não quebra — o que o Word costuma inserir
  ".",
  ",",
  ";",
  ":",
  "!",
  "?",
  ")",
  "]",
  "}",
  ">",
  '"',
  "'",
  "»",
  "…",
  "–",
  "—",
  "→",
];

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Reconhece a pontuação tanto na forma literal quanto percent-codificada.
 *
 * O navegador manda `%20` para o espaço e `%E2%86%92` para a seta, mas manda o
 * ponto e o parêntese como estão. Cobrir só uma das formas deixaria metade dos
 * casos de fora — e seria a metade mais comum, porque é o espaço que vem junto
 * quando se arrasta a seleção um caractere além.
 */
const LIXO_FINAL = new RegExp(
  "(?:" +
    PONTUACAO_COLADA.flatMap((c) => {
      const codificado = encodeURIComponent(c);
      return codificado === c ? [escaparRegex(c)] : [escaparRegex(c), escaparRegex(codificado)];
    }).join("|") +
    ")+$",
  "i" // os dígitos hexadecimais do percent-code chegam em caixa alta ou baixa
);

/**
 * O caminho sem a pontuação colada, ou null se não havia nada a tirar.
 *
 * Devolver null — e não o mesmo caminho — é de propósito: quem chama precisa
 * saber se deve redirecionar, e comparar strings do lado de fora convidaria a
 * um laço de redirecionamento no dia em que a comparação ficasse errada.
 */
export function limparCaminhoColado(pathname: string): string | null {
  const limpo = pathname.replace(LIXO_FINAL, "");
  if (limpo === pathname) return null;
  // Um endereço feito só de pontuação sobra vazio; a raiz é o destino honesto.
  return limpo === "" ? "/" : limpo;
}

/**
 * Se vale corrigir o endereço deste pedido.
 *
 * Só GET e HEAD. Um POST redirecionado com 308 mantém o método e o corpo, e
 * reenviar um formulário para um endereço que o servidor adivinhou é a espécie
 * de conserto que estraga mais do que o problema.
 */
export function deveCorrigirCaminho(metodo: string, pathname: string): string | null {
  if (metodo !== "GET" && metodo !== "HEAD") return null;
  return limparCaminhoColado(pathname);
}
