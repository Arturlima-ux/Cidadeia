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

import { procurarMunicipioLocal } from "@/lib/municipios";

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


export type ResultadoBuscaMunicipio =
  | { ok: true; codigo: string; nome: string }
  /** Não está na tabela do IBGE para essa UF. Sugestões: nomes parecidos. */
  | { ok: false; motivo: "nao_encontrado"; sugestoes: string[] };

/**
 * Procura o município pelo nome + UF — na tabela local, sem rede.
 *
 * Consultava o IBGE a cada chamada, e quando o IBGE não respondia a tela
 * dizia "esse município não existe" (Barro Duro/PI, que existe). A tabela
 * completa do Brasil vive em src/dados/municipios.json (ver lib/municipios).
 * Continua async por compatibilidade com quem já chamava.
 */
export async function procurarMunicipio(municipio: string, uf: string): Promise<ResultadoBuscaMunicipio> {
  const r = procurarMunicipioLocal(municipio, uf);
  if (r.ok) return { ok: true, codigo: r.municipio.codigo, nome: r.municipio.nome };
  return { ok: false, motivo: "nao_encontrado", sugestoes: r.motivo === "nao_encontrado" ? r.sugestoes : [] };
}

/** Código IBGE a partir do nome + UF. Null quando não encontra. */
export async function buscarCodigoIbge(municipio: string, uf: string): Promise<string | null> {
  const r = await procurarMunicipio(municipio, uf);
  return r.ok ? r.codigo : null;
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

// ── CONFERÊNCIA DE ENTREGA (RREO) ──
//
// O que separa um calendário de obrigações de uma agenda de papel: aqui dá
// para saber se a entrega ACONTECEU. Os dois relatórios são publicados na
// mesma API aberta, por exercício e período — se o período esperado não volta
// de lá, é porque não foi enviado, e o alerta se apaga sozinho no dia em que
// a publicação aparece.
//
// SIOPS e SIOPE não têm consulta pública equivalente. Continuam como lembrete
// de data, e a tela precisa dizer qual é qual: afirmar entrega que não
// verificamos seria pior do que não afirmar nada.

/**
 * O parâmetro `nr_periodo` é obrigatório: sem ele a consulta volta vazia, o
 * que seria indistinguível de "não entregou". Por isso a verificação é uma
 * chamada por período, com pausa entre elas — a API é aberta e gratuita, e
 * martelá-la seria abusar de infraestrutura pública.
 */
const PAUSA_SICONFI_MS = 900;

/** Só o suficiente para saber se existe registro; não lemos o conteúdo. */
const LIMITE_SONDAGEM = 1;

function aguardar(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function periodoFoiEntregue(
  url: string,
  parametros: Record<string, string>
): Promise<boolean | null> {
  const query = new URLSearchParams({ ...parametros, limit: String(LIMITE_SONDAGEM) });
  try {
    const resposta = await fetch(`${url}?${query}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!resposta.ok) return null;
    const json = (await resposta.json()) as { items?: unknown[] };
    return (json.items?.length ?? 0) > 0;
  } catch {
    // Null e false querem dizer coisas diferentes, e a diferença é o ponto:
    // false é "o Tesouro não tem esse período"; null é "não conseguimos
    // perguntar". Colapsar os dois faria um timeout nosso virar acusação de
    // atraso contra a prefeitura.
    return null;
  }
}

export type EntregaConferida = {
  /** Chave no formato `${obrigacao}:${numero}`, como o calendário espera. */
  chave: string;
  entregue: boolean;
};

export type ResultadoConferenciaEntregas = {
  entregues: Set<string>;
  /** Períodos que não conseguimos consultar — a tela não deve chamá-los de atraso. */
  inconclusivos: string[];
};

/**
 * Confere, no Tesouro, quais RREO do exercício já foram publicados.
 *
 * Só o RREO: o endpoint de RGF do Tesouro devolve zero registro para todos os
 * municípios testados, e uma conferência que sempre responde "não entregue"
 * acusaria de falha quem cumpriu. Ver o comentário em obrigacoes-fiscais.ts.
 */
export async function conferirEntregasSiconfi(
  codigoIbge: string,
  exercicio: number,
  opcoes: { periodosRreo: number[] }
): Promise<ResultadoConferenciaEntregas> {
  const entregues = new Set<string>();
  const inconclusivos: string[] = [];
  let primeira = true;

  const sondagens: { chave: string; url: string; parametros: Record<string, string> }[] = [
    ...opcoes.periodosRreo.map((n) => ({
      chave: `rreo:${n}`,
      url: URL_SICONFI,
      parametros: {
        an_exercicio: String(exercicio),
        nr_periodo: String(n),
        co_tipo_demonstrativo: "RREO",
        no_anexo: "RREO-Anexo 02",
        id_ente: codigoIbge,
      },
    })),
  ];

  for (const sondagem of sondagens) {
    if (!primeira) await aguardar(PAUSA_SICONFI_MS);
    primeira = false;

    const resultado = await periodoFoiEntregue(sondagem.url, sondagem.parametros);
    if (resultado === true) entregues.add(sondagem.chave);
    else if (resultado === null) inconclusivos.push(sondagem.chave);
  }

  return { entregues, inconclusivos };
}
