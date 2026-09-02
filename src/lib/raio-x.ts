import { buscarCodigoIbge, agregarPorSecretaria, type LinhaSiconfi } from "@/lib/siconfi";
import { periodosDoExercicio } from "@/lib/obrigacoes-fiscais";

// ── RAIO-X DO MUNICÍPIO ──
//
// Uma página pública onde o visitante digita o nome da cidade e a tela enche
// de números REAIS dela, sem cadastro e sem ninguém digitar dado nenhum.
//
// O argumento de venda do CidadeIA é "não peça fé, confira". Esta peça leva
// isso ao extremo: antes de o prefeito nos contar qualquer coisa, mostramos o
// que já se sabe sobre a prefeitura dele — de fonte pública, com a origem
// escrita ao lado de cada número.
//
// ── POR QUE SÓ TESOURO E IBGE ──
//
// O PNCP entraria bem aqui, mas limita requisição com muita facilidade —
// chegamos ao bloqueio durante o desenvolvimento com poucas chamadas. Numa
// página aberta ao público, que qualquer um pode recarregar, isso viraria erro
// constante. A conferência do PNCP fica onde ela funciona: dentro do produto,
// sob demanda e com limite por prefeitura.

const URL_SICONFI_RREO = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rreo";
const TIMEOUT_MS = 25000;

/** Coluna do RREO que representa dinheiro efetivamente aplicado. */
const COLUNA_LIQUIDADA = "DESPESAS LIQUIDADAS ATÉ O BIMESTRE (d)";
/** Coluna do Anexo 01 com a receita realizada no acumulado. */
const COLUNA_RECEITA = "Até o Bimestre (c)";

export type FonteDado = "Tesouro Nacional · SICONFI" | "IBGE";

export type NumeroComFonte = {
  valor: number | null;
  fonte: FonteDado;
  /** O que exatamente foi consultado. Aparece na tela ao lado do número. */
  detalhe: string;
};

export type RaioX = {
  municipio: string;
  uf: string;
  codigoIbge: string;
  exercicio: number;
  /** Bimestre mais recente com dado publicado. Null quando nada foi publicado. */
  bimestreReferencia: number | null;
  receita: NumeroComFonte;
  despesaSaude: NumeroComFonte;
  despesaEducacao: NumeroComFonte;
  despesaObras: NumeroComFonte;
  /** Bimestres do exercício já encerrados. */
  rreoEsperados: number;
  /** Quantos desses constam publicados no Tesouro. */
  rreoEntregues: number;
  /** Bimestres encerrados que NÃO constam. É o achado que dói. */
  rreoFaltando: number[];
  consultadoEm: string;
};

export type ResultadoRaioX =
  | { ok: true; raioX: RaioX }
  | { ok: false; erro: string; municipioNaoEncontrado: boolean };

async function buscarRreo(
  codigoIbge: string,
  exercicio: number,
  periodo: number,
  anexo: string
): Promise<LinhaSiconfi[] | null> {
  const url =
    `${URL_SICONFI_RREO}?an_exercicio=${exercicio}&nr_periodo=${periodo}` +
    `&co_tipo_demonstrativo=RREO&no_anexo=${encodeURIComponent(anexo)}&id_ente=${codigoIbge}`;
  try {
    const resposta = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!resposta.ok) return null;
    const json = (await resposta.json()) as { items?: LinhaSiconfi[] };
    return json.items ?? [];
  } catch {
    // Null significa "não conseguimos perguntar" e é diferente de lista vazia,
    // que significa "o Tesouro não tem". A tela precisa dos dois separados para
    // não chamar de omissão o que foi falha nossa de rede.
    return null;
  }
}

/**
 * Soma as linhas de receita do Anexo 01.
 *
 * Função pura: é onde mora a leitura do formato do Tesouro, e é o que os
 * testes cobrem.
 */
