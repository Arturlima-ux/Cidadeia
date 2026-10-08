// ── TRÊS PESSOAS ASSINAM O RGF. CADA UMA TEM A SUA PÁGINA ──
//
// O Relatório de Gestão Fiscal sai com três assinaturas: a do prefeito, a de
// quem responde pela administração financeira e a do controle interno (LRF,
// art. 54). São as três pessoas que decidem a compra do CidadeIA, e cada uma
// tem um medo diferente: o prefeito, a multa e as contas rejeitadas; o
// secretário de finanças e o contador, o prazo; o controlador, responder
// junto pelo que viu e não comunicou.
//
// Uma página só para os três falava com nenhum. Aqui fica o texto de cada
// caminho (/para/prefeito, /para/financas, /para/controle), e cada risco
// sai com o artigo que o cria — num site que vende conformidade, citação
// errada desmonta a venda. Nada do que está em "o que o CidadeIA faz" é
// aspiração: cada item existe hoje no módulo citado (lib/modulos-detalhe.ts).

import type { PlanoAddon } from "@/lib/planos";
import type { CARGOS_LIGACAO } from "@/lib/contato-comercial";

export type Risco = { texto: string; base: string };
export type Objecao = { pergunta: string; resposta: string };

export type Cargo = {
  slug: "prefeito" | "financas" | "controle";
  /** Como aparece no seletor da home e no cabeçalho da página. */
  rotulo: string;
  /** Quem a página atende, por extenso. */
  publico: string;
  /** Opção correspondente no formulário "Peça uma ligação". */
  cargoLigacao: (typeof CARGOS_LIGACAO)[number];
  titulo: string;
  lead: string;
  /** Uma linha que resume a dor, para o cartão da home. */
  chamada: string;
  riscos: Risco[];
  faz: string[];
  modulos: PlanoAddon[];
  objecoes: Objecao[];
  descricaoSeo: string;
};

export const ASSINATURAS_DO_RGF = "LRF, art. 54";

