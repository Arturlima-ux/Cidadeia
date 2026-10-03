import type { PeriodoRgf, ResultadoRgf } from "@/lib/siconfi-rgf";
import type { ResultadoRaioX } from "@/lib/raio-x";
import { proporcaoDaReceita } from "@/lib/raio-x-calculo";
import { RESSALVA_MINIMOS } from "@/lib/raio-x-texto";
import { formatarMoeda } from "@/lib/formatadores";

// ── OS TRÊS FATOS QUE ABREM A PÁGINA ──
//
// A home afirma que o Tribunal de Contas já está contando, e prova no
// município de quem está lendo. Prova com três fatos, nesta ordem de dureza:
//
//   1. a despesa com pessoal, confrontada com o limite que a PRÓPRIA
//      prefeitura declarou no mesmo documento;
//   2. quanto foi para saúde e educação, com a ressalva de que percentual da
//      receita não é cálculo de mínimo constitucional;
//   3. quais relatórios obrigatórios não constam publicados.
//
// ── POR QUE O LIMITE NÃO É CALCULADO AQUI ──
//
// O RGF Anexo 01 publica, no mesmo arquivo, a despesa e os três limites. Usar
// o limite declarado em vez de aplicar 54% sobre a RCL tira da mesa a única
// discussão que um procurador poderia abrir: "a conta de vocês está errada".
// Não é a nossa conta contra o número dele. São os dois números dele.
//
// ── AUSÊNCIA É ACHADO, NÃO ERRO ──
//
// Município sem RGF publicado não é falha da página: é a informação. Por isso
// `ausencia` é um campo com texto próprio, e não uma mensagem de erro — e por
// isso "não publicado" e "publicado em branco" têm frases diferentes. Um é
// omissão de entrega, o outro é omissão de conteúdo, e tratar os dois igual
// acusaria de não publicar quem publicou.

export type Carimbo = {
  /** O período que o dado mede: "RGF do 2º quadrimestre de 2026". */
  periodo: string;
  /** Quando o sistema consultou. Sem hora — ver `dataSemHora`. */
  consultadoEm: string;
};

export type Fato = {
  chave: "pessoal" | "aplicacao" | "relatorios";
  titulo: string;
  /** O número, já formatado. Null quando não há dado. */
  valor: string | null;
  /** A leitura em uma frase. Null quando não há dado. */
  leitura: string | null;
  /** O que impede a leitura. É achado, não erro. */
  ausencia: string | null;
  fundamento: string;
  fonte: string;
  carimbo: Carimbo | null;
  ressalva: string | null;
};

const FONTE_TESOURO = "Tesouro Nacional · SICONFI";

function pct(v: number): string {
  return `${v.toFixed(2).replace(".", ",")}%`;
}

/**
 * Data sem hora.
 *
 * O SICONFI publica por bimestre e por quadrimestre; o dado chega com meses de
 * atraso. Carimbar a consulta com hora sugeriria atualização horária, que é a
 * afirmação mais rápida de perder um contador.
 */
function dataSemHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "data indefinida";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza" }).format(d);
}

const ORDINAL = ["", "1º", "2º", "3º", "4º", "5º", "6º"];

/** "RGF do 2º quadrimestre de 2026" */
export function rotuloDoPeriodoRgf(p: PeriodoRgf): string {
  const unidade = p.periodicidade === "S" ? "semestre" : "quadrimestre";
  return `RGF do ${ORDINAL[p.periodo] ?? `${p.periodo}º`} ${unidade} de ${p.exercicio}`;
}

// ── 1. DESPESA COM PESSOAL ──

const FUNDAMENTO_PESSOAL =
  "Limite de alerta da Lei de Responsabilidade Fiscal, art. 59, § 1º, IV. " +
  "O teto é do art. 20, III, “b” da Lei Complementar 101/2000.";

