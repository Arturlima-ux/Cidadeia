// ── IMPLANTAÇÃO: O QUE A PREFEITURA JÁ FEZ E O QUE FALTA ──
//
// Uma prefeitura recém-cadastrada caía direto na Visão Geral — que é
// bloqueada por plano. A primeira tela que o prefeito via era um cadeado, e
// as outras duas do menu (IA Central, Módulos) não diziam o que fazer a
// seguir. A home promete uma implantação em passos ("Cadastro e módulos →
// Acessos e importação → Portal no ar"); dentro do produto, ninguém guiava.
//
// ── POR QUE CADA PASSO É DERIVADO DE DADO, E NÃO DE UMA MARCA ──
//
// Marcar "feito" numa coluna quando a pessoa clica é a forma mais fácil de
// construir uma lista dessas — e a mais fácil de mentir. O passo "dados do
// Tesouro importados" só está feito se existe um período vindo do SICONFI no
// banco; "secretários com acesso" só se existe mais de um usuário. Se o dado
// some, o passo volta a ficar pendente sozinho. A única coisa que fica
// guardada é a decisão da pessoa de encerrar a implantação, que é uma escolha
// dela, não um fato sobre os dados.
//
// ── POR QUE DÁ PARA ENCERRAR COM PASSO PENDENTE ──
//
// Contratar módulo custa dinheiro e depende de processo administrativo;
// verificar o portal depende de decisão política. Uma lista que só libera o
// painel depois de tudo isso prende o prefeito fora do próprio sistema por
// semanas. Os passos são orientação, não catraca.

export type ChavePasso =
  | "municipio"
  | "tesouro"
  | "modulos"
  | "acessos"
  | "dados"
  | "portal";

export type FatosImplantacao = {
  /** Código IBGE gravado — prova de que o município foi reconhecido. */
  codigoIbge: string | null;
  /** Existe ao menos um período de despesa com pessoal vindo do SICONFI. */
  temRgfImportado: boolean;
  /** Quantos módulos a prefeitura contratou. */
  qtdModulos: number;
  /** Usuários da prefeitura, incluindo quem cadastrou. */
  qtdUsuarios: number;
  /** Alguma tabela de secretaria (unidades, escolas, obras, licitações) tem linha. */
  temDadosDeSecretaria: boolean;
  /** Portal de transparência marcado como ativo. */
  portalAtivo: boolean;
};

export type PassoImplantacao = {
  chave: ChavePasso;
  titulo: string;
  /** O que a pessoa ganha ao fazer — não o que o sistema faz. */
  porque: string;
  feito: boolean;
  /** Para onde o botão leva quando o passo não é resolvido na própria tela. */
  href?: string;
  rotulo: string;
  /** Verdadeiro quando o passo depende de contratação ou decisão externa. */
  externo?: boolean;
};

export function avaliarImplantacao(f: FatosImplantacao): PassoImplantacao[] {
  return [
    {
      chave: "municipio",
      titulo: "Município reconhecido",
      porque:
        "Com o código do IBGE, o sistema encontra sozinho o que a prefeitura já " +
        "publicou no Tesouro e no INEP — sem digitar nada.",
      feito: f.codigoIbge !== null && f.codigoIbge !== "",
      rotulo: "Confirmar no IBGE",
    },
    {
      chave: "tesouro",
      titulo: "Dados do Tesouro importados",
      porque:
        "O Relatório de Gestão Fiscal que a prefeitura já envia ao SICONFI traz " +
        "a despesa com pessoal e a receita corrente. É o número que o Tribunal " +
        "de Contas olha — e aparece calculado contra o teto da LRF.",
      feito: f.temRgfImportado,
      rotulo: "Buscar no Tesouro",
    },
    {
      chave: "modulos",
      titulo: "Áreas que a prefeitura vai usar",
      porque:
        "Cada módulo abre uma secretaria no painel: Saúde, Educação, Obras, " +
        "Licitações. Sem módulo, o painel fica só com o que é comum a todos.",
      feito: f.qtdModulos > 0,
      href: "/dashboard/modulos",
      rotulo: "Ver módulos",
      externo: true,
    },
    {
      chave: "acessos",
      titulo: "Secretários com acesso",
      porque:
        "Cada secretário entra na própria área e alimenta os dados dela. O " +
        "prefeito não deveria ser o único a digitar.",
      feito: f.qtdUsuarios > 1,
      href: "/dashboard/configuracoes",
      rotulo: "Criar acessos",
    },
    {
      chave: "dados",
      titulo: "Dados do sistema antigo",
      porque:
        "Unidades de saúde, escolas, obras e licitações entram por planilha. " +
        "Não é preciso desligar o sistema antigo — os dois rodam em paralelo.",
      feito: f.temDadosDeSecretaria,
      href: "/dashboard/dados/importar",
      rotulo: "Importar planilha",
    },
    {
      chave: "portal",
      titulo: "Portal do cidadão no ar",
      porque:
        "O endereço de transparência do município passa a responder. É o que o " +
        "morador vê — e o que a Lei de Acesso à Informação cobra.",
      feito: f.portalAtivo,
      href: "/dashboard/atendimento",
      rotulo: "Configurar portal",
      externo: true,
    },
  ];
}

export type ResumoImplantacao = {
  feitos: number;
  total: number;
  /** Passos pendentes que não dependem de contratação nem decisão externa. */
  pendentesInternos: PassoImplantacao[];
  /** Tudo que não depende de terceiros está feito. */
  prontoParaEncerrar: boolean;
};

export function resumirImplantacao(passos: PassoImplantacao[]): ResumoImplantacao {
  const feitos = passos.filter((p) => p.feito).length;
  const pendentesInternos = passos.filter((p) => !p.feito && !p.externo);
  return {
    feitos,
    total: passos.length,
    pendentesInternos,
    prontoParaEncerrar: pendentesInternos.length === 0,
  };
}

/** Frase de topo da tela: conta o que está feito sem inflar. */
export function fraseDeProgresso(r: ResumoImplantacao): string {
  if (r.feitos === 0) return "Nenhum passo concluído ainda. Comece pelo primeiro.";
  if (r.feitos === r.total) return "Todos os passos concluídos.";
  return `${r.feitos} de ${r.total} passos concluídos.`;
}
