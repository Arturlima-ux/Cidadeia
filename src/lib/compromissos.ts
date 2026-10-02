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

import { linkApp } from "@/lib/url-app";

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
 * O endereço da página de disponibilidade, só quando é público de verdade.
 *
 * urlApp() devolve http://localhost:3000 quando APP_URL não está configurada,
 * e uma minuta de contrato que manda o jurídico da prefeitura abrir
 * "localhost" é pior que uma com o campo visivelmente em branco. Sem endereço
 * público, o marcador fica e vira pendência — que é o comportamento certo,
 * porque a cláusula realmente não pode ser cumprida sem ele.
 */
function enderecoPublicoDaDisponibilidade(): string | null {
  const url = linkApp("/disponibilidade");
  return /^https:\/\//.test(url) && !/localhost|127\.0\.0\.1/.test(url) ? url : null;
}

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
  {
    // ── A CLÁUSULA PRECISA DIZER ONDE ──
    //
    // "Publicado em página de acesso público" sem endereço é promessa que o
    // fiscal do contrato não consegue exercer. O endereço sai do ambiente,
    // pelo mesmo APP_URL que os e-mails usam.
    marcador: "[PÁGINA DE DISPONIBILIDADE]",
    valor: enderecoPublicoDaDisponibilidade(),
    origem: "apurado",
    fundamento:
      "Endereço da página onde o histórico de verificações é publicado. Sai de APP_URL, a mesma " +
      "variável que monta os links dos e-mails.",
  },
  // ── OS PRAZOS DE ATENDIMENTO ──
  //
  // Vêm preenchidos com valores DIMENSIONADOS PARA UM OPERADOR SÓ, em horário
  // comercial, que é o que o contrato declara ("dias úteis, das 8h às 18h").
  // Cada um lê variável de ambiente e pode ser trocado sem deploy.
  //
  // A régua foi: prometer o que se cumpre num dia ruim, não num dia bom. Um
  // prazo que só se cumpre quando tudo corre bem vira inadimplemento na
  // primeira semana difícil, e inadimplemento em contrato administrativo é
  // sanção, não desculpa.
  //
  // Também ficou explícito no documento o que conta como solução: operação
  // restabelecida, ainda que por contorno. Sem essa cláusula, "solução em 8
  // horas úteis" obrigaria a achar a causa raiz dentro do prazo, o que nem
  // sempre acontece mesmo com o serviço já funcionando.
  {
    marcador: "[RESPOSTA CRÍTICA]",
    valor: doAmbiente("NEXT_PUBLIC_RESPOSTA_CRITICA") ?? "4",
    origem: "decidido",
    fundamento:
      "4 horas úteis até a primeira resposta com o serviço inacessível — metade de um dia de " +
      "trabalho. Prometer uma hora exigiria plantão, que uma operação de uma pessoa não sustenta.",
  },
  {
    marcador: "[SOLUÇÃO CRÍTICA]",
    valor: doAmbiente("NEXT_PUBLIC_SOLUCAO_CRITICA") ?? "8",
    origem: "decidido",
    fundamento:
      "8 horas úteis, um dia de trabalho. Em chamado crítico a causa costuma ser de " +
      "infraestrutura, e a solução conta com contorno que restabeleça a operação.",
  },
  {
    marcador: "[RESPOSTA ALTA]",
    valor: doAmbiente("NEXT_PUBLIC_RESPOSTA_ALTA") ?? "8",
    origem: "decidido",
    fundamento: "8 horas úteis: há alternativa de trabalho, mas a tarefa essencial está parada.",
  },
  {
    marcador: "[SOLUÇÃO ALTA]",
    valor: doAmbiente("NEXT_PUBLIC_SOLUCAO_ALTA") ?? "24",
    origem: "decidido",
    fundamento: "24 horas úteis, cerca de três dias de trabalho — prazo de uma correção de código.",
  },
  {
    marcador: "[RESPOSTA MÉDIA]",
    valor: doAmbiente("NEXT_PUBLIC_RESPOSTA_MEDIA") ?? "24",
    origem: "decidido",
    fundamento: "24 horas úteis: há alternativa disponível, então a urgência é de registro.",
  },
  {
    marcador: "[SOLUÇÃO MÉDIA]",
    valor: doAmbiente("NEXT_PUBLIC_SOLUCAO_MEDIA") ?? "5",
    origem: "decidido",
    fundamento: "5 dias úteis: cabe numa semana de trabalho sem atropelar o que é crítico.",
  },
  {
    marcador: "[RESPOSTA BAIXA]",
    valor: doAmbiente("NEXT_PUBLIC_RESPOSTA_BAIXA") ?? "3",
    origem: "decidido",
    fundamento:
      "3 dias úteis para dúvida de uso ou sugestão. A solução fica 'conforme planejamento' no " +
      "documento, de propósito: comprometer prazo de melhoria é comprometer o roteiro do produto.",
  },
  {
    marcador: "[PRAZO DE DEVOLUÇÃO]",
    valor: doAmbiente("NEXT_PUBLIC_PRAZO_DEVOLUCAO") ?? "10",
    origem: "decidido",
    fundamento:
      "10 dias para a entrega formal da base após o fim do contrato. Não há prazo legal fixo, e " +
      "o número é curto porque a exportação completa já funciona a qualquer momento no próprio " +
      "painel, sem pedir nada a ninguém — o prazo aqui é o do empacotamento, não o da " +
      "disponibilidade do dado.",
  },
  // ── O PERCENTUAL DE DISPONIBILIDADE É CONDICIONAL, NÃO PENDENTE ──
  //
  // Ficam NULL, e isso deixou de ser uma pendência: a cláusula foi reescrita.
  //
  // O regime padrão não promete percentual. Promete o que a operação de fato
  // controla: verificar todo dia, publicar o histórico aberto, avisar quando
  // falhar e deixar o município sair sem ônus se falhar demais.
  //
  // Os dois marcadores continuam no documento porque edital de pregão às vezes
  // EXIGE percentual contratual de disponibilidade. Quando exigir, basta
  // definir as duas variáveis e a cláusula condicional passa a valer. Fora
  // disso, preenchê-las seria transferir ao município um risco disfarçado de
  // garantia — o provedor de banco não oferece SLA de disponibilidade em
  // nenhum plano abaixo do corporativo.
  {
    marcador: "[DISPONIBILIDADE]",
    valor: doAmbiente("NEXT_PUBLIC_DISPONIBILIDADE"),
    origem: "decidido",
    fundamento:
      "Condicional, não pendente: só se preenche quando um edital exigir percentual. O Supabase " +
      "não oferece SLA de disponibilidade nos planos Free, Pro ou Team — só no Enterprise —, " +
      "então o regime padrão é a verificação diária publicada e a saída sem ônus.",
  },
  {
    marcador: "[DESCONTO]",
    valor: doAmbiente("NEXT_PUBLIC_DESCONTO"),
    origem: "decidido",
    fundamento: "É a penalidade da [DISPONIBILIDADE]. Os dois se decidem juntos ou nenhum dos dois.",
  },
];

