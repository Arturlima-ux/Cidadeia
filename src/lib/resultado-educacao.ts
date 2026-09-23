// ── DINHEIRO E RESULTADO ──
//
// A fase 1 descobriu a diferença entre a matrícula declarada ao Censo e a
// que a escola tem hoje. Aqui essa diferença vira reais: o FUNDEB paga por
// aluno declarado, então aluno atendido e não declarado é repasse que o
// município deixa na mesa o ano inteiro.
//
// E o resultado: IDEB, distorção idade-série, aprovação, abandono — por
// escola, com meta, e cruzados com o que o sistema já sabe do dia a dia.
// Nota baixa em escola que perdeu 12 dias de aula e tem cinco alunos em
// busca ativa não é mistério pedagógico.
//
// ── O QUE NÃO ENTRA AQUI ──
// Os 70% do FUNDEB para remuneração dos profissionais (Lei 14.113/2020,
// art. 26) já vivem em src/lib/minimos-constitucionais.ts, com a base
// informada pelo contador. Esta tela aponta para lá em vez de repetir.
//
// Nenhum valor de repasse vem escrito no código: o valor aluno/ano muda
// todo ano, por município, e inventá-lo seria vender certeza que não temos.

export const ETAPAS_RESULTADO = [
  { chave: "creche", rotulo: "Creche" },
  { chave: "pre_escola", rotulo: "Pré-escola" },
  { chave: "anos_iniciais", rotulo: "Anos iniciais (1º ao 5º)" },
  { chave: "anos_finais", rotulo: "Anos finais (6º ao 9º)" },
] as const;

export type EtapaResultado = (typeof ETAPAS_RESULTADO)[number]["chave"];

export function rotuloEtapa(chave: string): string {
  return ETAPAS_RESULTADO.find((e) => e.chave === chave)?.rotulo ?? chave;
}

/** "maior" = subir é bom (IDEB, aprovação). "menor" = subir é ruim (distorção, abandono). */
export type Sentido = "maior" | "menor";

export const INDICADORES_RESULTADO = [
  {
    chave: "ideb",
    nome: "IDEB",
    unidade: "",
    sentido: "maior" as Sentido,
    maximo: 10,
    explicacao: "Índice de Desenvolvimento da Educação Básica: aprendizado e fluxo juntos, de 0 a 10. Divulgado pelo INEP a cada dois anos, com meta projetada por escola.",
  },
  {
    chave: "distorcao",
    nome: "Distorção idade-série",
    unidade: "%",
    sentido: "menor" as Sentido,
    maximo: 100,
    explicacao: "Percentual de alunos com dois anos ou mais de atraso em relação à idade esperada para a série. Distorção alta hoje é abandono amanhã.",
  },
  {
    chave: "aprovacao",
    nome: "Taxa de aprovação",
    unidade: "%",
    sentido: "maior" as Sentido,
    maximo: 100,
    explicacao: "Alunos aprovados sobre o total de matriculados no ano. Entra no cálculo do IDEB como o componente de fluxo.",
  },
  {
    chave: "abandono",
    nome: "Taxa de abandono",
    unidade: "%",
    sentido: "menor" as Sentido,
    maximo: 100,
    explicacao: "Alunos que deixaram a escola durante o ano letivo. É o desfecho de quem a busca ativa não alcançou.",
  },
] as const;

export type IndicadorResultado = (typeof INDICADORES_RESULTADO)[number];
export type ChaveIndicador = IndicadorResultado["chave"];

export function indicadorPorChave(chave: string): IndicadorResultado | undefined {
  return INDICADORES_RESULTADO.find((i) => i.chave === chave);
}

export type SituacaoResultado = "atingido" | "perto" | "abaixo" | "sem_meta";

export const ROTULO_SITUACAO_RESULTADO: Record<SituacaoResultado, string> = {
  atingido: "Meta atingida",
  perto: "Perto da meta",
  abaixo: "Abaixo da meta",
  sem_meta: "Sem meta informada",
};

/** A que distância de "perto" a meta ainda conta como quase lá, em percentual da própria meta. */
const MARGEM_PERTO = 0.05;

export function situacaoDoResultado(valor: number, meta: number | null, sentido: Sentido): SituacaoResultado {
  if (meta === null) return "sem_meta";
  const atingiu = sentido === "maior" ? valor >= meta : valor <= meta;
  if (atingiu) return "atingido";
  const folga = Math.abs(meta) * MARGEM_PERTO;
  const quase = sentido === "maior" ? valor >= meta - folga : valor <= meta + folga;
  return quase ? "perto" : "abaixo";
}

