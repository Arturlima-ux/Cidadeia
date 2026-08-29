// ── REGRAS DE PLANO ──
// Modelo modular: cada área é um plano avulso que a prefeitura contrata
// separadamente. "Gestão" libera a visão do prefeito sobre a prefeitura
// inteira (financeiro geral, alertas, histórico, relatório executivo e
// administração de usuários). "Essencial" reúne os canais de relação com o
// cidadão: Protocolo, Ouvidoria e Portal da Transparência.
//
// Essencial DEIXOU de ser incluído automaticamente — antes ele era anunciado
// como grátis e sempre ativo, o que era um problema duplo: dava de graça um
// módulo que custa para operar, e prometia três funcionalidades que ainda não
// existiam. Agora é contratado como qualquer outro.
//
// Não existe limite de QUANTIDADE em nada (relatórios em PDF continuam
// ilimitados) — o que varia por plano é só O QUE fica disponível.

export type PlanoAddon =
  | "essencial"
  | "saude"
  | "educacao"
  | "obras"
  | "licitacoes"
  | "gestao";

export const PLANOS_ADDON: { chave: PlanoAddon; nome: string; descricao: string }[] = [
  {
    chave: "essencial",
    nome: "Essencial",
    descricao:
      "Canais de relação com o cidadão: Protocolo de atendimento, Ouvidoria e Portal da Transparência público do município.",
  },
  {
    chave: "saude",
    nome: "Saúde",
    descricao: "Dashboard de unidades de saúde, indicadores, mapa e relatório em PDF, com IA aplicada à secretaria.",
  },
  {
    chave: "educacao",
    nome: "Educação",
    descricao: "Dashboard de escolas, indicadores, mapa e relatório em PDF, com IA aplicada à secretaria.",
  },
  {
    chave: "obras",
    nome: "Obras",
    descricao: "Dashboard de obras, progresso, mapa e relatório em PDF, com IA aplicada à secretaria.",
  },
  {
    chave: "licitacoes",
    nome: "Licitações",
    descricao: "Dashboard de processos licitatórios e relatório em PDF, com IA aplicada à secretaria.",
  },
  {
    chave: "gestao",
    nome: "Gestão",
    descricao:
      "Visão geral da prefeitura: financeiro, alertas gerais, histórico, relatório executivo e administração de usuários/secretários.",
  },
];

export const NOME_PLANO_ADDON: Record<PlanoAddon, string> = Object.fromEntries(
  PLANOS_ADDON.map((p) => [p.chave, p.nome])
) as Record<PlanoAddon, string>;

/** Lê a lista de planos avulsos contratados a partir do campo JSON salvo no banco. */
export function planosContratadosDe(planosContratadosRaw: string | null | undefined): PlanoAddon[] {
  if (!planosContratadosRaw) return [];
  try {
    const lista = JSON.parse(planosContratadosRaw);
    if (!Array.isArray(lista)) return [];
    return lista.filter((p): p is PlanoAddon =>
      PLANOS_ADDON.some((addon) => addon.chave === p)
    );
  } catch {
    return [];
  }
}

export function temPlano(
  planosContratadosRaw: string | null | undefined,
  addon: PlanoAddon
): boolean {
  return planosContratadosDe(planosContratadosRaw).includes(addon);
}

export function serializarPlanos(lista: PlanoAddon[]): string {
  return JSON.stringify(Array.from(new Set(lista)));
}

// Mapeia cada chave de secretaria do produto para a chave de plano correspondente
// (hoje são as mesmas strings, mas fica explícito e desacoplado aqui).
export function planoDaSecretaria(secretaria: string): PlanoAddon | null {
  return PLANOS_ADDON.some((p) => p.chave === secretaria) ? (secretaria as PlanoAddon) : null;
}

export const HREF_PLANO_ADDON: Record<PlanoAddon, string> = {
  essencial: "/dashboard/atendimento",
  saude: "/dashboard/secretarias/saude",
  educacao: "/dashboard/secretarias/educacao",
  obras: "/dashboard/secretarias/obras",
  licitacoes: "/dashboard/secretarias/licitacoes",
  gestao: "/dashboard",
};

// ── LINK DE CONTRATAÇÃO (checkout externo) ──
// Cada plano tem uma variável de ambiente própria com o link de pagamento
// (ex: um Payment Link do Stripe, do Mercado Pago, ou um formulário/typeform
// de vendas). Enquanto a variável não for configurada, cai num link de
// EXEMPLO — só pra você ver a estrutura funcionando; ele não cobra nada de
// verdade, é preciso trocar pelo link real antes de ir pra produção.
const VARIAVEL_AMBIENTE_POR_PLANO: Record<PlanoAddon, string> = {
  essencial: "CHECKOUT_URL_ESSENCIAL",
  saude: "CHECKOUT_URL_SAUDE",
  educacao: "CHECKOUT_URL_EDUCACAO",
  obras: "CHECKOUT_URL_OBRAS",
  licitacoes: "CHECKOUT_URL_LICITACOES",
  gestao: "CHECKOUT_URL_GESTAO",
};

export function linkContratacao(addon: PlanoAddon): { url: string; ehExemplo: boolean } {
  const variavel = VARIAVEL_AMBIENTE_POR_PLANO[addon];
  const configurado = process.env[variavel];
  if (configurado) {
    return { url: configurado, ehExemplo: false };
  }
  return {
    url: `https://buy.stripe.com/EXEMPLO_troque_${addon}`,
    ehExemplo: true,
  };
}
