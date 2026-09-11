// ── POPULAÇÃO PELO IBGE ──
//
// O simulador de preço pedia o porte do município ("até 10 mil", "10 a 50
// mil", "acima") e a pessoa precisava saber a população de cabeça. O IBGE
// publica a estimativa anual por município (agregado 6579, variável 9324),
// sem cadastro. Com o nome do município, o porte se marca sozinho.
//
// Falha em silêncio: se o IBGE não responder, o simulador continua com a
// escolha manual, que sempre funcionou.

const URL_POPULACAO =
  "https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324";

type RespostaAgregado = {
  resultados?: { series?: { serie?: Record<string, string> }[] }[];
}[];

/** Lê o último valor da série. Separado da rede para ser testável. */
export function extrairPopulacao(json: unknown): number | null {
  const serie = (json as RespostaAgregado)?.[0]?.resultados?.[0]?.series?.[0]?.serie;
  if (!serie) return null;
  const anos = Object.keys(serie).sort();
  const ultimo = anos[anos.length - 1];
  const valor = ultimo ? Number(serie[ultimo]) : NaN;
  return Number.isFinite(valor) && valor > 0 ? valor : null;
}

export async function buscarPopulacao(codigoIbge: string): Promise<number | null> {
  try {
    const r = await fetch(`${URL_POPULACAO}?localidades=N6[${codigoIbge}]`, {
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!r.ok) return null;
    return extrairPopulacao(await r.json());
  } catch (e) {
    console.error("[IBGE] falha ao buscar população:", e);
    return null;
  }
}

const URL_MUNICIPIO = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios";

export type MunicipioIbge = { codigo: string; nome: string; uf: string; populacao: number };

/** Código IBGE de município: sete dígitos. Tudo que não for isso é ignorado. */
export function ehCodigoIbge(v: unknown): v is string {
  return typeof v === "string" && /^\d{7}$/.test(v);
}

/**
 * Código → nome, UF e população, tudo do IBGE.
 *
 * É o que torna o porte inviolável: o pedido de proposta leva só o código,
 * e o servidor pergunta ao IBGE de novo. Não existe parâmetro de URL que
 * diga "sou de 10 mil habitantes" — o IBGE é que diz.
 */
export async function buscarMunicipioPorCodigo(codigo: string): Promise<MunicipioIbge | null> {
  if (!ehCodigoIbge(codigo)) return null;
  try {
    const [r, populacao] = await Promise.all([
      fetch(`${URL_MUNICIPIO}/${codigo}`, {
        signal: AbortSignal.timeout(8_000),
        next: { revalidate: 60 * 60 * 24 * 30 },
      }),
      buscarPopulacao(codigo),
    ]);
    if (!r.ok || populacao === null) return null;
    const j = (await r.json()) as {
      nome?: string;
      microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } };
      "regiao-imediata"?: { "regiao-intermediaria"?: { UF?: { sigla?: string } } };
    };
    const uf =
      j.microrregiao?.mesorregiao?.UF?.sigla ?? j["regiao-imediata"]?.["regiao-intermediaria"]?.UF?.sigla;
    if (!j.nome || !uf) return null;
    return { codigo, nome: j.nome, uf, populacao };
  } catch (e) {
    console.error("[IBGE] falha ao buscar município por código:", e);
    return null;
  }
}