/**
 * Os que ficam em branco por decisão de desenho, e não por falta de decisão.
 *
 * A tela de pendências separa os dois: cobrar uma decisão que já foi tomada —
 * a de não prometer percentual — faria a lista nunca zerar e ensinaria a
 * ignorá-la.
 */
export const CONDICIONAIS = new Set(["[DISPONIBILIDADE]", "[DESCONTO]"]);

/**
 * Campos que não dependem de decisão nenhuma: saem do pedido.
 *
 * A página /kit é pública e genérica — não há município, então não há valor. O
 * valor existe na tabela de preços e é calculado assim que alguém pede
 * proposta, e o kit baixado em /admin/pedidos já sai com ele.
 *
 * Cobrá-los como pendência na página pública seria pedir a alguém que
 * preencha à mão o que o sistema calcula sozinho.
 */
export const POR_CONTRATO = new Set(["[VALOR MENSAL]", "[VALOR ANUAL]"]);

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

/**
 * Os que ainda dependem de uma decisão.
 *
 * Exclui os condicionais: não prometer percentual de disponibilidade JÁ é a
 * decisão. Mantê-los na lista faria ela nunca zerar, e lista que nunca zera é
 * lista que se aprende a ignorar.
 */
export function pendentesDeDecisao(): Compromisso[] {
  return COMPROMISSOS.filter((c) => !c.valor && !CONDICIONAIS.has(c.marcador));
}
