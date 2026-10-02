// ── O PRAZO DA OBRA SAI DO CONTRATO, NÃO DA CABEÇA DE ALGUÉM ──
//
// O módulo de Obras comparava `progressoAtual` com `progressoEsperado`. Os dois
// eram digitados à mão, e o segundo é um número que alguém inventou: não há
// fonte para "a esta altura a obra deveria estar em 60%".
//
// Comparar um palpite com outro produz um alerta de atraso que não sustenta
// conversa nenhuma. O prefeito pergunta "de onde saiu esse 60%?" e não há
// resposta.
//
// O contrato tem a resposta. Ele traz data de início e fim de vigência, e a
// fração do prazo já consumida é um FATO — não precisa de ninguém para existir.
// A comparação passa a ser entre o progresso que a obra informa e o tempo que
// o contrato já gastou.
//
// ── POR QUE O CONTRATO É A FONTE CERTA PARA OBRA MUNICIPAL ──
//
// Saúde tem o CNES, Educação tem o arquivo do INEP, Licitações tem o PNCP.
// Obra municipal não tem cadastro nacional obrigatório.
//
// O Obrasgov (ex-CIPI) existe, tem API pública e traz percentual aferido,
// paralisações e geolocalização — mas para município a adesão é FACULTATIVA, e
// dá para medir o quanto isso pesa: no Piauí, 9 de 400 projetos têm tomador
// municipal, e só 7 municípios dos 224 do estado aparecem. Um módulo construído
// ali serviria 2% dos clientes.
//
// O contrato de obra, por outro lado, é obrigatório no PNCP desde abril de
// 2024, e já está no banco: dos 134 contratos de um município medido, 16 são de
// Obras ou Serviços de Engenharia — R$ 9,4 milhões, dos quais 10 contratos com
// a vigência já encerrada.
//
// ── O QUE ESTE MÓDULO NÃO SABE ──
//
// Quanto da obra está pronta. Prazo consumido NÃO é progresso: uma obra pode
// gastar 80% do prazo e estar em 95%, ou em 10%. O módulo diz o que sabe (o
// prazo) e pede o que não sabe (o progresso), sem transformar um no outro.

/** Categorias do PNCP que indicam obra ou serviço de engenharia. */
export function ehObraOuEngenharia(categoria: string | null | undefined): boolean {
  if (!categoria) return false;
  const t = categoria
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  return t.includes("obra") || t.includes("engenharia");
}

export type ContratoDeObra = {
  id: string;
  objeto: string;
  fornecedorNome: string | null;
  valorInicial: number | null;
  valorGlobal: number | null;
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  /** Percentual informado pela prefeitura, quando houver. 0–100. */
  progressoInformado: number | null;
  /** Quando o progresso foi informado pela última vez. */
  progressoAtualizadoEm: string | null;
};

export type SituacaoObra =
  /** O prazo do contrato acabou e a obra não foi dada como concluída. */
  | "contrato_encerrado_sem_conclusao"
  /** Progresso informado muito atrás do prazo consumido. */
  | "atras_do_prazo"
  /** O prazo está acabando e ninguém informa progresso há muito tempo. */
  | "sem_noticia"
  /** Andando junto com o prazo. */
  | "em_dia"
  /** Ainda não começou a vigência. */
  | "nao_comecou"
  /** Faltam datas no contrato. */
  | "sem_prazo";

export type LeituraObra = {
  situacao: SituacaoObra;
  /** Fração do prazo do contrato já consumida, 0–100. Null sem datas. */
  prazoConsumido: number | null;
  /** Dias corridos até o fim da vigência. Negativo quando já passou. */
  diasAteOFim: number | null;
  progressoInformado: number | null;
  /**
   * Distância entre progresso e prazo, em pontos percentuais. Negativo quando
   * a obra está atrás do prazo. Null quando o progresso não foi informado.
   */
  folga: number | null;
  texto: string;
  acao: string;
  peso: number;
};

