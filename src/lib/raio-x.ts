import { buscarCodigoIbge, agregarPorSecretaria, type LinhaSiconfi } from "@/lib/siconfi";
import { periodosDoExercicio } from "@/lib/obrigacoes-fiscais";
import { cacheDoPeriodo, consultarTipos, enteNoTesouro, SEM_PREFEITURA, TIPOS_RREO } from "@/lib/siconfi-tipos";
import { itensDoTesouro } from "@/lib/tesouro-http";

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
  /** Bimestres do exercício com prazo de publicação vencido. */
  rreoEsperados: number;
  /** Quantos desses constam publicados no Tesouro. */
  rreoEntregues: number;
  /**
   * Bimestres com prazo vencido que o Tesouro, perguntado, disse não ter (nem
   * no RREO comum nem no simplificado). É o achado que dói, então só entra
   * aqui o que foi efetivamente confirmado.
   */
  rreoFaltando: number[];
  /** Bimestres que não conseguimos consultar. Não são achado sobre ninguém. */
  rreoSemResposta: number[];
  consultadoEm: string;
};

export type ResultadoRaioX =
  | { ok: true; raioX: RaioX }
  | {
      ok: false;
      erro: string;
      municipioNaoEncontrado: boolean;
      /** Lugar sem prefeitura própria (lib/siconfi-tipos.ts): `erro` traz o motivo. */
      semPrefeitura?: boolean;
    };

/** RREO comum ou simplificado, o que o município tiver entregue (lib/siconfi-tipos.ts). */
function buscarRreo(
  codigoIbge: string,
  exercicio: number,
  periodo: number,
  anexo: string
): Promise<LinhaSiconfi[] | null> {
  return consultarTipos(TIPOS_RREO, (tipo) => buscarRreoDoTipo(codigoIbge, exercicio, periodo, anexo, tipo));
}