/** Quanto falta para a meta, sempre positivo. null quando não há meta ou já foi atingida. */
export function distanciaDaMeta(valor: number, meta: number | null, sentido: Sentido): number | null {
  if (meta === null) return null;
  const falta = sentido === "maior" ? meta - valor : valor - meta;
  return falta > 0 ? Number(falta.toFixed(2)) : null;
}

export type Tendencia = "subiu" | "caiu" | "estavel" | "sem_serie";

/** Subir não é sempre melhorar: em distorção e abandono, subir é piorar. */
export function tendencia(atual: number, anterior: number | null, sentido: Sentido): Tendencia {
  if (anterior === null) return "sem_serie";
  const delta = atual - anterior;
  if (Math.abs(delta) < 0.05) return "estavel";
  const melhorou = sentido === "maior" ? delta > 0 : delta < 0;
  return melhorou ? "subiu" : "caiu";
}

/** Melhorou ou piorou, dito sem ambiguidade — a seta sozinha engana. */
export function rotuloTendencia(t: Tendencia, sentido: Sentido): string {
  if (t === "sem_serie") return "";
  if (t === "estavel") return "estável";
  const melhorou = t === "subiu";
  if (sentido === "maior") return melhorou ? "melhorou" : "piorou";
  return melhorou ? "melhorou (caiu)" : "piorou (subiu)";
}

// ── A LINHA DE CADA RESULTADO ──

export type LinhaResultado = {
  indicador: IndicadorResultado;
  escolaId: string | null;
  etapa: string;
  valor: number;
  meta: number | null;
  anterior: number | null;
  situacao: SituacaoResultado;
  distancia: number | null;
  tendencia: Tendencia;
};

type RegistroResultado = {
  escolaId: string | null;
  etapa: string;
  indicador: string;
  valor: number;
  meta: number | null;
};

const chaveDe = (r: { escolaId: string | null; etapa: string; indicador: string }) =>
  `${r.escolaId ?? ""}::${r.etapa}::${r.indicador}`;

export function montarResultados(doAno: RegistroResultado[], doAnterior: RegistroResultado[]): LinhaResultado[] {
  const antes = new Map(doAnterior.map((r) => [chaveDe(r), r.valor]));
  return doAno
    .map((r) => {
      const indicador = indicadorPorChave(r.indicador);
      if (!indicador) return null;
      const anterior = antes.get(chaveDe(r)) ?? null;
      return {
        indicador,
        escolaId: r.escolaId,
        etapa: r.etapa,
        valor: r.valor,
        meta: r.meta,
        anterior,
        situacao: situacaoDoResultado(r.valor, r.meta, indicador.sentido),
        distancia: distanciaDaMeta(r.valor, r.meta, indicador.sentido),
        tendencia: tendencia(r.valor, anterior, indicador.sentido),
      };
    })
    .filter((l): l is LinhaResultado => l !== null)
    .sort(
      (a, b) =>
        INDICADORES_RESULTADO.findIndex((i) => i.chave === a.indicador.chave) -
          INDICADORES_RESULTADO.findIndex((i) => i.chave === b.indicador.chave) ||
        a.etapa.localeCompare(b.etapa)
    );
}

/** O IDEB é divulgado a cada dois anos, nos anos ímpares. */
export function anosDeResultado(hoje: Date = new Date()): number[] {
  const ano = hoje.getUTCFullYear();
  return [ano, ano - 1, ano - 2, ano - 3, ano - 4];
}

// ── O GAP DE MATRÍCULA, EM REAIS ──

export type EscolaComMatricula = {
  id: string;
  nome: string;
  matriculasCenso: number | null;
  matriculasAtuais: number | null;
};

export type GapDeEscola = {
  escolaId: string;
  escolaNome: string;
  diferenca: number;
  reais: number | null;
};

export type ApuracaoFundeb = {
  valorAlunoAno: number | null;
  /** Escolas que informaram a matrícula de hoje. */
  comparaveis: number;
  declarados: number;
  atuais: number;
  /** Alunos atendidos e não declarados: repasse que o município não recebe. */
  alunosForaDaConta: number;
  reaisForaDaConta: number | null;
  /** Alunos declarados que a escola não tem mais: risco de glosa na auditoria. */
  alunosDeclaradosAMais: number;
  reaisEmRiscoDeGlosa: number | null;
  porEscola: GapDeEscola[];
  frase: string;
};

/** Diferença a partir da qual vale contar — abaixo disso é rotatividade normal. */
export const DIFERENCA_RELEVANTE = 5;

