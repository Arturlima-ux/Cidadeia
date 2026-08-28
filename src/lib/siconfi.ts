/**
 * Integração com o SICONFI (Tesouro Nacional) — dado fiscal REAL e público.
 *
 * Por que SICONFI e não SIAFI: o SIAFI é do governo FEDERAL, município não
 * usa. Todo município é obrigado por lei (LRF / LC 131) a enviar o RREO
 * (Relatório Resumido de Execução Orçamentária) ao Tesouro, e esse dado é
 * publicado numa API aberta, sem autenticação. É a única fonte padronizada
 * que funciona igual para os 5.570 municípios.
 *
 * O que trazemos: RREO Anexo 02 = despesa por função. A coluna usada é
 * "DESPESAS LIQUIDADAS ATÉ O BIMESTRE", ou seja, dinheiro cujo serviço já
 * foi entregue e conferido — a medida mais honesta de "foi aplicado de
 * fato". Empenhado é só compromisso; pago pode faltar liquidação.
 */

const URL_IBGE = "https://servicodados.ibge.gov.br/api/v1/localidades/estados";
const URL_SICONFI = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo";
const TIMEOUT_MS = 25000;
const COLUNA_LIQUIDADA = "DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)";

/**
 * Funções orçamentárias (classificação da Portaria MOG 42/1999) mapeadas
 * para os módulos do CidadeIA.
 *
 * Licitações NÃO aparece aqui de propósito: licitação é um *processo*, não
 * uma função orçamentária — não existe "função Licitações" no orçamento
 * público. Somar qualquer coisa ali seria inventar número.
 */
export const MAPA_FUNCAO: Record<string, "saude" | "educacao" | "obras"> = {
  Saúde: "saude",
  Educação: "educacao",
  Urbanismo: "obras",
  Saneamento: "obras",
  Transporte: "obras",
};

export type LinhaSiconfi = {
  conta: string;
  coluna: string;
  cod_conta: string;
  valor: number;
};

export type DespesaImportada = {
  secretaria: "saude" | "educacao" | "obras";
  valor: number;
  funcoes: string[];
};

/**
 * Converte as linhas cruas do SICONFI em totais por secretaria.
 * Função pura — é onde mora a regra de negócio, então é o que os testes cobrem.
 */
export function agregarPorSecretaria(linhas: LinhaSiconfi[]): DespesaImportada[] {
  const acumulado = new Map<string, { valor: number; funcoes: Set<string> }>();

  for (const linha of linhas) {
    if (linha.coluna !== COLUNA_LIQUIDADA) continue;
    // "Intra" são transferências entre órgãos do próprio município — somar
    // junto contaria o mesmo real duas vezes.
    if (linha.cod_conta !== "RREO2TotalDespesas") continue;

    const secretaria = MAPA_FUNCAO[linha.conta];
    if (!secretaria) continue;
    if (typeof linha.valor !== "number" || !Number.isFinite(linha.valor)) continue;
    if (linha.valor <= 0) continue;

    const atual = acumulado.get(secretaria) ?? { valor: 0, funcoes: new Set<string>() };
    atual.valor += linha.valor;
    atual.funcoes.add(linha.conta);
    acumulado.set(secretaria, atual);
  }

  return [...acumulado.entries()].map(([secretaria, v]) => ({
    secretaria: secretaria as DespesaImportada["secretaria"],
    valor: v.valor,
    funcoes: [...v.funcoes].sort(),
  }));
}

/** Bimestre (1-6) -> competência AAAA-MM do último mês daquele bimestre. */
export function competenciaDoBimestre(ano: number, bimestre: number): string {
  const mes = Math.min(12, bimestre * 2);
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

async function buscarJson(url: string): Promise<unknown> {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TIMEOUT_MS);
  try {
    const resposta = await fetch(url, { signal: controle.signal });
    if (!resposta.ok) {
      throw new Error(`resposta ${resposta.status}`);
    }
    return await resposta.json();
  } finally {
    clearTimeout(timer);
  }
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (marcas combinantes do NFD)
    .trim()
    .toLowerCase();
}

/** Descobre o código IBGE a partir do nome do município + UF. */
export async function buscarCodigoIbge(
  municipio: string,
  uf: string
): Promise<string | null> {
  try {
    const dados = (await buscarJson(`${URL_IBGE}/${uf.toUpperCase()}/municipios`)) as {
      id: number;
      nome: string;
    }[];
    const alvo = normalizar(municipio);
    const achado = dados.find((m) => normalizar(m.nome) === alvo);
    return achado ? String(achado.id) : null;
  } catch (e) {
    console.error("[SICONFI] falha ao buscar código IBGE:", e);
    return null;
  }
}

export type ResultadoSiconfi =
  | { ok: true; despesas: DespesaImportada[]; instituicao: string | null }
  | { ok: false; erro: string };

/** Busca o RREO Anexo 02 do município e agrega por secretaria. */
export async function buscarDespesasSiconfi(
  codigoIbge: string,
  ano: number,
  bimestre: number
): Promise<ResultadoSiconfi> {
  const url =
    `${URL_SICONFI}?an_exercicio=${ano}&nr_periodo=${bimestre}` +
    `&co_tipo_demonstrativo=RREO&no_anexo=RREO-Anexo%2002&co_esfera=M&id_ente=${codigoIbge}`;

  let bruto: { items?: (LinhaSiconfi & { instituicao?: string })[] };
  try {
    bruto = (await buscarJson(url)) as typeof bruto;
  } catch (e) {
    console.error("[SICONFI] falha na consulta:", e);
    return {
      ok: false,
      erro: "Não foi possível consultar o Tesouro Nacional agora. Tente novamente em instantes.",
    };
  }

  const itens = bruto.items ?? [];
  if (itens.length === 0) {
    return {
      ok: false,
      erro: `O Tesouro Nacional não tem RREO publicado para este município no ${bimestre}º bimestre de ${ano}. Tente um período anterior.`,
    };
  }

  const despesas = agregarPorSecretaria(itens);
  if (despesas.length === 0) {
    return {
      ok: false,
      erro: "O relatório foi encontrado, mas não trouxe despesa liquidada em Saúde, Educação ou infraestrutura nesse período.",
    };
  }

  return { ok: true, despesas, instituicao: itens[0]?.instituicao ?? null };
}
