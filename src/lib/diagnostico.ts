// ── DIAGNÓSTICO DE CONFORMIDADE ──
//
// A única prova que funciona antes de existir o primeiro cliente.
//
// Um muro de logos e um depoimento de secretário são o que as incumbentes
// usam para converter, e nós não temos nenhum dos dois. O que temos é
// conhecimento da obrigação legal — e a maioria das prefeituras pequenas
// não sabe exatamente quais exigências já descumpre. Este módulo transforma
// isso numa ferramenta útil: o gestor responde, e sai uma lista das
// pendências com o artigo que as cria.
//
// REGRA QUE NÃO PODE SER QUEBRADA: são as respostas DELE. Nada aqui
// inspeciona o site do município nem afirma o que a prefeitura faz — não
// temos como verificar isso, e inventar um veredito sobre um órgão público
// seria fabricar registro. O diagnóstico vale porque é honesto sobre isso.
//
// A segunda regra é o campo `resolvemos`. Parte das exigências abaixo o
// CidadeIA NÃO atende, e isso está escrito na cara do gestor. Uma lista em
// que tudo por acaso é resolvido pelo produto que a publicou não convence
// ninguém que já viu uma proposta comercial.
//
// O número diminui quando o produto de fato passa a resolver algo — foi o que
// aconteceu com a estrutura das secretarias e a Carta de Serviços quando o
// painel de publicações foi construído. O que não pode acontecer é diminuir
// porque alguém quis melhorar a conversão.

export type Bloco = "transparencia" | "atendimento" | "dados" | "protecao";

export const NOME_BLOCO: Record<Bloco, string> = {
  transparencia: "Transparência ativa",
  atendimento: "Atendimento ao cidadão",
  dados: "Dados abertos e execução orçamentária",
  protecao: "Proteção de dados pessoais",
};

export type Exigencia = {
  id: string;
  bloco: Bloco;
  /** Escrita como o gestor pensa, não como a lei escreve. */
  pergunta: string;
  lei: string;
  artigo: string;
  /** O que a omissão expõe. É daqui que sai a urgência — e é verdade. */
  risco: string;
  /** Se o CidadeIA entrega isso. Quando false, o texto diz o que falta. */
  resolvemos: boolean;
  comoResolve: string;
};

