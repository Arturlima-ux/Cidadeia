// ── AS NORMAS QUE O PRODUTO DE FATO VERIFICA ──
//
// Toda landing page tem uma faixa de números, e quase todas mentem. O pedido
// original para esta faixa trazia "100.000+ processos digitalizados" e
// "R$ 15M+ economizados aos cofres públicos" — e o CidadeIA tem zero clientes.
// Numa venda B2G quem valida é o procurador da prefeitura, e a primeira coisa
// que ele faz é pedir a fonte.
//
// Este arquivo existe para que o número da faixa seja grande E verdadeiro. Não
// é um `grep` no código, que contaria duplicata e mudaria com qualquer
// refatoração: é a lista, escrita, de cada artigo que alguma regra do produto
// lê — com o módulo que o aplica e o arquivo onde a conta mora.
//
// Quem duvidar abre a lista e confere. É a única autoridade que se tem sem
// carteira de clientes.
//
// ── A REGRA PARA ENTRAR AQUI ──
//
// O artigo só entra se existir código que o APLICA — uma conta, um prazo, um
// limite, um documento gerado. Artigo citado em texto de tela, sem regra
// atrás, não conta. A tentação de inflar a lista com menções é exatamente o
// mesmo defeito dos "100.000 processos", em outra forma.

export type Norma = {
  /** Como se cita: "Art. 20, III, 'b'". */
  artigo: string;
  /** A norma: "Lei Complementar 101/2000 (LRF)". */
  norma: string;
  /** O que a regra faz com ele, em uma linha. */
  oQueVerifica: string;
  /** Onde a conta mora. É o que torna a lista conferível. */
  onde: string;
  modulo: "gestao" | "essencial" | "saude" | "educacao" | "obras" | "licitacoes";
};

