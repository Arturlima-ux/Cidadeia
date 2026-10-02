// ── OS COMPROMISSOS DE SERVIÇO ──
//
// O kit de contratação deixa prazos e disponibilidade em branco de propósito:
// prometer no papel o que a operação não sustenta cria inadimplemento
// contratual, não credibilidade.
//
// Mas havia dez brancos que ninguém conseguia preencher sem editar código, e
// três deles não eram decisão de negócio coisa nenhuma — eram fato apurável ou
// consequência direta da lei. Este arquivo separa as duas coisas.
//
//   APURADO   o valor sai da infraestrutura que já existe. Vem preenchido.
//   DEDUZIDO  o valor é consequência de um prazo legal. Vem preenchido, com a
//             dedução escrita ao lado para quem quiser conferir.
//   DECIDIDO  é compromisso de negócio. Fica NULL até alguém decidir, e o kit
//             continua mostrando o marcador e listando a pendência.
//
// A regra é a mesma de lib/empresa.ts: enquanto o dado não existir, ele não
// aparece. Nada é inventado e nada é fingido.

export type OrigemCompromisso = "apurado" | "deduzido" | "decidido";

export type Compromisso = {
  marcador: string;
  valor: string | null;
  origem: OrigemCompromisso;
  /** Por que este valor, para quem for conferir. */
  fundamento: string;
};

/**
 * Onde os dados ficam.
 *
 * ── APURADO, E CONFERÍVEL ──
 *
 * O banco roda em AWS sa-east-1 (São Paulo), o que se lê no próprio endereço
 * do pooler do Supabase. A aplicação rodava em iad1 (Washington) por ser o
 * padrão de fábrica da Vercel, o que se lia no cabeçalho X-Vercel-Id de
 * qualquer resposta: "gru1::iad1" — pedido recebido em São Paulo, função
 * executada nos Estados Unidos.
 *
 * Isso foi corrigido em vercel.json ("regions": ["gru1"]), e o cabeçalho passou
 * a dizer "gru1::gru1". Antes da correção, declarar "os dados ficam no Brasil"
 * seria afirmação incompleta: dado em repouso aqui, processado fora, é
 * transferência internacional (art. 33 da LGPD) — e é a primeira coisa que o
 * jurídico da prefeitura pergunta.
 */
export const HOSPEDAGEM =
  "Supabase sobre AWS, região de São Paulo (sa-east-1), para o banco de dados, e " +
  "Vercel, região de São Paulo (gru1), para a aplicação. Os dados não deixam o território nacional.";

/**
 * Em quanto tempo a operadora comunica um incidente ao município.
 *
 * ── DEDUZIDO DO PRAZO DO CONTROLADOR ──
 *
 * O município é o CONTROLADOR e tem três dias úteis para comunicar um incidente
 * à ANPD, contados de quando toma conhecimento de que dados pessoais foram
 * afetados (art. 48 da LGPD e Resolução CD/ANPD nº 15, de 24 de abril de 2024).
 *
 * A CidadeIA é a OPERADORA. Se ela avisasse o município em três dias úteis, o
 * município já teria perdido o prazo dele no mesmo instante — o relógio dele só
 * começa quando ele sabe.
 *
 * Por isso o prazo da operadora não é uma escolha comercial: é o que precisa
 * caber dentro do prazo do controlador com folga para ele apurar e redigir.
 * Vinte e quatro horas deixam ao município praticamente os três dias inteiros.
 */
// ── A UNIDADE MORA NO DOCUMENTO, O VALOR É NU ──
//
// Primeira versão: "24 (vinte e quatro) horas". A cláusula já dizia "em até
// [PRAZO DE INCIDENTE] horas da ciência", e o resultado foi para produção como
// "em até 24 (vinte e quatro) horas horas da ciência".
//
// A convenção vale para todos: a tabela de severidade diz "[RESPOSTA CRÍTICA]
// horas úteis" e o prazo de devolução diz "em até [PRAZO DE DEVOLUÇÃO] dias".
// Se o valor carregasse a unidade, todos dobrariam. Há teste travando isso.
export const PRAZO_INCIDENTE = "24 (vinte e quatro)";

export const FUNDAMENTO_INCIDENTE =
  "O município, como controlador, tem 3 dias úteis para comunicar a ANPD (art. 48 da LGPD e " +
  "Resolução CD/ANPD nº 15/2024), contados de quando souber. O prazo da operadora precisa caber " +
  "dentro do dele, com folga para apurar e redigir — não é escolha comercial.";

const doAmbiente = (nome: string) => process.env[nome]?.trim() || null;

/**
 * O catálogo completo, com origem e fundamento de cada um.
 *
 * Os `decidido` leem variável de ambiente para poderem ser preenchidos em
 * produção sem novo deploy, igual à identificação da empresa.
 */
