// Vocabulário das ocorrências por escola, compartilhado entre tela, ações
// e leitura automática. Fora do "use server" de propósito.
//
// A diferença para a saúde não é cosmética: na escola, uma ocorrência
// costuma custar AULA. Por isso cada registro pode dizer quantas turmas
// ficaram sem aula e quantos alunos foram afetados — é daí que sai a
// conta dos 200 dias letivos da LDB, que nenhum sistema municipal faz.

export const TIPOS_OCORRENCIA_ESCOLA = [
  { chave: "sem_professor", rotulo: "Sem professor", exemplo: "Professor faltou e não houve substituto.", custaAula: true },
  { chave: "turma_dispensada", rotulo: "Turma dispensada", exemplo: "Alunos voltaram para casa sem aula.", custaAula: true },
  { chave: "falta_merenda", rotulo: "Faltou merenda", exemplo: "Item do cardápio acabou; refeição reduzida ou suspensa.", custaAula: false },
  { chave: "transporte", rotulo: "Transporte escolar", exemplo: "Ônibus quebrou, rota não saiu, aluno não chegou.", custaAula: true },
  { chave: "estrutura", rotulo: "Estrutura", exemplo: "Sem água, sem energia, goteira, banheiro interditado.", custaAula: true },
  { chave: "seguranca", rotulo: "Segurança", exemplo: "Invasão, depredação, briga, ameaça.", custaAula: false },
  { chave: "material", rotulo: "Material didático", exemplo: "Livro não chegou, sem material de uso diário.", custaAula: false },
  { chave: "infrequencia", rotulo: "Aluno faltando", exemplo: "Aluno com faltas seguidas — risco de evasão.", custaAula: false },
  { chave: "profissional", rotulo: "Falta de profissional", exemplo: "Sem merendeira, sem cuidador, sem secretário escolar.", custaAula: false },
  { chave: "outro", rotulo: "Outro", exemplo: "", custaAula: false },
] as const;

export type TipoOcorrenciaEscola = (typeof TIPOS_OCORRENCIA_ESCOLA)[number]["chave"];

export function rotuloOcorrenciaEscola(chave: string): string {
  return TIPOS_OCORRENCIA_ESCOLA.find((t) => t.chave === chave)?.rotulo ?? chave;
}

export function custaAula(chave: string): boolean {
  return TIPOS_OCORRENCIA_ESCOLA.find((t) => t.chave === chave)?.custaAula ?? false;
}

/** Dias que uma ocorrência está aberta. */
export function diasAbertaEscola(createdAt: string, hoje: Date = new Date()): number {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((hoje.getTime() - d.getTime()) / 86_400_000));
}

/**
 * O que merece atenção numa escola, a partir do que está aberto nela.
 * Mesma regra explicável da saúde: urgente parada há 2+ dias, ou 3+ abertas.
 */
export function situacaoDaEscola(
  abertas: { gravidade: string; createdAt: string }[],
  hoje: Date = new Date()
): "normal" | "atencao" | "urgente" {
  if (abertas.some((o) => o.gravidade === "urgente" && diasAbertaEscola(o.createdAt, hoje) >= 2)) return "urgente";
  if (abertas.some((o) => o.gravidade === "urgente")) return "atencao";
  if (abertas.length >= 3) return "atencao";
  return "normal";
}

// ── O CALENDÁRIO QUE A LEI COBRA ──
//
// LDB (Lei 9.394/1996), art. 24, I: no mínimo 200 dias letivos e 800 horas
// de trabalho escolar efetivo por ano na educação básica. Quem não cumpre
// tem que repor — e quem descobre isso em dezembro não tem mais como.

export const DIAS_LETIVOS_LDB = 200;
export const HORAS_LETIVAS_LDB = 800;

/**
 * Dias de aula perdidos por escola, somando o que as ocorrências
 * registraram. Só conta o que a própria escola marcou como perda de aula:
 * ocorrência de merenda ou de material atrapalha, mas não cancela o dia.
 */
export function aulasPerdidas(
  ocorrencias: { tipo: string; aulasPerdidas: number | null }[]
): number {
  return ocorrencias.reduce((soma, o) => soma + (custaAula(o.tipo) ? (o.aulasPerdidas ?? 0) : 0), 0);
}

export type CalendarioEscola = {
  perdidos: number;
  /** Quanto sobra do limite antes de a escola ficar abaixo dos 200 dias. */
  folga: number;
  situacao: "normal" | "atencao" | "estourado";
  frase: string;
};

/**
 * Lê o calendário de uma escola contra o mínimo legal.
 *
 * `diasPrevistos` é o que o calendário escolar aprovado prevê — quase
 * sempre 200 cravados, às vezes 202/205 de folga. Sem ele, assume o mínimo
 * da LDB, que é o caso pior e o mais honesto.
 */
export function lerCalendario(perdidos: number, diasPrevistos: number = DIAS_LETIVOS_LDB): CalendarioEscola {
  const folga = diasPrevistos - DIAS_LETIVOS_LDB - perdidos;
  if (folga < 0) {
    return {
      perdidos,
      folga,
      situacao: "estourado",
      frase: `${perdidos} dia(s) de aula perdidos: a escola já está ${-folga} dia(s) abaixo dos ${DIAS_LETIVOS_LDB} dias letivos que a LDB exige. Precisa repor.`,
    };
  }
  if (folga <= 2) {
    return {
      perdidos,
      folga,
      situacao: "atencao",
      frase: `${perdidos} dia(s) de aula perdidos: sobra folga de ${folga} dia(s) até o mínimo de ${DIAS_LETIVOS_LDB} dias letivos.`,
    };
  }
  return {
    perdidos,
    folga,
    situacao: "normal",
    frase:
      perdidos === 0
        ? `Nenhum dia de aula perdido registrado — calendário de ${diasPrevistos} dias em dia.`
        : `${perdidos} dia(s) de aula perdidos, com folga de ${folga} dia(s) no calendário.`,
  };
}