export const NORMAS_VERIFICADAS: Norma[] = [
  // ── Mínimos constitucionais e fiscal ──
  {
    artigo: "Art. 212",
    norma: "Constituição Federal",
    oQueVerifica: "Os 25% em manutenção e desenvolvimento do ensino, com projeção do fechamento do exercício.",
    onde: "lib/minimos-constitucionais.ts",
    modulo: "gestao",
  },
  {
    artigo: "Art. 212-A, XI",
    norma: "Constituição Federal",
    oQueVerifica: "O piso de 70% do FUNDEB em remuneração de profissional da educação básica.",
    onde: "lib/minimos-constitucionais.ts",
    modulo: "gestao",
  },
  {
    artigo: "Art. 7º",
    norma: "Lei Complementar 141/2012",
    oQueVerifica: "Os 15% em ações e serviços públicos de saúde.",
    onde: "lib/minimos-constitucionais.ts",
    modulo: "gestao",
  },
  {
    artigo: "Art. 26",
    norma: "Lei 14.113/2020",
    oQueVerifica: "A base de cálculo do piso do FUNDEB, regulamentando o art. 212-A.",
    onde: "lib/minimos-constitucionais.ts",
    modulo: "gestao",
  },
  {
    artigo: "Art. 20, III, “b”",
    norma: "Lei Complementar 101/2000 (LRF)",
    oQueVerifica: "O teto de 54% da receita corrente líquida com pessoal.",
    onde: "lib/despesa-pessoal.ts",
    modulo: "gestao",
  },
  {
    artigo: "Art. 22, parágrafo único",
    norma: "Lei Complementar 101/2000 (LRF)",
    oQueVerifica: "As cinco vedações do patamar prudencial, a partir de 51,3%.",
    onde: "lib/despesa-pessoal.ts",
    modulo: "gestao",
  },
  {
    artigo: "Art. 23",
    norma: "Lei Complementar 101/2000 (LRF)",
    oQueVerifica: "O prazo de recondução e o cronograma de eliminação do excesso.",
    onde: "lib/despesa-pessoal.ts",
    modulo: "gestao",
  },
  {
    artigo: "Art. 59, § 1º, IV",
    norma: "Lei Complementar 101/2000 (LRF)",
    oQueVerifica: "A faixa de alerta de 48,6%, conferida contra o limite que o município declarou.",
    onde: "lib/fatos-do-municipio.ts",
    modulo: "gestao",
  },
  {
    artigo: "Art. 5º, IV",
    norma: "Lei 10.028/2000",
    oQueVerifica: "A multa pessoal por não reconduzir a despesa no prazo.",
    onde: "lib/despesa-pessoal.ts",
    modulo: "gestao",
  },
  {
    artigo: "Art. 1º, I, “g”",
    norma: "Lei Complementar 64/1990",
    oQueVerifica: "A inelegibilidade que decorre de contas rejeitadas por irregularidade insanável.",
    onde: "lib/prestacao-de-contas.ts",
    modulo: "gestao",
  },

  // ── Relatórios obrigatórios ──
  {
    artigo: "Art. 52",
    norma: "Lei Complementar 101/2000 (LRF)",
    oQueVerifica: "Os bimestres de RREO encerrados, contra os que constam publicados no Tesouro.",
    onde: "lib/raio-x.ts",
    modulo: "gestao",
  },
  {
    artigo: "Art. 54",
    norma: "Lei Complementar 101/2000 (LRF)",
    oQueVerifica: "Os períodos de RGF, com a periodicidade que o porte do município faculta.",
    onde: "lib/obrigacoes-fiscais.ts",
    modulo: "gestao",
  },
  {
    artigo: "Art. 51, § 2º",
    norma: "Lei Complementar 101/2000 (LRF)",
    oQueVerifica: "A suspensão de transferências voluntárias por relatório não publicado.",
    onde: "lib/fatos-do-municipio.ts",
    modulo: "gestao",
  },

  // ── Contratação ──
  {
    artigo: "Art. 55",
    norma: "Lei 14.133/2021",
    oQueVerifica: "Os oito prazos de licitação em dias úteis, por modalidade e objeto.",
    onde: "lib/vigencia.ts",
    modulo: "licitacoes",
  },
  {
    artigo: "Art. 75, II",
    norma: "Lei 14.133/2021",
    oQueVerifica: "O limite anual da dispensa por valor, atualizado por decreto.",
    onde: "lib/contratacao.ts",
    modulo: "licitacoes",
  },
  {
    artigo: "Art. 75, § 1º",
    norma: "Lei 14.133/2021",
    oQueVerifica: "O fracionamento: soma do exercício com objetos de mesma natureza.",
    onde: "lib/fracionamento.ts",
    modulo: "licitacoes",
  },
  {
    artigo: "Art. 94",
    norma: "Lei 14.133/2021",
    oQueVerifica: "A publicidade obrigatória do contrato no portal nacional.",
    onde: "lib/contratos-pncp.ts",
    modulo: "licitacoes",
  },
  {
    artigo: "Art. 12, VII",
    norma: "Lei 14.133/2021",
    oQueVerifica: "O plano de contratações anual, que a lei faculta e não impõe.",
    onde: "lib/pca.ts",
    modulo: "licitacoes",
  },
  {
    artigo: "Art. 111",
    norma: "Lei 14.133/2021",
    oQueVerifica: "A vigência de contrato de escopo, prorrogada automaticamente.",
    onde: "lib/obra-prazo.ts",
    modulo: "obras",
  },
  {
    artigo: "Art. 125",
    norma: "Lei 14.133/2021",
    oQueVerifica: "Os limites de aditivo: 25% em geral, 50% em reforma de edifício.",
    onde: "lib/aditivos.ts",
    modulo: "obras",
  },

  // ── Transparência e cidadão ──
  {
    artigo: "Art. 8º",
    norma: "Lei 12.527/2011 (LAI)",
    oQueVerifica: "As exigências de conteúdo da transparência ativa no portal.",
    onde: "lib/publicacoes.ts",
    modulo: "essencial",
  },
  {
    artigo: "Arts. 10 a 14",
    norma: "Lei 13.460/2017",
    oQueVerifica: "Os prazos de resposta da ouvidoria e a carta de serviços.",
    onde: "lib/prazo-atendimento.ts",
    modulo: "essencial",
  },
  {
    artigo: "Art. 48",
    norma: "Lei 13.709/2018 (LGPD)",
    oQueVerifica: "O prazo de comunicação de incidente de segurança ao titular e à ANPD.",
    onde: "lib/compromissos.ts",
    modulo: "essencial",
  },

  // ── Educação ──
  {
    artigo: "Art. 24",
    norma: "Lei 9.394/1996 (LDB)",
    oQueVerifica: "Os duzentos dias letivos, descontando o que cada ocorrência custou de aula.",
    onde: "lib/ocorrencias-escola.ts",
    modulo: "educacao",
  },
  {
    artigo: "Art. 14",
    norma: "Lei 11.947/2009",
    oQueVerifica: "Os 30% do PNAE em agricultura familiar, com projeção do fechamento.",
    onde: "lib/pnae.ts",
    modulo: "educacao",
  },
  {
    artigo: "Art. 56, II",
    norma: "Lei 8.069/1990 (ECA)",
    oQueVerifica: "Os recursos escolares esgotados que precedem o ofício ao Conselho Tutelar.",
    onde: "lib/busca-ativa.ts",
    modulo: "educacao",
  },
  {
    artigo: "Art. 1º",
    norma: "Lei 13.803/2019",
    oQueVerifica: "A frequência mínima de 60% que obriga a comunicação do caso.",
    onde: "lib/busca-ativa.ts",
    modulo: "educacao",
  },
];

/** Quantos artigos o produto aplica. Derivado, nunca escrito à mão. */
export const TOTAL_ARTIGOS = NORMAS_VERIFICADAS.length;

/** Quantas normas federais distintas. */
export const TOTAL_NORMAS = new Set(NORMAS_VERIFICADAS.map((n) => n.norma)).size;