/**
 * A partir de quantos pontos percentuais atrás do prazo a obra entra na tela.
 *
 * Não é número de lei — não existe lei que diga isso —, e por isso a tela nunca
 * o apresenta como critério legal. É só o recorte da lista, e a frase sempre
 * mostra os dois números crus (progresso e prazo) para o gestor julgar sozinho.
 */
export const ATRASO_RELEVANTE_PP = 20;

/** Dias sem atualizar o progresso a partir dos quais a obra fica sem notícia. */
export const DIAS_SEM_NOTICIA = 45;

const dia = 86_400_000;

function diasEntre(a: Date, b: Date): number {
  return Math.round(
    (Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) -
      Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())) /
      dia
  );
}

const data = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);

function pct(v: number): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(v)}%`;
}

function plural(n: number, um: string, muitos: string) {
  return `${n} ${n === 1 ? um : muitos}`;
}

const ORDEM: Record<SituacaoObra, number> = {
  contrato_encerrado_sem_conclusao: 0,
  atras_do_prazo: 1,
  sem_noticia: 2,
  sem_prazo: 3,
  em_dia: 4,
  nao_comecou: 5,
};

export function lerObra(c: ContratoDeObra, hoje: Date = new Date()): LeituraObra {
  const base = {
    prazoConsumido: null as number | null,
    diasAteOFim: null as number | null,
    progressoInformado: c.progressoInformado,
    folga: null as number | null,
  };

  if (!c.vigenciaInicio || !c.vigenciaFim) {
    return {
      ...base,
      situacao: "sem_prazo",
      texto: "O contrato desta obra não traz data de início ou de fim de vigência.",
      acao:
        "Sem as duas datas não há prazo para comparar com o andamento. Confira no termo de " +
        "contrato e complete o cadastro.",
      peso: ORDEM.sem_prazo * 1_000_000,
    };
  }

  const inicio = data(c.vigenciaInicio);
  const fim = data(c.vigenciaFim);
  const totalDeDias = diasEntre(inicio, fim);
  const diasAteOFim = diasEntre(hoje, fim);

  if (diasEntre(hoje, inicio) > 0) {
    return {
      ...base,
      situacao: "nao_comecou",
      diasAteOFim,
      texto: `A vigência começa em ${c.vigenciaInicio.slice(0, 10)}.`,
      acao: "",
      peso: ORDEM.nao_comecou * 1_000_000,
    };
  }

  // Contrato de um dia só existe nos dados reais (reforma de forro, 11 a 16 de
  // julho). Dividir por zero devolveria Infinity e a tela mostraria "∞% do
  // prazo consumido".
  const prazoConsumido =
    totalDeDias <= 0 ? 100 : Math.min(100, Math.max(0, (diasEntre(inicio, hoje) / totalDeDias) * 100));

  const progresso = c.progressoInformado;
  const folga = progresso === null ? null : progresso - prazoConsumido;
  const comum = { ...base, prazoConsumido, diasAteOFim, folga };

  // ── 1. PRAZO ACABOU, OBRA NÃO ──
  //
  // ── CORREÇÃO DE UMA LEITURA ERRADA DA LEI ──
  //
  // Este texto dizia que a obra que continua depois do prazo é "execução sem
  // cobertura contratual". Para obra, isso está errado.
  //
  // O art. 111 da Lei 14.133/2021 diz que na contratação que prevê conclusão
  // de escopo predefinido — e obra é exatamente isso — o prazo de vigência é
  // AUTOMATICAMENTE PRORROGADO quando o objeto não é concluído no período
  // firmado. Sem aditivo, sem assinatura. Dizer ao gestor que ele está
  // executando sem contrato é assustá-lo com um problema que a lei resolveu.
  //
  // O que não prorroga sozinho é a RESPONSABILIDADE. Pelo parágrafo único, se
  // a não conclusão decorrer de culpa do contratado, ele é constituído em mora
  // com sanções cabíveis, e a Administração pode optar pela extinção.
  //
  // Então a pergunta certa não é "o contrato ainda vale?" — vale. É "de quem
  // foi a culpa, e o que a Administração decidiu?". É isso que o Tribunal de
  // Contas pergunta, e é isso que o registro de decisão guarda.
  if (diasAteOFim < 0 && (progresso === null || progresso < 100)) {
    return {
      ...comum,
      situacao: "contrato_encerrado_sem_conclusao",
      texto:
        `O prazo do contrato terminou em ${c.vigenciaFim.slice(0, 10)}, há ` +
        `${plural(Math.abs(diasAteOFim), "dia", "dias")}, sem conclusão registrada` +
        (progresso === null
          ? " e sem progresso informado."
          : ` (${pct(progresso)} de progresso informado).`),
      acao:
        "Por ser contrato de escopo, a vigência está automaticamente prorrogada (art. 111 da Lei " +
        "14.133/2021) — a execução não ficou descoberta. O que a lei não resolve sozinha é de quem " +
        "foi o atraso: se for culpa do contratado, ele fica em mora e cabem sanções, e a " +
        "Administração pode optar pela extinção. Registre a decisão e a justificativa; é ela que " +
        "responde ao Tribunal de Contas depois.",
      peso: ORDEM.contrato_encerrado_sem_conclusao * 1_000_000 + Math.abs(diasAteOFim),
    };
  }

  if (progresso !== null && progresso >= 100) {
    return {
      ...comum,
      situacao: "em_dia",
      texto: `Progresso informado de 100% dentro da vigência (até ${c.vigenciaFim.slice(0, 10)}).`,
      acao: "",
      peso: ORDEM.em_dia * 1_000_000,
    };
  }

  // ── 2. ATRÁS DO PRAZO ──
  //
  // A frase mostra os dois números crus. Prazo consumido NÃO é progresso
  // esperado: uma obra pode gastar 80% do prazo e estar em 95%. Quem compara é
  // o gestor, com a informação na frente.
  if (folga !== null && folga <= -ATRASO_RELEVANTE_PP) {
    return {
      ...comum,
      situacao: "atras_do_prazo",
      texto:
        `${pct(progresso!)} de progresso informado com ${pct(prazoConsumido)} do prazo do contrato ` +
        `consumido — restam ${plural(diasAteOFim, "dia", "dias")} de vigência.`,
      acao:
        "Se o ritmo não mudar, o contrato vence antes da entrega. Decidir agora entre acelerar e " +
        "instruir termo aditivo de prazo é mais barato que decidir depois do vencimento, quando " +
        "já não há contrato para aditar.",
      peso: ORDEM.atras_do_prazo * 1_000_000 + diasAteOFim,
    };
  }

  // ── 3. SEM NOTÍCIA ──
  const desatualizado =
    c.progressoAtualizadoEm !== null &&
    diasEntre(data(c.progressoAtualizadoEm), hoje) >= DIAS_SEM_NOTICIA;

  if (progresso === null || desatualizado) {
    const quando = c.progressoAtualizadoEm
      ? `desde ${c.progressoAtualizadoEm.slice(0, 10)}`
      : "nenhuma vez";
    return {
      ...comum,
      situacao: "sem_noticia",
      texto:
        `${pct(prazoConsumido)} do prazo do contrato já passou e o progresso não é atualizado ` +
        `${quando}.`,
      acao:
        "Peça a medição à fiscalização do contrato. Obra sem medição em dia é a que aparece " +
        "parada só quando o prazo já acabou.",
      peso: ORDEM.sem_noticia * 1_000_000 + diasAteOFim,
    };
  }

  return {
    ...comum,
    situacao: "em_dia",
    texto: `${pct(progresso)} de progresso com ${pct(prazoConsumido)} do prazo consumido.`,
    acao: "",
    peso: ORDEM.em_dia * 1_000_000 + diasAteOFim,
  };
}

export function pedeAtencao(s: SituacaoObra): boolean {
  return s !== "em_dia" && s !== "nao_comecou";
}