export const CARGOS: Cargo[] = [
  {
    slug: "prefeito",
    rotulo: "Prefeito",
    publico: "Prefeitos e prefeitas",
    cargoLigacao: "Prefeito(a)",
    titulo: "O RGF leva a sua assinatura. Saiba o que ele diz antes do Tribunal.",
    lead:
      "O CidadeIA lê o que a prefeitura já envia ao Tesouro Nacional e avisa antes de um limite da lei estourar, de um prazo vencer ou de um número não fechar. O senhor fica sabendo pelo seu próprio sistema, e não pelo apontamento.",
    chamada: "A despesa com pessoal, os prazos e os mínimos que pesam no seu CPF.",
    riscos: [
      {
        texto:
          "Passou de 51,3% da receita corrente líquida com pessoal, a prefeitura não pode dar reajuste, criar cargo, nomear nem pagar hora extra, salvo as exceções da lei.",
        base: "LRF, art. 22, parágrafo único",
      },
      {
        texto:
          "Passou de 54%, o excesso tem de sair em dois quadrimestres, um terço no primeiro. Sem isso, o município deixa de receber transferências voluntárias e de contratar crédito.",
        base: "LRF, art. 23, caput e § 3º",
      },
      {
        texto:
          "Deixar de divulgar o RGF no prazo, ou de promover a redução da despesa com pessoal, é infração punida com multa de 30% dos vencimentos anuais, paga pelo próprio agente.",
        base: "Lei 10.028/2000, art. 5º, I e IV, e § 1º",
      },
      {
        texto:
          "Contas rejeitadas por irregularidade insanável que configure ato doloso de improbidade tornam o gestor inelegível por oito anos.",
        base: "LC 64/1990, art. 1º, I, “g”",
      },
    ],
    faz: [
      "Confere todo dia no Tesouro se cada RREO e RGF foi entregue e avisa o senhor por e-mail 15 dias antes do prazo e no dia em que atrasar.",
      "Mostra a despesa com pessoal na régua da LRF, com as vedações que valem em cada faixa e o cronograma de recondução quando passa do limite.",
      "Calcula quanto falta aplicar em saúde e educação para fechar o ano dentro dos mínimos, e quanto o ritmo mensal precisa subir.",
      "Avisa quando os números do RGF entregue não fecham, antes de o Tribunal de Contas apontar.",
      "Reúne os alertas de todas as secretarias numa lista só, com relatório executivo em PDF para a reunião.",
    ],
    modulos: ["gestao", "essencial"],
    objecoes: [
      {
        pergunta: "Já tenho contador e sistema de contabilidade.",
        resposta:
          "O CidadeIA não substitui nenhum dos dois. Ele lê o que o sistema contábil já enviou ao Tesouro e confere prazo, limite e coerência dos números, todo dia, sem depender de alguém lembrar.",
      },
      {
        pergunta: "Contratar software na prefeitura demora.",
        resposta:
          "Cabe na dispensa de licitação, e o processo vai pronto para o jurídico conferir: termo de referência, minuta de contrato, acordo de tratamento de dados e acordo de nível de serviço.",
      },
      {
        pergunta: "E se não servir para nós?",
        resposta: "É mensal, por módulo e sem fidelidade. A prefeitura encerra qualquer módulo com aviso de 30 dias.",
      },
    ],
    descricaoSeo:
      "Despesa com pessoal, prazos do RREO e do RGF e mínimos de saúde e educação conferidos todo dia no Tesouro, com aviso ao prefeito antes do Tribunal de Contas.",
  },
  {
    slug: "financas",
    rotulo: "Finanças e contabilidade",
    publico: "Secretários de finanças e contadores",
    cargoLigacao: "Secretário(a) de Finanças / Fazenda",
    titulo: "Nenhum relatório fiscal vence sem você saber.",
    lead:
      "Quem responde pela administração financeira assina o RGF junto com o prefeito. O CidadeIA confere no Tesouro, todo dia, o que já consta entregue, no tipo comum ou simplificado, e avisa antes do prazo e no dia do atraso. A planilha de controle de prazos pode se aposentar.",
    chamada: "Os prazos do RREO e do RGF e os números que precisam fechar.",
    riscos: [
      {
        texto:
          "O RREO sai a cada bimestre e o RGF a cada quadrimestre (ou semestre, para quem pode e opta), publicados em até 30 dias depois do fim do período.",
        base: "LRF, arts. 52, 55, § 2º, e 63",
      },
      {
        texto:
          "Atrasar qualquer um dos dois impede o município de receber transferências voluntárias e de contratar operações de crédito até regularizar.",
        base: "LRF, art. 52, § 2º, e art. 55, § 3º, com o art. 51, § 2º",
      },
      {
        texto: "O RGF é assinado também pelas autoridades responsáveis pela administração financeira e pelo controle interno.",
        base: "LRF, art. 54, parágrafo único",
      },
      {
        texto: "Os mínimos de 25% em educação e 15% em saúde fecham no exercício, não em dezembro.",
        base: "CF, art. 212; LC 141/2012, art. 7º",
      },
    ],
    faz: [
      "Lê o extrato de entregas do Tesouro e sabe a periodicidade que o município de fato usa, quadrimestral ou semestral.",
      "Avisa 15 dias antes do prazo de cada RREO e RGF e no dia em que atrasar; o alerta some sozinho quando a entrega aparece lá.",
      "Aponta quando a despesa com pessoal declarada no RGF não fecha com a receita, antes da retificação virar apontamento.",
      "Importa a despesa com pessoal do RGF homologado e mostra a faixa da LRF e o prazo de recondução.",
      "Mantém o calendário do ano com RREO, RGF, SIOPS e SIOPE, e o quanto falta para os mínimos constitucionais.",
    ],
    modulos: ["gestao"],
    objecoes: [
      {
        pergunta: "O sistema contábil já gera os relatórios.",
        resposta:
          "E continua gerando. O CidadeIA confere o que chegou ao Tesouro: se consta entregue, em qual tipo e com números que fecham. É a conferência de fora, a mesma que o Tribunal fará.",
      },
      {
        pergunta: "Não temos equipe de TI.",
        resposta:
          "Não precisa. Funciona no navegador, não instala nada e não pede acesso ao sistema contábil: lê o dado público que o município já enviou.",
      },
      {
        pergunta: "Quem recebe os avisos?",
        resposta:
          "O prefeito e o administrador da conta, por e-mail. Cada secretário tem o próprio acesso e enxerga só a sua área.",
      },
    ],
    descricaoSeo:
      "Prazos do RREO e do RGF conferidos todo dia no Tesouro, comum ou simplificado, com aviso antes do vencimento e alerta quando os números do RGF não fecham.",
  },
  {
    slug: "controle",
    rotulo: "Controle interno",
    publico: "Controladores e equipes de controle interno",
    cargoLigacao: "Controlador(a) interno(a)",
    titulo: "Quem soube e não comunicou responde junto.",
    lead:
      "O responsável pelo controle interno que toma conhecimento de irregularidade tem de dar ciência ao Tribunal de Contas, sob pena de responsabilidade solidária. O CidadeIA põe o desvio na sua mesa enquanto ainda dá para corrigir dentro de casa.",
    chamada: "O desvio na sua mesa enquanto ainda dá para corrigir.",
    riscos: [
      {
        texto:
          "Os responsáveis pelo controle interno, ao tomarem conhecimento de irregularidade, dela darão ciência ao Tribunal de Contas, sob pena de responsabilidade solidária.",
        base: "CF, art. 74, § 1º, com o art. 31",
      },
      {
        texto:
          "Cabe ao controle interno fiscalizar o cumprimento da LRF, com ênfase nas medidas para reconduzir a despesa com pessoal ao limite.",
        base: "LRF, art. 59, caput e inciso III",
      },
      {
        texto: "O controle interno assina o RGF ao lado do prefeito e da administração financeira.",
        base: "LRF, art. 54, parágrafo único",
      },
      {
        texto: "Passou de 48,6% da receita corrente líquida com pessoal, o Tribunal de Contas emite alerta formal ao município.",
        base: "LRF, art. 59, § 1º, II",
      },
    ],
    faz: [
      "Reúne numa lista única os alertas de todas as secretarias, para nada ficar perdido numa caixa de e-mail.",
      "Confere todo dia a entrega de cada RREO e RGF no Tesouro e avisa no dia do atraso.",
      "Aponta quando os números do RGF não fecham e mostra a despesa com pessoal na régua da LRF, com o cronograma de recondução.",
      "No módulo Licitações, soma as dispensas de mesmo objeto contra o limite anual e aponta contrato que não consta no PNCP.",
      "Gera relatório em PDF para instruir o parecer, sem montar planilha.",
    ],
    modulos: ["gestao", "licitacoes"],
    objecoes: [
      {
        pergunta: "O alerta vai direto para o Tribunal de Contas?",
        resposta:
          "Não. O CidadeIA avisa a prefeitura, e só ela. Nada é publicado nem enviado a órgão de controle; a decisão do que fazer continua com quem tem a competência.",
      },
      {
        pergunta: "Já fazemos essa conferência à mão.",
        resposta:
          "O CidadeIA faz a mesma conferência todo dia, sem esquecer nenhuma. O tempo que sobra vai para analisar o que ela encontra, que é o trabalho do controle.",
      },
      {
        pergunta: "A inteligência artificial decide alguma coisa?",
        resposta:
          "Não. Os avisos fiscais saem de regra fixa, com o artigo ao lado. A IA só sugere alertas a partir dos dados cadastrados, e nenhum vira oficial sem aprovação humana.",
      },
    ],
    descricaoSeo:
      "Para o controle interno municipal: entregas do RREO e do RGF, despesa com pessoal na régua da LRF, números que não fecham e dispensas somadas, com a base legal de cada aviso.",
  },
];

export function cargoPorSlug(slug: string): Cargo | null {
  return CARGOS.find((c) => c.slug === slug) ?? null;
}
