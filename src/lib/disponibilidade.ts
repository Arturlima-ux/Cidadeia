// ── A DISPONIBILIDADE QUE SE MEDE, E O QUE ELA NÃO É ──
//
// O acordo de nível de serviço pedia um percentual de disponibilidade mínima.
// Procurar um número defensável levou ao contrário: o Supabase não oferece SLA
// nos planos Free, Pro ou Team — só no Enterprise. Prometer é assumir sozinho
// um risco que o fornecedor não cobre, com multa atrelada.
//
// Quase todo fornecedor de software público resolve isso copiando "99,9%" de
// um modelo. A alternativa honesta é medir e publicar.
//
// ── O QUE ESTA MEDIÇÃO É, EXATAMENTE ──
//
// Uma verificação por dia: o cron chama /api/manter-vivo, que executa
// `select 1` no Postgres e grava se respondeu e em quantos milissegundos.
//
// Isso NÃO é uptime por minuto, e o texto nunca chama de uptime. Uma queda de
// quarenta minutos entre duas verificações não aparece aqui, e a página diz
// isso em vez de esconder. O que a verificação diária detecta bem é
// justamente a falha que mais ameaça este produto: o projeto do Supabase
// pausado por inatividade, que dura DIAS e já derrubou o site uma vez.
//
// Chamar de "disponibilidade de 99,9%" o resultado de 30 amostras seria
// exatamente o tipo de número inflado que este produto não produz. Chamar de
// "o banco respondeu em 29 dos últimos 30 dias verificados" é o que os dados
// sustentam.

export type Medicao = {
  verificadoEm: string;
  ok: boolean;
  ms: number;
  detalhe: string | null;
};

export type ApuracaoDisponibilidade = {
  /** Dias distintos em que houve ao menos uma verificação. */
  diasVerificados: number;
  /** Dias em que TODAS as verificações responderam. */
  diasSemFalha: number;
  /** Dias com ao menos uma falha. */
  diasComFalha: number;
  /** Datas (AAAA-MM-DD) em que houve falha, da mais recente para trás. */
  datasComFalha: string[];
  /**
   * Dias do período sem nenhuma verificação. Se o servidor inteiro cai, a
   * rotina nem roda e não grava nada: o dia some. Dia sem verificação não é
   * dia disponível, e entra na conta contra (revisão de outubro de 2026).
   */
  diasSemVerificacao: number;
  /** Mediana da latência, em ms. Null sem medição bem-sucedida. */
  latenciaMediana: number | null;
  /** A pior latência registrada entre as que responderam. */
  latenciaPior: number | null;
  /** Primeira e última verificação do período apurado. */
  primeira: string | null;
  ultima: string | null;
  /**
   * Percentual de dias sem falha. Null quando há poucas amostras.
   *
   * Não é "uptime": é a fração dos DIAS VERIFICADOS em que a verificação
   * respondeu. O rótulo na tela diz isso por extenso.
   */
  percentualDeDias: number | null;
};

/**
 * Abaixo deste número de dias, nenhum percentual é publicado.
 *
 * Com cinco amostras, uma falha vira "80%" — um número que parece precisão e
 * é ruído. Enquanto não houver amostra suficiente, a página mostra a contagem
 * crua, que é sempre verdadeira, e diz que ainda é cedo para percentual.
 */
export const MINIMO_DE_DIAS_PARA_PERCENTUAL = 30;

const diaDe = (iso: string) => iso.slice(0, 10);

function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const ordenado = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenado.length / 2);
  return ordenado.length % 2 === 0
    ? Math.round((ordenado[meio - 1]! + ordenado[meio]!) / 2)
    : ordenado[meio]!;
}