export function extrairReceita(linhas: LinhaSiconfi[]): number | null {
  const total = linhas.find(
    (l) =>
      l.coluna === COLUNA_RECEITA &&
      /^RECEITAS \(EXCETO INTRA/i.test(l.conta.trim())
  );
  return total ? total.valor : null;
}

/**
 * Bimestres do exercício que já se encerraram.
 *
 * Consultar bimestre ainda aberto gastaria chamada para receber, corretamente,
 * um vazio que não significa atraso nenhum.
 */
export function bimestresEncerrados(exercicio: number, hoje: Date = new Date()): number[] {
  const hojeIso = hoje.toISOString().slice(0, 10);
  return periodosDoExercicio(exercicio)
    .filter((p) => p.obrigacao.chave === "rreo" && p.fimDoPeriodo <= hojeIso)
    .map((p) => p.numero);
}

const PAUSA_MS = 700;
const aguardar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Monta o raio-X consultando o Tesouro.
 *
 * A ordem importa: primeiro descobrimos quais bimestres já se encerraram e
 * quais deles foram publicados, depois puxamos os valores do bimestre mais
 * recente que EXISTE. Pedir o último bimestre do ano em março devolveria vazio
 * e a tela mostraria zero — que é diferente de "ainda não fechou".
 */
export async function montarRaioX(
  municipio: string,
  uf: string,
  exercicio: number = new Date().getFullYear()
): Promise<ResultadoRaioX> {
  const codigoIbge = await buscarCodigoIbge(municipio, uf);
  if (!codigoIbge) {
    return {
      ok: false,
      erro: `Não encontramos "${municipio}" em ${uf.toUpperCase()}. Confira a grafia e a sigla do estado.`,
      municipioNaoEncontrado: true,
    };
  }

  const esperados = bimestresEncerrados(exercicio);

  // Do mais recente para o mais antigo: o primeiro que tiver dado é o que
  // alimenta os valores da tela.
  const entregues: number[] = [];
  let linhasDespesa: LinhaSiconfi[] | null = null;
  let bimestreReferencia: number | null = null;
  let primeira = true;

  for (const bimestre of [...esperados].reverse()) {
    if (!primeira) await aguardar(PAUSA_MS);
    primeira = false;

    const linhas = await buscarRreo(codigoIbge, exercicio, bimestre, "RREO-Anexo 02");
    if (linhas === null) continue;
    if (linhas.length === 0) continue;

    entregues.push(bimestre);
    if (linhasDespesa === null) {
      linhasDespesa = linhas;
      bimestreReferencia = bimestre;
    }
  }

  let receita: number | null = null;
  if (bimestreReferencia !== null) {
    await aguardar(PAUSA_MS);
    const linhasReceita = await buscarRreo(
      codigoIbge,
      exercicio,
      bimestreReferencia,
      "RREO-Anexo 01"
    );
    if (linhasReceita) receita = extrairReceita(linhasReceita);
  }

  const porSecretaria = linhasDespesa
    ? agregarPorSecretaria(linhasDespesa.filter((l) => l.coluna === COLUNA_LIQUIDADA))
    : [];
  const valorDe = (area: "saude" | "educacao" | "obras") =>
    porSecretaria.find((d) => d.secretaria === area)?.valor ?? null;

  const detalhe =
    bimestreReferencia !== null
      ? `RREO do ${bimestreReferencia}º bimestre de ${exercicio}`
      : `Nenhum RREO de ${exercicio} publicado`;

  return {
    ok: true,
    raioX: {
      municipio,
      uf: uf.toUpperCase(),
      codigoIbge,
      exercicio,
      bimestreReferencia,
      receita: { valor: receita, fonte: "Tesouro Nacional · SICONFI", detalhe },
      despesaSaude: {
        valor: valorDe("saude"),
        fonte: "Tesouro Nacional · SICONFI",
        detalhe: `${detalhe} · função Saúde`,
      },
      despesaEducacao: {
        valor: valorDe("educacao"),
        fonte: "Tesouro Nacional · SICONFI",
        detalhe: `${detalhe} · função Educação`,
      },
      despesaObras: {
        valor: valorDe("obras"),
        fonte: "Tesouro Nacional · SICONFI",
        detalhe: `${detalhe} · Urbanismo, Saneamento e Transporte`,
      },
      rreoEsperados: esperados.length,
      rreoEntregues: entregues.length,
      rreoFaltando: esperados.filter((b) => !entregues.includes(b)),
      consultadoEm: new Date().toISOString(),
    },
  };
}

/**
 * Percentual aplicado numa área sobre a receita, quando os dois números
 * existem. Serve de indício, nunca de cálculo oficial: a base legal do mínimo
 * não é a receita total, e dizer o contrário seria inventar conformidade.
 */
export function proporcaoDaReceita(despesa: number | null, receita: number | null): number | null {
  if (despesa === null || receita === null || receita <= 0) return null;
  return (despesa / receita) * 100;
}
