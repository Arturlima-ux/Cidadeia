// ── CONTRATO QUE VENCE SEM NINGUÉM VER ──
//
// Este módulo existe por causa de uma sequência que se repete em prefeitura
// pequena e termina sempre no mesmo lugar:
//
//   o contrato do transporte escolar vence → ninguém percebeu a tempo → a
//   secretaria não pode parar o serviço → contrata por dispensa emergencial →
//   a emergencial vira duas, três → as dispensas do mesmo objeto somadas
//   passam do limite do art. 75 → fracionamento.
//
// O módulo de fracionamento já apontava o fim dessa história. Aqui se aponta o
// começo, que é onde ainda dá para agir sem custo.
//
// Nos contratos reais de um município (São Sepé/RS, medido em 29/09/2026): 39
// contratos já vencidos e 27 vencendo em 90 dias, três deles no dia seguinte.
// Não é hipótese.
//
// ── O QUE A LEI FIXA, E SÓ ISSO ──
//
// Não existe número legal para "quanto tempo leva uma licitação": depende do
// termo de referência, da pesquisa de preços, do parecer jurídico e da reserva
// orçamentária, que a lei não cronometra. Inventar esse número aqui seria
// exatamente o tipo de chute que este produto não dá.
//
// O que a lei fixa é o prazo MÍNIMO entre divulgar o edital e receber
// propostas (art. 55 da Lei 14.133/2021). É um piso incontornável: mesmo com
// todo o resto pronto, o edital ainda precisa ficar publicado esse tempo.
//
// Então a tela afirma só o que é fato: "restam N dias úteis, e só a publicação
// do edital exige X". O tempo interno da casa quem informa é o município.

/**
 * Prazos mínimos do art. 55 da Lei 14.133/2021, em DIAS ÚTEIS, contados da
 * divulgação do edital.
 *
 * Conferido no texto da lei, não reproduzido de memória. Se algum dia a lei
 * mudar, é uma tabela para corrigir — e não um número espalhado pelo código.
 */
export const PRAZOS_ART_55 = [
  { chave: "bens_menor_preco", dias: 8, texto: "aquisição de bens, menor preço ou maior desconto", base: "art. 55, I, a" },
  { chave: "bens_demais", dias: 15, texto: "aquisição de bens, demais critérios", base: "art. 55, I, b" },
  { chave: "servicos_comuns", dias: 10, texto: "serviços e obras comuns de engenharia, menor preço ou maior desconto", base: "art. 55, II, a" },
  { chave: "servicos_especiais", dias: 25, texto: "serviços e obras especiais, menor preço ou maior desconto", base: "art. 55, II, b" },
  { chave: "contratacao_integrada", dias: 60, texto: "contratação integrada", base: "art. 55, II, c" },
  { chave: "semi_integrada", dias: 35, texto: "contratação semi-integrada e demais hipóteses", base: "art. 55, II, d" },
  { chave: "maior_lance", dias: 15, texto: "julgamento por maior lance", base: "art. 55, III" },
  { chave: "tecnica_e_preco", dias: 35, texto: "técnica e preço, melhor técnica ou conteúdo artístico", base: "art. 55, IV" },
] as const;

export type ChavePrazo = (typeof PRAZOS_ART_55)[number]["chave"];

/**
 * O menor prazo que a lei admite para qualquer licitação.
 *
 * É a régua usada quando não se sabe qual caminho o município escolherá: se
 * nem o mais rápido cabe no tempo que resta, nenhum cabe. Afirmar sobre o piso
 * é afirmar sobre todos.
 */
export const PRAZO_MINIMO_ABSOLUTO = 8;

export function prazoArt55(chave: ChavePrazo) {
  return PRAZOS_ART_55.find((p) => p.chave === chave)!;
}

/**
 * Qual prazo do art. 55 se aplica, pelo que dá para saber do objeto.
 *
 * Devolve o de bens/menor preço (o piso) quando não dá para distinguir, porque
 * é a hipótese mais favorável ao município: se o aviso já é grave com o prazo
 * mais curto, é grave com qualquer um.
 */
export function prazoProvavel(objeto: string): (typeof PRAZOS_ART_55)[number] {
  const t = objeto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  if (/\b(obra|reforma|pavimenta|constru|edifica|engenharia|terraplen|drenagem)/.test(t)) {
    return prazoArt55("servicos_comuns");
  }
  if (/\b(servico|servicos|prestacao|locacao|manutencao|transporte|limpeza|vigilancia)/.test(t)) {
    return prazoArt55("servicos_comuns");
  }
  return prazoArt55("bens_menor_preco");
}

// ── CONTAGEM EM DIAS ÚTEIS ──

