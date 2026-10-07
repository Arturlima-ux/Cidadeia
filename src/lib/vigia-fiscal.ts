import { entregasDaPrefeitura, type EntregaRegistrada } from "@/lib/siconfi-entregas";
import { conferirEntregasSiconfi } from "@/lib/siconfi";
import { buscarRgfMaisRecente, type ResultadoRgf } from "@/lib/siconfi-rgf";
import {
  avaliarObrigacoes,
  periodicidadeRgf,
  periodosDoExercicio,
  type ObrigacaoAvaliada,
  type Periodicidade,
} from "@/lib/obrigacoes-fiscais";

// ── A VIGIA FISCAL ──
//
// O que o painel do Gestão confere sozinho, todo dia, no Tesouro:
//
//   · se cada RREO e cada RGF do exercício foi entregue, pelo extrato de
//     entregas (uma consulta por ano, que registra o tipo comum e o
//     simplificado). Quem atrasa fica impedido de receber transferência
//     voluntária e de contratar crédito (LRF, art. 51, § 2º);
//   · se os números do último RGF fecham entre si. A auditoria de outubro de
//     2026 achou 53 prefeituras com despesa com pessoal declarada acima de
//     toda a receita, erro de preenchimento que o Tribunal de Contas aponta.
//
// A mesma função serve à tela (sob pedido) e à rotina diária que gera os
// alertas (lib/vigia-fiscal-alertas.ts), para as duas nunca discordarem.

export type SituacaoFiscal = {
  exercicio: number;
  periodicidadeRgf: Periodicidade;
  /** De onde veio a periodicidade do RGF: do que a prefeitura já entregou, ou do cadastro. */
  periodicidadeDoExtrato: boolean;
  avaliadas: ObrigacaoAvaliada[];
  /** Períodos encerrados que o Tesouro não respondeu: não podem virar acusação. */
  inconclusivos: string[];
  /** Último RGF lido, com a checagem dos números. Null se não foi consultado. */
  pessoal: ResultadoRgf | null;
};

/**
 * A periodicidade do RGF que a prefeitura de fato usa.
 *
 * Município de até 50 mil habitantes pode optar pelo semestral (LRF, art. 63),
 * e o cadastro nem sempre sabe se optou. O extrato sabe: o que ela entregou
 * neste ano, ou no anterior, diz a escolha.
 */
export function periodicidadeEntregue(
  esteAno: EntregaRegistrada[] | null,
  anoAnterior: EntregaRegistrada[] | null
): Periodicidade | null {
  for (const lista of [esteAno, anoAnterior]) {
    const rgf = (lista ?? []).filter((e) => e.relatorio === "rgf");
    if (rgf.some((e) => e.periodicidade === "S")) return "semestral";
    if (rgf.some((e) => e.periodicidade === "Q")) return "quadrimestral";
  }
  return null;
}

/** Chaves `${obrigacao}:${numero}` entregues, no formato do calendário. */
export function chavesEntregues(entregas: EntregaRegistrada[], periodicidadeRgf: Periodicidade): Set<string> {
  const letraRgf = periodicidadeRgf === "semestral" ? "S" : "Q";
  const chaves = new Set<string>();
  for (const e of entregas) {
    if (e.relatorio === "rreo" && e.periodicidade === "B") chaves.add(`rreo:${e.periodo}`);
    if (e.relatorio === "rgf" && e.periodicidade === letraRgf) chaves.add(`rgf:${e.periodo}`);
  }
  return chaves;
}

export async function conferirSituacaoFiscal(entrada: {
  codigoIbge: string;
  populacao: number | null;
  optouRgfSemestral?: boolean;
  hoje?: Date;
  /** false poupa a leitura do RGF quando só o calendário interessa. */
  conferirPessoal?: boolean;
}): Promise<SituacaoFiscal> {
  const hoje = entrada.hoje ?? new Date();
  const exercicio = hoje.getUTCFullYear();
  const hojeIso = hoje.toISOString().slice(0, 10);

  const [esteAno, anoAnterior] = await Promise.all([
    entregasDaPrefeitura(entrada.codigoIbge, exercicio),
    entregasDaPrefeitura(entrada.codigoIbge, exercicio - 1),
  ]);

  const doExtrato = periodicidadeEntregue(esteAno, anoAnterior);
  const periodicidade = doExtrato ?? periodicidadeRgf(entrada.populacao, entrada.optouRgfSemestral ?? false);
  const periodos = periodosDoExercicio(exercicio, { periodicidadeRgf: periodicidade });
  const encerrados = periodos.filter((p) => p.obrigacao.verificavel && p.fimDoPeriodo <= hojeIso);

  let entregues: Set<string>;
  let inconclusivos: string[];
  if (esteAno !== null) {
    entregues = chavesEntregues(esteAno, periodicidade);
    inconclusivos = [];
  } else {
    // Extrato fora do ar: o RREO ainda pode ser conferido período a período;
    // o RGF fica sem resposta, e a tela diz isso em vez de cobrar.
    const rreo = await conferirEntregasSiconfi(entrada.codigoIbge, exercicio, {
      periodosRreo: encerrados.filter((p) => p.obrigacao.chave === "rreo").map((p) => p.numero),
    });
    entregues = rreo.entregues;
    inconclusivos = [
      ...rreo.inconclusivos,
      ...encerrados.filter((p) => p.obrigacao.chave === "rgf").map((p) => `rgf:${p.numero}`),
    ];
  }

  const pessoal =
    entrada.conferirPessoal === false
      ? null
      : await buscarRgfMaisRecente(entrada.codigoIbge, exercicio, hoje.getUTCMonth() + 1, 8, hoje);

  return {
    exercicio,
    periodicidadeRgf: periodicidade,
    periodicidadeDoExtrato: doExtrato !== null,
    avaliadas: avaliarObrigacoes(periodos, entregues, hoje),
    inconclusivos,
    pessoal,
  };
}