async function buscarRreoDoTipo(
  codigoIbge: string,
  exercicio: number,
  periodo: number,
  anexo: string,
  tipo: string
): Promise<LinhaSiconfi[] | null> {
  const url =
    `${URL_SICONFI_RREO}?an_exercicio=${exercicio}&nr_periodo=${periodo}` +
    `&co_tipo_demonstrativo=${encodeURIComponent(tipo)}&no_anexo=${encodeURIComponent(anexo)}&id_ente=${enteNoTesouro(codigoIbge).id}`;
  // Null significa "não conseguimos perguntar" e é diferente de lista vazia,
  // que significa "o Tesouro não tem". A tela precisa dos dois separados para
  // não chamar de omissão o que foi falha nossa de rede. Cache: 6 h para
  // bimestre recente, 7 dias para os antigos (ver cacheDoPeriodo).
  return itensDoTesouro<LinhaSiconfi>(url, cacheDoPeriodo(exercicio, periodo * 2));
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

/**
 * Bimestres cujo PRAZO de publicação já passou (30 dias após o fim, LRF art.
 * 52).
 *
 * É só destes que se pode dizer "não consta publicado" como achado. O
 * bimestre que acabou ontem ainda está dentro do prazo, e chamá-lo de
 * faltante acusaria de atraso a prefeitura que está em dia.
 */
export function bimestresVencidos(exercicio: number, hoje: Date = new Date()): number[] {
  const hojeIso = hoje.toISOString().slice(0, 10);
  return periodosDoExercicio(exercicio)
    .filter((p) => p.obrigacao.chave === "rreo" && p.vencimento < hojeIso)
    .map((p) => p.numero);
}

// ── POR QUE AS CONSULTAS SAEM JUNTAS ──
//
// Eram em fila: um bimestre, pausa de 700 ms, outro bimestre, pausa… e no
// fim a receita. Com quatro bimestres encerrados dava cinco chamadas ao
// SICONFI (1 a 2 s cada) mais três segundos parados — 8 a 10 s na primeira
// visita de cada município. Buscador não espera isso; visitante também não.
//
// Agora os bimestres saem quase ao mesmo tempo, com 150 ms entre um e
// outro para não bater no Tesouro como rajada, e a receita do bimestre mais
// recente sai junto (é ele o de referência na maioria dos casos; se não for,
// uma chamada a mais). O tempo cai para o de UMA chamada, mais o escalonado.
const ESCALONAMENTO_MS = 150;
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

  if (SEM_PREFEITURA[codigoIbge]) {
    return { ok: false, erro: SEM_PREFEITURA[codigoIbge], municipioNaoEncontrado: false, semPrefeitura: true };
  }

  // Os valores vêm de qualquer bimestre encerrado (um publicado antes do prazo
  // é dado bom); a cobrança de entrega, só dos que já venceram.
  const encerrados = bimestresEncerrados(exercicio);
  const vencidos = bimestresVencidos(exercicio);

  // Do mais recente para o mais antigo: o primeiro que tiver dado é o que
  // alimenta os valores da tela. As consultas saem escalonadas e são lidas
  // na ordem, o que preserva exatamente a mesma decisão de antes.
  const doMaisRecente = [...encerrados].reverse();
  const maisRecente = doMaisRecente[0] ?? null;

  const consultas = doMaisRecente.map(async (bimestre, i) => {
    if (i > 0) await aguardar(ESCALONAMENTO_MS * i);
    return { bimestre, linhas: await buscarRreo(codigoIbge, exercicio, bimestre, "RREO-Anexo 02") };
  });
  // Receita otimista: do bimestre mais recente, em paralelo com o resto.
  const receitaOtimista =
    maisRecente !== null
      ? (async () => {
          await aguardar(ESCALONAMENTO_MS * doMaisRecente.length);
          return buscarRreo(codigoIbge, exercicio, maisRecente, "RREO-Anexo 01");
        })()
      : Promise.resolve(null);

  const resultados = await Promise.all(consultas);

  const entregues: number[] = [];
  // Falha nossa de rede não pode virar "não consta publicado": era o que
  // acontecia, porque o bimestre sem resposta caía em `rreoFaltando`.
  const semResposta: number[] = [];
  let linhasDespesa: LinhaSiconfi[] | null = null;
  let bimestreReferencia: number | null = null;
  for (const { bimestre, linhas } of resultados) {
    if (linhas === null) {
      semResposta.push(bimestre);
      continue;
    }
    if (linhas.length === 0) continue;
    entregues.push(bimestre);
    if (linhasDespesa === null) {
      linhasDespesa = linhas;
      bimestreReferencia = bimestre;
    }
  }

  // Nenhum bimestre com dado e algum que não respondeu: não dá para dizer
  // "nada publicado". Sem esta saída, a home e o morador liam "nenhum
  // relatório consta no Tesouro" numa visita em que o Tesouro estava fora.
  if (bimestreReferencia === null && semResposta.length > 0) {
    void receitaOtimista.catch(() => null);
    return {
      ok: false,
      erro: "O Tesouro Nacional não respondeu agora. Isso não diz nada sobre a prefeitura. Tente de novo em alguns minutos.",
      municipioNaoEncontrado: false,
    };
  }

  let receita: number | null = null;
  if (bimestreReferencia !== null) {
    const linhasReceita =
      bimestreReferencia === maisRecente
        ? await receitaOtimista
        : await buscarRreo(codigoIbge, exercicio, bimestreReferencia, "RREO-Anexo 01");
    if (linhasReceita) receita = extrairReceita(linhasReceita);
  } else {
    // Ninguém lê o resultado, mas a promessa não pode ficar sem tratamento.
    void receitaOtimista.catch(() => null);
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
      rreoEsperados: vencidos.length,
      rreoEntregues: vencidos.filter((b) => entregues.includes(b)).length,
      rreoFaltando: vencidos.filter((b) => !entregues.includes(b) && !semResposta.includes(b)),
      rreoSemResposta: vencidos.filter((b) => semResposta.includes(b)),
      consultadoEm: new Date().toISOString(),
    },
  };
}

// proporcaoDaReceita mora em lib/raio-x-calculo.ts: o formulário (cliente)
// precisa dela, e importar daqui arrastava siconfi.ts e a tabela de
// municípios para o navegador. Reexportada para quem já importava daqui.
export { proporcaoDaReceita } from "@/lib/raio-x-calculo";
