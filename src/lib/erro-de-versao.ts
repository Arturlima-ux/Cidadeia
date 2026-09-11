// ── ERRO DE VERSÃO: A PÁGINA ABERTA É MAIS VELHA QUE O SERVIDOR ──
//
// O navegador guarda o HTML e os pedaços de JavaScript de uma visita. Quando
// sai um deploy, os nomes desses pedaços mudam — eles levam o hash do conteúdo.
// Uma aba que ficou aberta continua pedindo os pedaços antigos, que já não
// existem, e a navegação estoura.
//
// Isso não é defeito do código nem do servidor: as duas pontas estão certas,
// só desencontradas no tempo. Num dia de vários deploys, acontece.
//
// O que torna o caso GRAVE é a reação errada. A fronteira de erro do Next
// oferece "Tentar de novo", que remonta o mesmo bundle quebrado — falha de
// novo, sempre igual, e o usuário fica preso num laço achando que o sistema
// está fora do ar. A única saída é recarregar de verdade, buscando o HTML
// novo com os nomes novos.

/**
 * Reconhece o erro pelo formato da mensagem, em vez de por um tipo.
 *
 * Cada navegador nomeia isto de um jeito, e nenhum expõe uma classe estável:
 * Chrome usa `ChunkLoadError`, Firefox fala em módulo dinâmico, Safari em
 * script de importação. Casar pelo texto é frágil por natureza — por isso a
 * lista é ampla e o custo de um falso positivo é baixo: recarregar uma página
 * que não precisava é um piscar, enquanto deixar passar prende o usuário.
 */
export function ehErroDeVersao(erro: unknown): boolean {
  if (!erro) return false;

  const nome = (erro as { name?: string }).name ?? "";
  if (nome === "ChunkLoadError") return true;

  const mensagem = String((erro as { message?: string }).message ?? erro);

  return [
    "loading chunk",
    "loading css chunk",
    "failed to fetch dynamically imported module",
    "error loading dynamically imported module",
    "importing a module script failed",
    "unable to preload",
    // Aba aberta antes do deploy chama uma ação de servidor que o servidor
    // novo não conhece mais. Mesma causa dos chunks — versão velha na aba —,
    // mesmo remédio: recarregar uma vez. Visto na tela de Preços com seis
    // abas abertas depois de quatro publicações numa hora.
    "failed to find server action",
    "server action",
  ].some((marca) => mensagem.toLowerCase().includes(marca));
}

/**
 * Quanto tempo esperar antes de recarregar de novo pelo mesmo motivo.
 *
 * Sem esta trava, uma falha que NÃO se resolve com recarga vira um laço
 * infinito de recargas — pior que a tela de erro, porque o usuário não
 * consegue nem ler o que aconteceu nem clicar em nada.
 */
const INTERVALO_MINIMO_MS = 15_000;

const CHAVE = "cidadeia:recarga-por-versao";

/**
 * Recarrega a página uma vez, se ainda não recarregamos há pouco.
 *
 * Devolve true quando a recarga foi disparada — o chamador usa isso para
 * mostrar "atualizando" em vez da tela de erro, e não piscar o alarme antes
 * de tentar a saída silenciosa.
 */
export function recarregarPorVersao(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const ultima = Number(window.sessionStorage.getItem(CHAVE) ?? 0);
    if (Date.now() - ultima < INTERVALO_MINIMO_MS) return false;
    window.sessionStorage.setItem(CHAVE, String(Date.now()));
  } catch {
    // Navegador com armazenamento bloqueado (aba anônima, política do
    // sistema). Sem a trava não dá para garantir uma recarga só, e um laço
    // infinito é pior que a tela de erro — então desiste da recarga
    // automática e deixa o usuário no controle, pelo botão.
    return false;
  }

  window.location.reload();
  return true;
}
