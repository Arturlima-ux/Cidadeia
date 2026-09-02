// ── PUBLICAÇÕES DO PORTAL DA TRANSPARÊNCIA ──
//
// O portal já mostrava o que o sistema CALCULA — execução orçamentária, obras,
// licitações — mas a prefeitura não tinha onde publicar nada por conta
// própria. Faltava metade de um portal da transparência: a metade em que o
// gestor conta o que está sendo feito e cumpre as exigências de conteúdo que a
// LAI lista uma a uma.
//
// Os dois lados são o mesmo dado, com permissões opostas: o prefeito e o
// secretário publicam e editam pelo painel; o cidadão lê no endereço público e
// não altera nada.
//
// ── POR QUE OS TIPOS SÃO FECHADOS ──
//
// Um campo de texto livre seria um blog, e blog não cumpre a LAI. Cada tipo
// aqui corresponde a um inciso do art. 8º ou a um artigo da Lei 13.460 — é o
// que permite a tela dizer ao gestor QUAL obrigação ele está atendendo, e o
// que permite o diagnóstico contar como resolvido só o que de fato foi
// publicado.

export type TipoPublicacao =
  | "comunicado"
  | "servico"
  | "estrutura"
  | "faq"
  | "repasse"
  | "documento";

export type DefinicaoTipo = {
  chave: TipoPublicacao;
  nome: string;
  /** O que o gestor escreve ali. Aparece como ajuda no formulário. */
  descricao: string;
  /** Como a seção se chama no portal público. */
  tituloPublico: string;
  lei: string | null;
  artigo: string | null;
  /** Tipos com campos extras exigidos por lei. */
  estruturado: boolean;
};

export const TIPOS_PUBLICACAO: DefinicaoTipo[] = [
  {
    chave: "comunicado",
    nome: "Comunicado",
    descricao:
      "O que está sendo feito agora: início de obra, mutirão, campanha, mudança de horário. É o conteúdo que faz o cidadão voltar ao portal.",
    tituloPublico: "Comunicados",
    lei: null,
    artigo: null,
    estruturado: false,
  },
  {
    chave: "servico",
    nome: "Serviço ao cidadão",
    descricao:
      "Um serviço que a prefeitura presta, com o que é preciso levar, o prazo e onde pedir. O conjunto deles forma a Carta de Serviços.",
    tituloPublico: "Carta de Serviços",
    lei: "Lei 13.460/2017",
    artigo: "art. 7º",
    estruturado: true,
  },
  {
    chave: "estrutura",
    nome: "Secretaria ou órgão",
    descricao:
      "Nome, endereço, telefone e horário de atendimento de cada secretaria. É o item que o cidadão mais procura e o primeiro que a corregedoria confere.",
    tituloPublico: "Secretarias e horários",
    lei: "Lei 12.527/2011 (LAI)",
    artigo: "art. 8º, § 1º, I",
    estruturado: true,
  },
  {
    chave: "faq",
    nome: "Pergunta frequente",
    descricao:
      "Resposta a uma dúvida que se repete no balcão. Cada uma respondida aqui é uma ligação a menos.",
    tituloPublico: "Perguntas frequentes",
    lei: "Lei 12.527/2011 (LAI)",
    artigo: "art. 8º, § 1º, VI",
    estruturado: false,
  },
  {
    chave: "repasse",
    nome: "Repasse ou transferência",
    descricao:
      "Recurso recebido ou repassado: convênio, emenda parlamentar, transferência a entidade.",
    tituloPublico: "Repasses e transferências",
    lei: "Lei 12.527/2011 (LAI)",
    artigo: "art. 8º, § 1º, II",
    estruturado: false,
  },
  {
    chave: "documento",
    nome: "Documento",
    descricao:
      "Ato, edital, contrato, prestação de contas ou qualquer arquivo que deva ficar público, com o link de onde está hospedado.",
    tituloPublico: "Documentos",
    lei: null,
    artigo: null,
    estruturado: false,
  },
];

export const NOME_TIPO_PUBLICACAO: Record<TipoPublicacao, string> = Object.fromEntries(
  TIPOS_PUBLICACAO.map((t) => [t.chave, t.nome])
) as Record<TipoPublicacao, string>;

export function definicaoTipo(chave: TipoPublicacao): DefinicaoTipo | undefined {
  return TIPOS_PUBLICACAO.find((t) => t.chave === chave);
}

/**
 * Ordem em que as seções aparecem no portal público.
 *
 * Comunicado primeiro porque é o que muda: um portal cujo topo é sempre igual
 * ensina o cidadão a não voltar. Documento por último porque é arquivo, não
 * leitura.
 */
export const ORDEM_PORTAL: TipoPublicacao[] = [
  "comunicado",
  "servico",
  "estrutura",
  "faq",
  "repasse",
  "documento",
];

export type Publicacao = {
  id: string;
  tipo: TipoPublicacao;
  titulo: string;
  conteudo: string;
  secretaria: string | null;
  /** Só nos tipos estruturados: o que o cidadão precisa levar ou saber. */
  requisitos: string | null;
  /** Só em serviço: prazo de atendimento prometido. */
  prazo: string | null;
  /** Endereço, telefone ou canal. Estrutura e serviço usam. */
  contato: string | null;
  linkExterno: string | null;
  publicado: boolean;
  atualizadoEm: string;
};

export type SecaoPortal = {
  tipo: TipoPublicacao;
  titulo: string;
  lei: string | null;
  artigo: string | null;
  itens: Publicacao[];
};

/**
 * Agrupa as publicações nas seções do portal, na ordem definida.
 *
 * Só entra o que está publicado: rascunho é trabalho em andamento do gestor, e
 * vazar rascunho no endereço público seria pior do que não ter a seção.
 * Seção sem item algum não aparece — um portal cheio de títulos vazios passa
 * a impressão contrária à que o portal existe para dar.
 */
export function montarSecoes(publicacoes: Publicacao[]): SecaoPortal[] {
  const secoes: SecaoPortal[] = [];

  for (const tipo of ORDEM_PORTAL) {
    const definicao = definicaoTipo(tipo);
    if (!definicao) continue;

    const itens = publicacoes.filter((p) => p.publicado && p.tipo === tipo);
    if (itens.length === 0) continue;

    secoes.push({
      tipo,
      titulo: definicao.tituloPublico,
      lei: definicao.lei,
      artigo: definicao.artigo,
      itens,
    });
  }

  return secoes;
}

export type CoberturaLegal = {
  tipo: TipoPublicacao;
  nome: string;
  lei: string;
  artigo: string;
  /** true quando há ao menos uma publicação viva daquele tipo. */
  atendida: boolean;
};

/**
 * Quais exigências de conteúdo da LAI o portal já cobre.
 *
 * É o que transforma o painel de publicações em ferramenta de conformidade em
 * vez de gerenciador de conteúdo: o gestor vê que o art. 8º, § 1º, I continua
 * descoberto enquanto nenhuma secretaria foi cadastrada, e vê isso antes de o
 * Tribunal de Contas ver.
 */
export function coberturaLegal(publicacoes: Publicacao[]): CoberturaLegal[] {
  return TIPOS_PUBLICACAO.filter((t) => t.lei !== null && t.artigo !== null).map((t) => ({
    tipo: t.chave,
    nome: t.nome,
    lei: t.lei!,
    artigo: t.artigo!,
    atendida: publicacoes.some((p) => p.publicado && p.tipo === t.chave),
  }));
}