export const EXIGENCIAS: Exigencia[] = [
  // ── transparência ativa ──
  {
    id: "estrutura",
    bloco: "transparencia",
    pergunta:
      "O site publica a estrutura de cada secretaria, com endereço, telefone e horário de atendimento?",
    lei: "Lei 12.527/2011 (LAI)",
    artigo: "art. 8º, § 1º, I",
    risco:
      "É o item que o cidadão mais aciona em pedido de informação, e o primeiro que a corregedoria confere.",
    resolvemos: true,
    comoResolve:
      "O painel de publicações tem campos próprios para secretaria, endereço, telefone e horário, e eles aparecem no portal público. O conteúdo é da prefeitura, como a lista de obras também é — o que entregamos é onde publicar e a garantia de que fica no ar.",
  },
  {
    id: "despesas",
    bloco: "transparencia",
    pergunta:
      "As despesas do município estão numa página aberta, que abre sem cadastro e sem login?",
    lei: "Lei 12.527/2011 (LAI)",
    artigo: "art. 8º, § 1º, III",
    risco:
      "Exigir cadastro para ver despesa é, por si só, descumprimento — a lei veda condicionar o acesso à identificação.",
    resolvemos: true,
    comoResolve:
      "O portal tem endereço público próprio do município e abre sem nenhum cadastro.",
  },
  {
    id: "licitacoes",
    bloco: "transparencia",
    pergunta:
      "Editais, resultados de licitação e contratos celebrados estão publicados e acessíveis?",
    lei: "Lei 12.527/2011 (LAI)",
    artigo: "art. 8º, § 1º, IV",
    risco: "É a informação mais pedida por imprensa local e por concorrente derrotado.",
    resolvemos: true,
    comoResolve: "O módulo de Licitações publica no portal o que é cadastrado no sistema.",
  },
  {
    id: "obras",
    bloco: "transparencia",
    pergunta: "O cidadão consegue acompanhar o andamento das obras do município?",
    lei: "Lei 12.527/2011 (LAI)",
    artigo: "art. 8º, § 1º, V",
    risco:
      "Obra parada sem informação pública é a origem mais comum de representação no Ministério Público.",
    resolvemos: true,
    comoResolve: "O módulo de Obras publica situação e andamento de cada obra no portal.",
  },

  // ── atendimento ──
  {
    id: "sic",
    bloco: "atendimento",
    pergunta:
      "Existe um canal eletrônico em que o cidadão pede informação e recebe número de protocolo?",
    lei: "Lei 12.527/2011 (LAI)",
    artigo: "art. 9º e art. 10, § 2º",
    risco:
      "Sem protocolo não há como provar que o pedido foi respondido no prazo de 20 dias do art. 11.",
    resolvemos: true,
    comoResolve: "Protocolo emitido na hora, com número e chave privada de consulta.",
  },
  {
    id: "acompanhamento",
    bloco: "atendimento",
    pergunta:
      "O cidadão acompanha sozinho o andamento do pedido, sem precisar ligar para a prefeitura?",
    lei: "Lei 13.460/2017",
    artigo: "art. 10, VI",
    risco:
      "Todo pedido sem acompanhamento vira ligação para o protocolo — o custo aparece no atendimento, não no processo.",
    resolvemos: true,
    comoResolve:
      "A chave de consulta entregue na abertura permite consultar o andamento sem login.",
  },
  {
    id: "anonima",
    bloco: "atendimento",
    pergunta:
      "A ouvidoria aceita denúncia sem identificação, com protocolo que não dá para enumerar em sequência?",
    lei: "Lei 13.460/2017",
    artigo: "art. 10",
    risco:
      "Protocolo sequencial permite descobrir quantas denúncias existem e adivinhar as vizinhas — anula a proteção do denunciante.",
    resolvemos: true,
    comoResolve: "Denúncia anônima aceita, com protocolo aleatório e sem coleta de identificação.",
  },
  {
    id: "carta",
    bloco: "atendimento",
    pergunta:
      "O município divulga a Carta de Serviços ao Usuário, com os serviços prestados e o prazo de cada um?",
    lei: "Lei 13.460/2017",
    artigo: "art. 7º",
    risco:
      "É obrigação de todo órgão público e uma das menos cumpridas por município pequeno.",
    resolvemos: true,
    comoResolve:
      "Cada serviço é publicado com os campos que o art. 7º exige: o que o cidadão precisa levar, o prazo de atendimento e onde solicitar. O conjunto deles forma a Carta no portal. O levantamento dos serviços continua sendo da prefeitura — nós damos a estrutura que impede publicar pela metade.",
  },

  // ── dados abertos ──
  {
    id: "tempo_real",
    bloco: "dados",
    pergunta:
      "A execução orçamentária e financeira fica disponível ao cidadão em tempo real?",
    lei: "Lei Complementar 101/2000 (LRF)",
    artigo: "art. 48, § 1º, II, com a redação da LC 131/2009",
    risco:
      "É a exigência que o Tribunal de Contas mais cobra do município, e a que costuma gerar ressalva em parecer prévio.",
    resolvemos: true,
    comoResolve:
      "O portal mostra o que está lançado no sistema, sem etapa manual de publicação entre o lançamento e o cidadão.",
  },
  {
    id: "formato_aberto",
    bloco: "dados",
    pergunta:
      "Os dados publicados podem ser baixados em formato aberto, legível por máquina, como CSV ou JSON?",
    lei: "Lei 12.527/2011 (LAI)",
    artigo: "art. 8º, § 3º, II e III",
    risco:
      "PDF de imagem não cumpre a lei. O texto exige formato que permita processamento automatizado.",
    resolvemos: true,
    comoResolve: "Exportação em CSV e JSON a qualquer momento, sem custo e sem pedir autorização.",
  },
  {
    id: "acessibilidade",
    bloco: "dados",
    pergunta: "O conteúdo do portal é acessível a pessoas com deficiência?",
    lei: "Lei 12.527/2011 (LAI)",
    artigo: "art. 8º, § 3º, VIII",
    risco:
      "Cobrado em ação civil pública e em avaliação de transparência de tribunal de contas.",
    resolvemos: false,
    comoResolve:
      "Entregamos foco visível e navegação por teclado, mas ainda não passamos por auditoria de acessibilidade. Não vamos afirmar conformidade que não medimos.",
  },

  // ── proteção de dados ──
  {
    id: "encarregado",
    bloco: "protecao",
    pergunta:
      "O município indicou publicamente o encarregado pelo tratamento de dados, com contato divulgado?",
    lei: "Lei 13.709/2018 (LGPD)",
    artigo: "art. 41, § 1º",
    risco:
      "Sem encarregado indicado, o município não tem a quem endereçar pedido de titular nem incidente de segurança.",
    resolvemos: false,
    comoResolve:
      "A indicação é ato do município. Fornecemos o acordo de tratamento de dados no kit, mas não nomeamos o encarregado.",
  },
  {
    id: "segregacao",
    bloco: "protecao",
    pergunta:
      "Os dados pessoais dos cidadãos ficam separados por município, com acesso limitado por perfil de servidor?",
    lei: "Lei 13.709/2018 (LGPD)",
    artigo: "art. 46",
    risco:
      "Servidor de uma secretaria enxergando dado pessoal de outra é incidente de segurança comunicável à ANPD.",
    resolvemos: true,
    comoResolve:
      "Cada secretário enxerga apenas a própria área; o consolidado fica restrito ao prefeito.",
  },
];

