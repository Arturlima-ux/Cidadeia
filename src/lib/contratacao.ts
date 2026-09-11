// ── COMO UMA PREFEITURA PODE CONTRATAR ──
//
// O que mais trava venda para o poder público não é a decisão, é o processo:
// o secretário quer contratar e não sabe por qual caminho legal pode fazer
// isso. Este módulo concentra essa informação para que a home responda a
// pergunta em vez de mandar "solicite uma demonstração".

/**
 * Limite de dispensa de licitação por valor.
 *
 * IMPORTANTE: este valor é REAJUSTADO TODO ANO por decreto (a Lei
 * 14.133/2021 manda atualizar pelo IPCA-E). Fica isolado aqui de propósito —
 * em janeiro é uma linha para corrigir, e não um número espalhado por
 * páginas de marketing. Se passar do ano de vigência sem atualizar, o site
 * publica informação errada sobre contratação pública, o que é bem pior do
 * que ficar desatualizado em qualquer outro texto.
 */
export const LIMITE_DISPENSA = {
  valor: 65492.11,
  ano: 2026,
  base: "Art. 75, II, da Lei 14.133/2021",
  atualizadoPor: "Decreto nº 12.807/2025",
  vigenteDesde: "1º de janeiro de 2026",
} as const;

/** true quando o valor de referência ainda é o do ano corrente. */
export function limiteEstaVigente(hoje: Date = new Date()): boolean {
  return hoje.getFullYear() === LIMITE_DISPENSA.ano;
}

export type CaminhoContratacao = "dispensa" | "pregao";

/**
 * Qual caminho serve para um contrato de determinado valor ANUAL.
 *
 * O parâmetro é o total de 12 meses, e não o mensal, por um motivo legal:
 * o art. 75 veda o fracionamento da despesa para enquadrar artificialmente
 * uma contratação na dispensa. Comparar o valor mensal com o limite anual
 * seria exatamente o fracionamento que a lei proíbe — e sugerir isso a uma
 * prefeitura é criar problema para o cliente, não facilitar a venda.
 */
export function caminhoSugerido(totalAnual: number): CaminhoContratacao {
  return totalAnual <= LIMITE_DISPENSA.valor ? "dispensa" : "pregao";
}

export function cabeNaDispensa(totalAnual: number): boolean {
  return caminhoSugerido(totalAnual) === "dispensa";
}

export type DescricaoCaminho = {
  chave: CaminhoContratacao | "adesao";
  nome: string;
  resumo: string;
  base: string;
};

export const CAMINHOS: DescricaoCaminho[] = [
  {
    chave: "dispensa",
    nome: "Dispensa por valor",
    resumo:
      // Dizia "é o caminho da maioria dos municípios de pequeno porte" —
      // estatística que ninguém mediu, num site que vende conformidade. O
      // que dá para afirmar é o que a lei diz: abaixo do limite, sem edital.
      "Contratação direta quando o valor anual fica abaixo do limite — sem edital, sem sessão pública, com o processo montado em dias.",
    base: LIMITE_DISPENSA.base,
  },
  {
    chave: "pregao",
    nome: "Pregão eletrônico",
    resumo:
      "Para contratações acima do limite de dispensa, ou quando a prefeitura prefere licitar. O termo de referência vai pronto.",
    base: "Lei 14.133/2021 — sem limite de valor",
  },
  {
    chave: "adesao",
    nome: "Adesão a ata",
    resumo:
      "A prefeitura adere a uma ata de registro de preços já existente, aproveitando um processo que outro órgão conduziu.",
    base: "Ata de registro de preços vigente",
  },
];
