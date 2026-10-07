// ── PERGUNTAR AO TESOURO SEM DESISTIR NA PRIMEIRA ──
//
// A auditoria de outubro de 2026 (151 municípios, um a cada 37 da lista do
// IBGE) achou o RGF de 140. Dos 11 restantes, NENHUM era falta de publicação:
// em todos, a API do Tesouro devolveu uma página HTML de erro no lugar do
// JSON, por excesso de perguntas. O site então dizia "não conseguimos
// consultar", e o cidadão ficava sem a informação que existe.
//
// Duas defesas aqui:
//
//   1. nova tentativa, com espera crescente, quando a resposta não é JSON ou
//      não é 2xx;
//   2. a nova tentativa sai SEM o cache de dados do Next. Uma página de erro
//      que venha com status 200 é guardada pelo cache como se fosse resposta
//      boa, e repetir a pergunta pelo cache devolveria o mesmo erro por dias.
//
// Tempo esgotado não é repetido: quem estourou 15 s uma vez tende a estourar
// de novo, e a página não pode esperar o triplo.

const TIMEOUT_MS = 15_000;

/** Esperas entre as tentativas. Mutável só para os testes não dormirem. */
export const ESPERAS_TESOURO_MS = [400, 1200];

const dormir = (ms: number) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

/**
 * Lista `items` de uma consulta à API de dados abertos do Tesouro.
 *
 * Devolve [] quando o Tesouro respondeu e não tem nada, e null quando não
 * conseguimos uma resposta válida. A diferença decide se a tela pode dizer
 * "não consta publicado" ou só "não conseguimos perguntar".
 */
export async function itensDoTesouro<T>(url: string, revalidate: number): Promise<T[] | null> {
  for (let tentativa = 0; tentativa <= ESPERAS_TESOURO_MS.length; tentativa++) {
    if (tentativa > 0) await dormir(ESPERAS_TESOURO_MS[tentativa - 1]);
    try {
      const resposta = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        ...(tentativa === 0 ? { next: { revalidate } } : { cache: "no-store" as const }),
      });
      if (!resposta.ok) continue;
      const corpo = (await resposta.json()) as { items?: unknown };
      if (corpo.items === undefined) return [];
      if (!Array.isArray(corpo.items)) continue;
      return corpo.items as T[];
    } catch (e) {
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) return null;
      // JSON inválido (página de erro) ou falha de rede: tenta de novo.
    }
  }
  return null;
}