export type Resposta = "sim" | "nao" | "nao_sei";

export type Nivel = "critico" | "atencao" | "adequado";

export const NOME_NIVEL: Record<Nivel, string> = {
  critico: "Situação crítica",
  atencao: "Pontos a corrigir",
  adequado: "Situação adequada",
};

export type Resultado = {
  total: number;
  conformes: number;
  /** Respondidas "não" — pendência assumida. */
  pendentes: Exigencia[];
  /**
   * Respondidas "não sei". Separadas de propósito: não saber é achado por si
   * só. Se o gestor não sabe, ele também não consegue provar ao Tribunal de
   * Contas, e a pergunta continua aberta.
   */
  incertas: Exigencia[];
  /** Das pendências e incertezas, as que o CidadeIA resolve. */
  cobertas: Exigencia[];
  /** As que continuam com a prefeitura mesmo contratando. */
  descobertas: Exigencia[];
  nivel: Nivel;
};

/**
 * Nível a partir da proporção de exigências atendidas.
 *
 * "Não sei" NÃO conta como atendida. Isso é deliberado: o diagnóstico serve
 * para o gestor levar a um Tribunal de Contas, e lá a resposta "eu achava
 * que sim" tem o mesmo peso que "não".
 */
export function avaliar(respostas: Partial<Record<string, Resposta>>): Resultado {
  const pendentes: Exigencia[] = [];
  const incertas: Exigencia[] = [];
  let conformes = 0;

  for (const e of EXIGENCIAS) {
    const r = respostas[e.id];
    if (r === "sim") conformes += 1;
    else if (r === "nao") pendentes.push(e);
    else if (r === "nao_sei") incertas.push(e);
  }

  const abertas = [...pendentes, ...incertas];
  const proporcao = conformes / EXIGENCIAS.length;

  return {
    total: EXIGENCIAS.length,
    conformes,
    pendentes,
    incertas,
    cobertas: abertas.filter((e) => e.resolvemos),
    descobertas: abertas.filter((e) => !e.resolvemos),
    nivel: proporcao >= 0.85 ? "adequado" : proporcao >= 0.6 ? "atencao" : "critico",
  };
}

export function exigenciasDoBloco(bloco: Bloco): Exigencia[] {
  return EXIGENCIAS.filter((e) => e.bloco === bloco);
}

export const BLOCOS: Bloco[] = ["transparencia", "atendimento", "dados", "protecao"];

/** Quantas exigências o produto realmente cobre — usado no texto da página. */
export function totalQueResolvemos(): number {
  return EXIGENCIAS.filter((e) => e.resolvemos).length;
}