export const COMPROMISSOS: Compromisso[] = [
  {
    marcador: "[HOSPEDAGEM]",
    valor: doAmbiente("NEXT_PUBLIC_HOSPEDAGEM") ?? HOSPEDAGEM,
    origem: "apurado",
    fundamento:
      "Lido da infraestrutura: endereço do pooler do Supabase (sa-east-1) e cabeçalho X-Vercel-Id " +
      "das respostas (gru1). Conferível por qualquer um a partir de uma resposta do site.",
  },
  {
    marcador: "[PRAZO DE INCIDENTE]",
    valor: doAmbiente("NEXT_PUBLIC_PRAZO_INCIDENTE") ?? PRAZO_INCIDENTE,
    origem: "deduzido",
    fundamento: FUNDAMENTO_INCIDENTE,
  },
  // ── DAQUI PARA BAIXO, DECISÃO DE NEGÓCIO ──
  //
  // Ficam NULL de propósito. Preencher por conta própria seria inventar
  // compromisso em nome de quem vai responder por ele — exatamente o que este
  // produto não faz com número nenhum.
  {
    marcador: "[DISPONIBILIDADE]",
    valor: doAmbiente("NEXT_PUBLIC_DISPONIBILIDADE"),
    origem: "decidido",
    fundamento:
      "Atenção antes de preencher: o Supabase não oferece SLA de disponibilidade nos planos " +
      "Free, Pro ou Team — só no Enterprise. Prometer um percentual aqui é assumir sozinho um " +
      "risco que o fornecedor não garante, com multa atrelada no [DESCONTO].",
  },
  {
    marcador: "[DESCONTO]",
    valor: doAmbiente("NEXT_PUBLIC_DESCONTO"),
    origem: "decidido",
    fundamento: "É a penalidade da [DISPONIBILIDADE]. Os dois se decidem juntos ou nenhum dos dois.",
  },
  {
    marcador: "[RESPOSTA CRÍTICA]",
    valor: doAmbiente("NEXT_PUBLIC_RESPOSTA_CRITICA"),
    origem: "decidido",
    fundamento: "Horas úteis até a primeira resposta quando o serviço está inacessível.",
  },
  {
    marcador: "[SOLUÇÃO CRÍTICA]",
    valor: doAmbiente("NEXT_PUBLIC_SOLUCAO_CRITICA"),
    origem: "decidido",
    fundamento: "Horas úteis até a solução de um chamado crítico.",
  },
  {
    marcador: "[RESPOSTA ALTA]",
    valor: doAmbiente("NEXT_PUBLIC_RESPOSTA_ALTA"),
    origem: "decidido",
    fundamento: "Horas úteis até a primeira resposta em severidade alta.",
  },
  {
    marcador: "[SOLUÇÃO ALTA]",
    valor: doAmbiente("NEXT_PUBLIC_SOLUCAO_ALTA"),
    origem: "decidido",
    fundamento: "Horas úteis até a solução em severidade alta.",
  },
  {
    marcador: "[RESPOSTA MÉDIA]",
    valor: doAmbiente("NEXT_PUBLIC_RESPOSTA_MEDIA"),
    origem: "decidido",
    fundamento: "Horas úteis até a primeira resposta em severidade média.",
  },
  {
    marcador: "[SOLUÇÃO MÉDIA]",
    valor: doAmbiente("NEXT_PUBLIC_SOLUCAO_MEDIA"),
    origem: "decidido",
    fundamento: "Dias úteis até a solução em severidade média.",
  },
  {
    marcador: "[RESPOSTA BAIXA]",
    valor: doAmbiente("NEXT_PUBLIC_RESPOSTA_BAIXA"),
    origem: "decidido",
    fundamento: "Dias úteis até a primeira resposta em severidade baixa.",
  },
  {
    marcador: "[PRAZO DE DEVOLUÇÃO]",
    valor: doAmbiente("NEXT_PUBLIC_PRAZO_DEVOLUCAO"),
    origem: "decidido",
    fundamento:
      "Dias para devolver a base completa ao município depois do fim do contrato. Não há prazo " +
      "legal fixo, mas a exportação já funciona a qualquer momento pelo próprio painel — o prazo " +
      "aqui é o da entrega formal, não o da disponibilidade do dado.",
  },
];

/** Mapa marcador → valor, só dos que têm valor. */
export function valoresDefinidos(): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of COMPROMISSOS) if (c.valor) m.set(c.marcador, c.valor);
  return m;
}

/**
 * Substitui num texto os marcadores que já têm valor.
 *
 * Os que não têm ficam como estão — e continuam aparecendo na lista de
 * pendências. É o que impede o documento de sair com um número inventado no
 * lugar de uma decisão que ninguém tomou.
 */
export function preencherCompromissos(texto: string): string {
  let saida = texto;
  for (const [marcador, valor] of valoresDefinidos()) {
    saida = saida.split(marcador).join(valor);
  }
  return saida;
}

export function compromissoDe(marcador: string): Compromisso | undefined {
  return COMPROMISSOS.find((c) => c.marcador === marcador);
}

/** Os que ainda dependem de uma decisão. */
export function pendentesDeDecisao(): Compromisso[] {
  return COMPROMISSOS.filter((c) => !c.valor);
}
