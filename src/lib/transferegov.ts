// ── A API PÚBLICA DO TRANSFEREGOV ──
//
// Os módulos do Transferegov (transferências especiais, fundo a fundo,
// parcerias) são serviços FastAPI com o mesmo formato: GET com os filtros
// como parâmetros de consulta, e a resposta num envelope
//   { data: [...], total_items, total_pages, page_number, page_size }
// paginado por `pagina` (a partir de 1) e `tamanho_da_pagina` (até 200).
//
// Endereços e campos conferidos no esquema publicado pelo próprio serviço
// (o mesmo que o pacote transferegovr, do CRAN, lê), em outubro de 2026.

export const BASE_TRANSFEREGOV = "https://api-publica.transferegov.gestao.gov.br";
const TIMEOUT_MS = 20_000;
const TAMANHO_DA_PAGINA = 200;

type Envelope<T> = { data: T[]; total_items: number; total_pages: number; page_number: number; page_size: number };

export class FalhaTransferegov extends Error {}

/** Uma página. Lança FalhaTransferegov quando não vem um envelope válido. */
async function pagina<T>(caminho: string, filtros: Record<string, string | number>, numero: number): Promise<Envelope<T>> {
  const url = new URL(`${BASE_TRANSFEREGOV}/${caminho}`);
  for (const [k, v] of Object.entries(filtros)) url.searchParams.set(k, String(v));
  url.searchParams.set("pagina", String(numero));
  url.searchParams.set("tamanho_da_pagina", String(TAMANHO_DA_PAGINA));

  let ultimo = "";
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    if (tentativa) await new Promise((r) => setTimeout(r, 800 * tentativa));
    try {
      const resposta = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      // 422 é o serviço recusando a consulta: repetir dá o mesmo.
      if (resposta.status === 422) throw new FalhaTransferegov(`Transferegov recusou a consulta a ${caminho}`);
      if (!resposta.ok) {
        ultimo = `Transferegov respondeu ${resposta.status}`;
        continue;
      }
      const corpo = (await resposta.json()) as Partial<Envelope<T>>;
      if (!Array.isArray(corpo.data) || typeof corpo.total_items !== "number") {
        ultimo = "Transferegov respondeu fora do formato";
        continue;
      }
      return corpo as Envelope<T>;
    } catch (e) {
      if (e instanceof FalhaTransferegov) throw e;
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
        throw new FalhaTransferegov("Transferegov não respondeu a tempo");
      }
      ultimo = "Transferegov fora do ar";
    }
  }
  throw new FalhaTransferegov(ultimo || "Transferegov fora do ar");
}

/** Todas as linhas de uma consulta, até `limite`. */
export async function linhasDoTransferegov<T>(
  caminho: string,
  filtros: Record<string, string | number>,
  limite = 1_000
): Promise<T[]> {
  const primeira = await pagina<T>(caminho, filtros, 1);
  const linhas = [...primeira.data];
  const paginas = Math.min(primeira.total_pages || 1, Math.ceil(limite / TAMANHO_DA_PAGINA));
  for (let n = 2; n <= paginas; n++) linhas.push(...(await pagina<T>(caminho, filtros, n)).data);
  return linhas.slice(0, limite);
}

/** Roda tarefas com no máximo `n` ao mesmo tempo (o serviço limita requisições). */
export async function emParalelo<T, R>(itens: T[], n: number, fazer: (item: T) => Promise<R>): Promise<R[]> {
  const saida: R[] = new Array(itens.length);
  let proximo = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, itens.length) }, async () => {
      while (proximo < itens.length) {
        const i = proximo++;
        saida[i] = await fazer(itens[i]);
      }
    })
  );
  return saida;
}