export function apurarFundebPorAluno(escolas: EscolaComMatricula[], valorAlunoAno: number | null): ApuracaoFundeb {
  const comparaveis = escolas.filter((e) => e.matriculasCenso !== null && e.matriculasAtuais !== null);
  const declarados = comparaveis.reduce((s, e) => s + (e.matriculasCenso ?? 0), 0);
  const atuais = comparaveis.reduce((s, e) => s + (e.matriculasAtuais ?? 0), 0);

  const porEscola = comparaveis
    .map((e) => {
      const diferenca = (e.matriculasAtuais ?? 0) - (e.matriculasCenso ?? 0);
      return {
        escolaId: e.id,
        escolaNome: e.nome,
        diferenca,
        reais: valorAlunoAno === null ? null : Math.abs(diferenca) * valorAlunoAno,
      };
    })
    .filter((g) => Math.abs(g.diferenca) >= DIFERENCA_RELEVANTE)
    .sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca));

  const alunosForaDaConta = porEscola.filter((g) => g.diferenca > 0).reduce((s, g) => s + g.diferenca, 0);
  const alunosDeclaradosAMais = porEscola.filter((g) => g.diferenca < 0).reduce((s, g) => s - g.diferenca, 0);
  const reaisForaDaConta = valorAlunoAno === null ? null : alunosForaDaConta * valorAlunoAno;
  const reaisEmRiscoDeGlosa = valorAlunoAno === null ? null : alunosDeclaradosAMais * valorAlunoAno;

  let frase: string;
  if (comparaveis.length === 0) {
    frase =
      "Nenhuma escola informou a matrícula de hoje. Sem esse número não dá para comparar com o que foi declarado ao Censo — e é essa diferença que vira dinheiro.";
  } else if (valorAlunoAno === null) {
    frase =
      alunosForaDaConta + alunosDeclaradosAMais === 0
        ? `Nas ${comparaveis.length} escola(s) comparáveis, a matrícula de hoje bate com a declarada ao Censo.`
        : `Informe o valor aluno/ano do FUNDEB para ver em reais o que os ${alunosForaDaConta + alunosDeclaradosAMais} aluno(s) de diferença representam.`;
  } else if (alunosForaDaConta > 0) {
    frase = `${alunosForaDaConta} aluno(s) estão sendo atendidos sem entrar na conta do FUNDEB — ${moeda(reaisForaDaConta!)} por ano que o município não recebe, pagando a despesa mesmo assim.`;
  } else if (alunosDeclaradosAMais > 0) {
    frase = `${alunosDeclaradosAMais} aluno(s) declarados ao Censo já não estão nas escolas — ${moeda(reaisEmRiscoDeGlosa!)} de repasse sobre matrícula que a auditoria pode glosar.`;
  } else {
    frase = `Nas ${comparaveis.length} escola(s) comparáveis, a matrícula de hoje bate com a declarada ao Censo. Nada em risco.`;
  }

  return {
    valorAlunoAno,
    comparaveis: comparaveis.length,
    declarados,
    atuais,
    alunosForaDaConta,
    reaisForaDaConta,
    alunosDeclaradosAMais,
    reaisEmRiscoDeGlosa,
    porEscola,
    frase,
  };
}

// ── O CRUZAMENTO ──
//
// A parte que nenhum painel de IDEB faz: explicar a nota com o que
// aconteceu na escola. O sistema já sabe quantos dias de aula se perderam
// e quantos alunos estão em busca ativa — dizer isso ao lado da nota é a
// diferença entre um número e uma conversa possível.

export type ContextoDaEscola = {
  diasPerdidos: number;
  casosBuscaAtiva: number;
  alunosAbaixoDaFrequencia: number;
  itensDeMerendaEmFalta: number;
};

/**
 * Uma frase que liga a nota ao dia a dia — só quando há o que ligar.
 * Devolve null quando nada no operacional explica o resultado: inventar
 * causa é pior do que não dizer nada.
 */
export function explicarResultado(linha: LinhaResultado, ctx: ContextoDaEscola): string | null {
  if (linha.situacao === "atingido" || linha.situacao === "sem_meta") return null;

  const pistas: string[] = [];
  if (ctx.diasPerdidos > 0) pistas.push(`${ctx.diasPerdidos} dia(s) de aula perdidos no ano`);
  if (ctx.alunosAbaixoDaFrequencia > 0) pistas.push(`${ctx.alunosAbaixoDaFrequencia} aluno(s) abaixo do mínimo de frequência`);
  else if (ctx.casosBuscaAtiva > 0) pistas.push(`${ctx.casosBuscaAtiva} aluno(s) em busca ativa`);
  if (ctx.itensDeMerendaEmFalta > 0) pistas.push(`${ctx.itensDeMerendaEmFalta} item(ns) de merenda em falta`);

  if (pistas.length === 0) return null;
  return `${linha.indicador.nome} abaixo da meta numa escola com ${juntar(pistas)}. O resultado não se explica sozinho — e nada disso é pedagógico.`;
}

function juntar(itens: string[]): string {
  if (itens.length === 1) return itens[0]!;
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

function moeda(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