export function fatoDoPessoal(rgf: ResultadoRgf, consultadoEm: string): Fato {
  const base = {
    chave: "pessoal" as const,
    titulo: "Despesa com pessoal",
    fundamento: FUNDAMENTO_PESSOAL,
    fonte: `${FONTE_TESOURO} · RGF Anexo 01`,
    ressalva: null,
  };

  if (!rgf.ok) {
    return {
      ...base,
      valor: null,
      leitura: null,
      carimbo: null,
      // Duas ausências diferentes, duas frases diferentes.
      ausencia: /sem os valores/i.test(rgf.erro)
        ? "O RGF foi publicado, mas sem os valores de despesa com pessoal. A entrega aconteceu; o conteúdo, não."
        : "Nenhum RGF deste município consta publicado no Tesouro nos últimos períodos. Sem ele não há como saber de que lado do limite a prefeitura está.",
    };
  }

  const d = rgf.dados;
  const percentual = (d.despesaTotal / d.rclAjustada) * 100;

  // O limite declarado, quando existe, é o que manda. Sem ele a frase fala só
  // do que foi declarado — nunca de um limite de R$ 0.
  const alerta = d.limiteAlerta;
  const leitura =
    alerta !== null
      ? `${formatarMoeda(d.despesaTotal)} sobre uma receita corrente líquida de ` +
        `${formatarMoeda(d.rclAjustada)}. O limite de alerta que a própria prefeitura declarou ` +
        `no mesmo documento é ${pct((alerta / d.rclAjustada) * 100)}.`
      : `${formatarMoeda(d.despesaTotal)} sobre uma receita corrente líquida de ` +
        `${formatarMoeda(d.rclAjustada)}. O anexo publicado não trouxe a linha do limite, ` +
        `então aqui fica só o que a prefeitura declarou ter gasto.`;

  return {
    ...base,
    valor: pct(percentual),
    leitura,
    ausencia: null,
    carimbo: { periodo: rotuloDoPeriodoRgf(d.periodo), consultadoEm: dataSemHora(consultadoEm) },
  };
}

// ── 2. APLICAÇÃO EM SAÚDE E EDUCAÇÃO ──

export function fatoDaAplicacao(raioX: ResultadoRaioX, consultadoEm: string): Fato {
  const base = {
    chave: "aplicacao" as const,
    titulo: "Aplicação em saúde e educação",
    fundamento:
      "Art. 212 da Constituição Federal (educação) e art. 7º da Lei Complementar 141/2012 (saúde).",
    fonte: `${FONTE_TESOURO} · RREO`,
    ressalva: RESSALVA_MINIMOS,
  };

  if (!raioX.ok) {
    return {
      ...base,
      valor: null,
      leitura: null,
      carimbo: null,
      ausencia: "Não foi possível ler o RREO deste município no Tesouro agora.",
    };
  }

  const r = raioX.raioX;
  if (r.bimestreReferencia === null) {
    return {
      ...base,
      valor: null,
      leitura: null,
      carimbo: null,
      ausencia:
        "Nenhum bimestre do exercício consta publicado no Tesouro, então não há despesa a ler.",
    };
  }

  const ps = proporcaoDaReceita(r.despesaSaude.valor, r.receita.valor);
  const pe = proporcaoDaReceita(r.despesaEducacao.valor, r.receita.valor);

  return {
    ...base,
    valor: ps === null ? null : pct(ps),
    leitura:
      `Saúde recebeu ${ps === null ? "valor não publicado" : pct(ps)} da receita realizada e ` +
      `educação ${pe === null ? "valor não publicado" : pct(pe)}, sobre ` +
      `${formatarMoeda(r.receita.valor ?? 0)} arrecadados até o ${r.bimestreReferencia}º bimestre.`,
    ausencia: null,
    carimbo: {
      periodo: `RREO do ${r.bimestreReferencia}º bimestre de ${r.exercicio}`,
      consultadoEm: dataSemHora(consultadoEm),
    },
  };
}

// ── 3. RELATÓRIOS OBRIGATÓRIOS ──
//
// Substitui o "alertas vigentes do Tribunal de Contas" que o rascunho pedia.
// São 33 Tribunais no país e nenhum feed público unificado: aquela métrica
// seria fabricada. Esta é auditável no site do próprio Tesouro.

export function fatoDosRelatorios(raioX: ResultadoRaioX, consultadoEm: string): Fato {
  const base = {
    chave: "relatorios" as const,
    titulo: "Relatórios obrigatórios",
    fundamento:
      "Art. 52 da Lei Complementar 101/2000. Deixar de publicar suspende transferências " +
      "voluntárias e contratação de operação de crédito, na forma do art. 51, § 2º.",
    fonte: `${FONTE_TESOURO} · RREO`,
    ressalva: null,
  };

  if (!raioX.ok) {
    return {
      ...base,
      valor: null,
      leitura: null,
      carimbo: null,
      ausencia: "Não foi possível consultar o Tesouro agora, então nada se afirma sobre entrega.",
    };
  }

  const r = raioX.raioX;
  const faltam = r.rreoFaltando.length;

  return {
    ...base,
    valor: `${r.rreoEntregues} de ${r.rreoEsperados}`,
    leitura:
      faltam === 0
        ? `Todos os ${r.rreoEsperados} bimestres encerrados deste exercício constam publicados no Tesouro.`
        : `${faltam} bimestre${faltam > 1 ? "s" : ""} encerrado${faltam > 1 ? "s" : ""} não consta${faltam > 1 ? "m" : ""} ` +
          `publicado${faltam > 1 ? "s" : ""}: ${r.rreoFaltando.map((b) => `${b}º`).join(", ")}.`,
    ausencia: null,
    carimbo: {
      periodo: `Exercício de ${r.exercicio}`,
      consultadoEm: dataSemHora(consultadoEm),
    },
  };
}