export function apurar(medicoes: Medicao[]): ApuracaoDisponibilidade {
  const vazio: ApuracaoDisponibilidade = {
    diasVerificados: 0,
    diasSemFalha: 0,
    diasComFalha: 0,
    datasComFalha: [],
    diasSemVerificacao: 0,
    latenciaMediana: null,
    latenciaPior: null,
    primeira: null,
    ultima: null,
    percentualDeDias: null,
  };
  if (medicoes.length === 0) return vazio;

  // Agrupa por DIA, e não por medição: duas verificações no mesmo dia não
  // fazem o dia contar duas vezes, e uma falha no dia marca o dia inteiro.
  // Contar medições em vez de dias deixaria o número à mercê de quantas vezes
  // o cron rodou, que não é sinal de nada.
  const porDia = new Map<string, boolean>();
  for (const m of medicoes) {
    const d = diaDe(m.verificadoEm);
    porDia.set(d, (porDia.get(d) ?? true) && m.ok);
  }

  const dias = [...porDia.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const comFalha = dias.filter(([, ok]) => !ok).map(([d]) => d);
  const latencias = medicoes.filter((m) => m.ok).map((m) => m.ms);
  const ordenadas = [...medicoes].sort((a, b) => a.verificadoEm.localeCompare(b.verificadoEm));

  const diasVerificados = dias.length;
  const diasSemFalha = diasVerificados - comFalha.length;
  const periodo = Math.round((Date.parse(dias[dias.length - 1][0]) - Date.parse(dias[0][0])) / 86_400_000) + 1;
  const diasSemVerificacao = Math.max(0, periodo - diasVerificados);
  const base = diasVerificados + diasSemVerificacao;

  return {
    diasVerificados,
    diasSemFalha,
    diasComFalha: comFalha.length,
    datasComFalha: comFalha.reverse(),
    diasSemVerificacao,
    latenciaMediana: mediana(latencias),
    latenciaPior: latencias.length > 0 ? Math.max(...latencias) : null,
    primeira: ordenadas[0]?.verificadoEm ?? null,
    ultima: ordenadas[ordenadas.length - 1]?.verificadoEm ?? null,
    percentualDeDias:
      base >= MINIMO_DE_DIAS_PARA_PERCENTUAL
        ? (diasSemFalha / base) * 100
        : null,
  };
}

/**
 * A frase que a página e o contrato usam.
 *
 * Nunca a palavra "uptime", e nunca um percentual sem dizer sobre o quê. A
 * contagem crua vem antes do percentual porque é ela que é verificável linha a
 * linha.
 */
export function frase(a: ApuracaoDisponibilidade): string {
  if (a.diasVerificados === 0) {
    return "Nenhuma verificação registrada ainda.";
  }
  const lacuna =
    a.diasSemVerificacao > 0
      ? ` (e em ${a.diasSemVerificacao} ${a.diasSemVerificacao === 1 ? "dia" : "dias"} do período não houve verificação, o que conta como falha)`
      : "";
  const base =
    `O sistema respondeu em ${a.diasSemFalha} dos ${a.diasVerificados} ` +
    `${a.diasVerificados === 1 ? "dia verificado" : "dias verificados"}${lacuna}`;

  if (a.percentualDeDias === null) {
    return (
      `${base}. Ainda são poucas amostras para publicar um percentual — ` +
      `a partir de ${MINIMO_DE_DIAS_PARA_PERCENTUAL} dias ele aparece aqui.`
    );
  }
  const pct = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(a.percentualDeDias);
  return `${base}, ou ${pct}% dos dias.`;
}

/** Tendência da latência: os últimos N contra os anteriores. */
export function latenciaPiorou(medicoes: Medicao[], janela = 7): boolean {
  const ok = medicoes.filter((m) => m.ok).sort((a, b) => a.verificadoEm.localeCompare(b.verificadoEm));
  if (ok.length < janela * 2) return false;
  const recentes = mediana(ok.slice(-janela).map((m) => m.ms))!;
  const anteriores = mediana(ok.slice(-janela * 2, -janela).map((m) => m.ms))!;
  // Dobrar é sinal; variar 20% é ruído de rede.
  return recentes > anteriores * 2;
}

/**
 * Uma linha por dia, para a lista da página. Antes a lista mostrava cada
 * medição e a contagem acima contava dias: "21 dias" em cima de 22 linhas, com
 * o mesmo dia duas vezes (revisão de outubro de 2026). O dia vale a pior
 * verificação dele.
 */
export function porDia(medicoes: Medicao[]): Medicao[] {
  const mapa = new Map<string, Medicao>();
  for (const m of medicoes) {
    const d = diaDe(m.verificadoEm);
    const atual = mapa.get(d);
    if (!atual || (atual.ok && !m.ok) || (atual.ok === m.ok && m.ms > atual.ms)) mapa.set(d, m);
  }
  return [...mapa.values()].sort((a, b) => b.verificadoEm.localeCompare(a.verificadoEm));
}