/**
 * Dias úteis entre duas datas (não conta o dia inicial, conta o final).
 *
 * ── O QUE ESTA CONTA NÃO SABE ──
 *
 * Feriados. Não há calendário nacional confiável de feriados MUNICIPAIS — cada
 * câmara cria os seus —, então contar só sábado e domingo é a única conta
 * honesta possível aqui. O efeito é conhecido e está do lado seguro na direção
 * que importa: o número real de dias úteis é sempre MENOR ou igual a este, ou
 * seja, o aperto é sempre maior do que a tela diz, nunca menor.
 *
 * A tela diz isso em vez de esconder.
 */
export function diasUteisEntre(de: Date, ate: Date): number {
  const inicio = new Date(Date.UTC(de.getUTCFullYear(), de.getUTCMonth(), de.getUTCDate()));
  const fim = new Date(Date.UTC(ate.getUTCFullYear(), ate.getUTCMonth(), ate.getUTCDate()));
  if (fim <= inicio) return 0;

  let uteis = 0;
  const cursor = new Date(inicio);
  while (cursor < fim) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const dia = cursor.getUTCDay();
    if (dia !== 0 && dia !== 6) uteis++;
  }
  return uteis;
}

/** Dias corridos, para o texto que o gestor lê ("vence em 12 dias"). */
export function diasCorridosEntre(de: Date, ate: Date): number {
  const a = Date.UTC(de.getUTCFullYear(), de.getUTCMonth(), de.getUTCDate());
  const b = Date.UTC(ate.getUTCFullYear(), ate.getUTCMonth(), ate.getUTCDate());
  return Math.round((b - a) / 86_400_000);
}

// ── A LEITURA DE UM CONTRATO ──

export type SituacaoVigencia =
  /** Já passou da data final. */
  | "vencido"
  /** Não cabe mais nem o prazo mínimo do edital: só prorrogação resolve. */
  | "sem_tempo_de_licitar"
  /** Ainda cabe o edital, mas sem folga nenhuma para preparar o processo. */
  | "apertado"
  /** Vence dentro do horizonte de atenção, com tempo de agir. */
  | "atencao"
  /** Longe. */
  | "ok"
  /** Sem data de fim informada — não dá para dizer nada. */
  | "sem_data";

/**
 * Horizonte em dias corridos a partir do qual um contrato entra na tela.
 *
 * Não é número de lei, e por isso não é apresentado como se fosse: é o recorte
 * da lista ("vencendo nos próximos 90 dias"), não um critério de julgamento.
 * Toda afirmação que a tela faz sobre prazo é ancorada no art. 55.
 */
export const HORIZONTE_ATENCAO_DIAS = 90;

export type ContratoParaVigencia = {
  objeto: string;
  vigenciaFim: string | null;
  fornecedorNome: string | null;
};

export type LeituraVigencia = {
  situacao: SituacaoVigencia;
  diasCorridos: number | null;
  diasUteis: number | null;
  /** O prazo do art. 55 usado como régua, quando houve um. */
  prazo: (typeof PRAZOS_ART_55)[number] | null;
  /** Frase factual, sem acusação. */
  texto: string;
  /** O que fazer. Oferece prorrogar e licitar, porque as duas são legais. */
  acao: string;
  /** Ordena a lista: quanto menor, mais cedo aparece. */
  peso: number;
};

function plural(n: number, um: string, muitos: string) {
  return `${n} ${n === 1 ? um : muitos}`;
}

/**
 * Ordem de aparição na tela. Menor vem primeiro.
 *
 * ── POR QUE NÃO É SÓ "DIAS RESTANTES" ──
 *
 * Era, e os dados reais mostraram o problema: entre os 39 contratos vencidos de
 * um município, ordenar por dias corridos põe o que venceu há dois anos na
 * frente do que venceu ontem. O antigo ou já foi resolvido ou é um problema
 * crônico; o de ontem é o que ainda dá para consertar hoje.
 *
 * Então primeiro a faixa, depois a distância até hoje — nos dois sentidos.
 */
const ORDEM_DAS_FAIXAS: Record<SituacaoVigencia, number> = {
  // Já está acontecendo: se o serviço continuou, a execução está sem cobertura.
  vencido: 0,
  // Ainda dá para agir, mas a janela da licitação já fechou.
  sem_tempo_de_licitar: 1,
  apertado: 2,
  atencao: 3,
  // Não é urgência, é cadastro incompleto — mas impede qualquer aviso futuro.
  sem_data: 4,
  ok: 5,
};

function pesoDe(situacao: SituacaoVigencia, diasCorridos: number | null): number {
  const faixa = ORDEM_DAS_FAIXAS[situacao] * 100_000;
  return faixa + Math.abs(diasCorridos ?? 0);
}

