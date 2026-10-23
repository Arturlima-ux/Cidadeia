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

// ── O LIMITE É DO ANO, E NÃO DE CADA MÓDULO ──
//
// O site vende por módulo, e cada um sozinho cabe folgado na dispensa. A
// revisão de outubro de 2026 lembrou o risco: se a prefeitura contratar os
// módulos em separado, ao longo do ano, cada contrato não abre uma dispensa
// nova. O art. 75, § 1º, manda somar o que a mesma unidade gestora gastar no
// exercício com objetos da mesma natureza, e software de gestão é um ramo
// só. O site tem de orientar isso, e não sugerir o contrário.
export const AVISO_FRACIONAMENTO = {
  curto: "O limite vale para a soma do ano: módulos contratados em separado contam juntos.",
  completo:
    "O limite vale para a soma do ano, e não para cada contrato: tudo o que a mesma unidade gestora contratar no exercício em software de gestão conta junto, inclusive o de outros fornecedores e módulos acrescentados depois. Contratar módulo por módulo não abre uma dispensa nova para cada um.",
  base: "Art. 75, § 1º, da Lei 14.133/2021",
} as const;

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
      "Contratação direta quando o valor anual fica abaixo do limite, sem edital nem sessão pública. Na dispensa eletrônica, um aviso fica aberto 3 dias úteis para outras propostas, e a prefeitura escolhe a mais vantajosa (art. 75, § 3º).",
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
    // Dizia o caminho como se estivesse aberto. Não há, hoje, ata de registro
    // de preços com o CidadeIA (revisão de outubro de 2026): a adesão só
    // existe quando outro órgão tiver uma.
    resumo:
      "A prefeitura adere à ata de registro de preços de outro órgão. Hoje não há ata vigente com o CidadeIA; este caminho só se abre quando houver uma.",
    base: "Lei 14.133/2021, art. 86 — depende de ata vigente",
  },
];
