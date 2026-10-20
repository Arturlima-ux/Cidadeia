import { avaliarPrazo, DIAS_PARA_AVISAR, type EntradaPrazo } from "@/lib/prazo-atendimento";
import { lerObra, type ContratoDeObra } from "@/lib/obra-prazo";
import { LIMITE_ALERTA, LIMITE_PESSOAL, LIMITE_PRUDENCIAL } from "@/lib/despesa-pessoal";

// ── A VISÃO DO PREFEITO, EM TRÊS NÚMEROS E UM GRÁFICO ──
//
// É o painel do vídeo da home, agora com o dado da prefeitura: despesa com
// pessoal, protocolos abertos e obras no prazo em cima; a série da despesa com
// pessoal nas linhas da LRF embaixo, com a projeção até a próxima fronteira.
//
// Aqui só a conta, sem banco, para poder testar. Cada número reaproveita a
// regra que já decide os alertas (prazo-atendimento, obra-prazo,
// despesa-pessoal): o cartão do topo e a lista de alertas nunca discordam.

/**
 * "Vencem em breve" é a mesma janela da lista de decisões (DIAS_PARA_AVISAR):
 * com 7 dias aqui e 5 lá, o cartão dizia 4 e a lista logo abaixo dizia 2.
 */
export const DIAS_EM_BREVE = DIAS_PARA_AVISAR;

export type ResumoProtocolos = {
  /** Sem resposta ainda, de qualquer tipo. */
  abertos: number;
  /** Prazo legal já passou. */
  vencidos: number;
  /** Vencem nos próximos DIAS_EM_BREVE dias. */
  vencemEmBreve: number;
};

export function resumirProtocolos(linhas: EntradaPrazo[], hoje: Date = new Date()): ResumoProtocolos {
  let abertos = 0;
  let vencidos = 0;
  let vencemEmBreve = 0;
  for (const l of linhas) {
    const a = avaliarPrazo(l, hoje);
    if (a.situacao === "respondido") continue;
    abertos++;
    if (a.situacao === "vencido") vencidos++;
    else if (a.situacao === "vence_breve") vencemEmBreve++;
  }
  return { abertos, vencidos, vencemEmBreve };
}

export type ObraParaResumo = ContratoDeObra & {
  status: string;
  /** O esperado digitado à mão, só para obra antiga sem datas (ver a tela de Obras). */
  progressoEsperado?: number | null;
};

/** Mesma folga da tela de Obras para obra sem datas: mais de 10 pontos atrás do esperado. */
const FOLGA_SEM_DATAS = 10;

export type ResumoObras = {
  /** Andando junto com o prazo do contrato. */
  noPrazo: number;
  /** Obras com prazo e medição que permitem dizer se estão no prazo. */
  avaliadas: number;
  /** Atrás do prazo, ou com o contrato encerrado sem conclusão. */
  atrasadas: number;
  /** Prazo correndo e sem medição recente: não dá para afirmar nada. */
  semMedicao: number;
};

/**
 * "9 de 10 no prazo". O denominador é só o que dá para avaliar: obra sem
 * datas, que ainda não começou ou sem medição recente não entra como "no
 * prazo" nem como "atrasada" — ela aparece à parte, como "sem medição",
 * porque contar a favor seria esconder e contar contra seria acusar.
 */
export function resumirObras(lista: ObraParaResumo[], hoje: Date = new Date()): ResumoObras {
  let noPrazo = 0;
  let atrasadas = 0;
  let semMedicao = 0;
  for (const o of lista) {
    // Concluída já saiu da conta; planejada ainda não entrou nela.
    if (o.status === "concluida" || o.status === "planejada") continue;
    // Marcada como atrasada por quem cuida da obra: vale o que a prefeitura disse.
    if (o.status === "atrasada") {
      atrasadas++;
      continue;
    }
    if (!o.vigenciaInicio || !o.vigenciaFim) {
      // Obra antiga, sem datas: compara com o esperado digitado, como a tela de Obras faz.
      const esperado = o.progressoEsperado ?? 0;
      if (esperado > 0 && o.progressoInformado !== null) {
        if (o.progressoInformado < esperado - FOLGA_SEM_DATAS) atrasadas++;
        else noPrazo++;
      }
      continue;
    }
    const s = lerObra(o, hoje).situacao;
    if (s === "em_dia") noPrazo++;
    else if (s === "atras_do_prazo" || s === "contrato_encerrado_sem_conclusao") atrasadas++;
    else if (s === "sem_noticia") semMedicao++;
  }
  return { noPrazo, avaliadas: noPrazo + atrasadas, atrasadas, semMedicao };
}

/** As três fronteiras da LRF para a despesa com pessoal, de baixo para cima. */
export const FRONTEIRAS = [
  { valor: LIMITE_ALERTA, nome: "alerta" },
  { valor: LIMITE_PRUDENCIAL, nome: "prudencial" },
  { valor: LIMITE_PESSOAL, nome: "teto" },
] as const;

/** A próxima fronteira acima do percentual atual, ou null se já passou do teto. */
export function proximaFronteira(percentual: number): (typeof FRONTEIRAS)[number] | null {
  return FRONTEIRAS.find((f) => percentual < f.valor) ?? null;
}

export type PontoPessoal = { em: string; percentual: number; rotulo: string };

const MES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/**
 * A série da despesa com pessoal, da apuração mais antiga para a mais nova.
 * A data de cada ponto é o fim do período apurado (dia 28, como em
 * antecipacoes-da-prefeitura), e RCL zerada some da série em vez de virar 0%.
 */
export function seriePessoal(
  periodos: { exercicio: number; mesReferencia: number; rcl: number; despesa: number }[]
): PontoPessoal[] {
  return periodos
    .filter((p) => p.rcl > 0)
    .map((p) => {
      const mes = Math.min(12, Math.max(1, Math.trunc(p.mesReferencia)));
      return {
        em: new Date(Date.UTC(p.exercicio, mes - 1, 28)).toISOString(),
        percentual: (p.despesa / p.rcl) * 100,
        rotulo: `${MES_CURTO[mes - 1]}/${String(p.exercicio).slice(2)}`,
      };
    })
    .sort((a, b) => a.em.localeCompare(b.em));
}

/**
 * "out/26", no horário de Brasília, o mesmo de `mesAnoDe` (lib/antecipacao):
 * em UTC, uma travessia em 31 de outubro à noite virava "nov/26" no eixo ao
 * lado de "outubro de 2026" no aviso.
 */
export function rotuloDoMes(iso: string): string {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(new Date(iso));
  const ano = partes.find((p) => p.type === "year")!.value;
  const mes = Number(partes.find((p) => p.type === "month")!.value);
  return `${MES_CURTO[mes - 1]}/${ano.slice(2)}`;
}

/** 46,1 — uma casa, vírgula. */
export function pctBr(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