export function lerVigencia(
  contrato: ContratoParaVigencia,
  hoje: Date = new Date()
): LeituraVigencia {
  if (!contrato.vigenciaFim) {
    return {
      situacao: "sem_data",
      diasCorridos: null,
      diasUteis: null,
      prazo: null,
      texto: "Contrato sem data de fim de vigência informada.",
      acao:
        "Informe a data de fim no cadastro. Sem ela não há como avisar antes do vencimento, " +
        "e é o vencimento despercebido que leva à dispensa emergencial.",
      peso: pesoDe("sem_data", null),
    };
  }

  const fim = new Date(`${contrato.vigenciaFim.slice(0, 10)}T12:00:00Z`);
  const corridos = diasCorridosEntre(hoje, fim);
  const prazo = prazoProvavel(contrato.objeto);

  if (corridos < 0) {
    return {
      situacao: "vencido",
      diasCorridos: corridos,
      diasUteis: 0,
      prazo,
      texto: `Vigência encerrada há ${plural(Math.abs(corridos), "dia", "dias")} (${contrato.vigenciaFim.slice(0, 10)}).`,
      acao:
        "Confirme se o serviço parou junto com o contrato. Se continuou sendo prestado, há execução " +
        "sem cobertura contratual, e é isso que o Tribunal de Contas pergunta — não o atraso em si.",
      peso: pesoDe("vencido", corridos),
    };
  }

  const uteis = diasUteisEntre(hoje, fim);

  if (uteis < prazo.dias) {
    return {
      situacao: "sem_tempo_de_licitar",
      diasCorridos: corridos,
      diasUteis: uteis,
      prazo,
      texto:
        `Vence em ${plural(corridos, "dia", "dias")} (${contrato.vigenciaFim.slice(0, 10)}), ou seja, ` +
        `${plural(uteis, "dia útil", "dias úteis")}. Só a publicação do edital exige ${prazo.dias} dias úteis ` +
        `(${prazo.base}, ${prazo.texto}) — e isso já com todo o processo interno pronto.`,
      acao:
        "Nova licitação não cabe mais neste prazo. Verifique se o contrato admite prorrogação e, se admitir, " +
        "instrua o termo aditivo agora; se não admitir, o caminho é assumir a interrupção do serviço ou " +
        "justificar a contratação direta pelo que a lei permite — decisão que precisa estar no processo, " +
        "não no improviso do último dia.",
      peso: pesoDe("sem_tempo_de_licitar", corridos),
    };
  }

  if (uteis < prazo.dias * 2) {
    return {
      situacao: "apertado",
      diasCorridos: corridos,
      diasUteis: uteis,
      prazo,
      texto:
        `Vence em ${plural(corridos, "dia", "dias")} (${plural(uteis, "dia útil", "dias úteis")}). ` +
        `O edital sozinho consome ${prazo.dias} desses dias úteis (${prazo.base}), sobrando ` +
        `${plural(uteis - prazo.dias, "dia útil", "dias úteis")} para termo de referência, pesquisa de preços, ` +
        `parecer jurídico e julgamento.`,
      acao:
        "Se a decisão for licitar, o processo precisa começar esta semana. Se for prorrogar, o aditivo " +
        "precisa ser assinado antes do fim da vigência — aditivo depois do vencimento não prorroga nada, " +
        "porque não há mais contrato para aditar.",
      peso: pesoDe("apertado", corridos),
    };
  }

  if (corridos <= HORIZONTE_ATENCAO_DIAS) {
    return {
      situacao: "atencao",
      diasCorridos: corridos,
      diasUteis: uteis,
      prazo,
      texto: `Vence em ${plural(corridos, "dia", "dias")} (${contrato.vigenciaFim.slice(0, 10)}).`,
      acao:
        "Ainda há tempo para decidir com calma entre prorrogar e licitar. Decidir agora é o que evita " +
        "que a escolha seja feita pelo calendário.",
      peso: pesoDe("atencao", corridos),
    };
  }

  return {
    situacao: "ok",
    diasCorridos: corridos,
    diasUteis: uteis,
    prazo,
    texto: `Vence em ${contrato.vigenciaFim.slice(0, 10)}.`,
    acao: "",
    peso: pesoDe("ok", corridos),
  };
}

/** As situações que pedem decisão, da mais urgente para a menos. */
export const SITUACOES_QUE_PEDEM_ACAO: SituacaoVigencia[] = [
  "vencido",
  "sem_tempo_de_licitar",
  "apertado",
  "atencao",
  "sem_data",
];

export function pedeAcao(s: SituacaoVigencia): boolean {
  return s !== "ok";
}
