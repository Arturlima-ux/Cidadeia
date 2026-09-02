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
// Link de pagamento externo por módulo, quando existir.
//
// ── POR QUE ISTO PROVAVELMENTE NUNCA VAI SER USADO ──
//
// Prefeitura não paga com cartão. O pagamento municipal segue empenho,
// liquidação e ordem bancária, feito pela tesouraria contra nota fiscal e
// dentro do processo de contratação — não existe secretário assinando SaaS no
// checkout, e se existisse o Tribunal de Contas perguntaria por quê.
//
// O caminho real é o que o site já constrói: diagnóstico, proposta, kit,
// dispensa, empenho, nota. A ativação do módulo é ato nosso depois do contrato
// assinado, não consequência de um pagamento online.
//
// A variável fica aqui porque pode haver exceção — uma autarquia, um consórcio
// intermunicipal, um piloto pago por outra via. Se ela existir, o botão usa.
// Se não existir, o botão leva à proposta, que é o caminho de verdade.
//
// Antes isto caía num link de EXEMPLO (`buy.stripe.com/EXEMPLO_troque_saude`),
// uma URL que não existe. O botão mais importante do Marketplace levava a um
// beco sem saída, e o aviso de "configure o .env" aparecia para o CLIENTE.
const VARIAVEL_AMBIENTE_POR_PLANO: Record<PlanoAddon, string> = {
  essencial: "CHECKOUT_URL_ESSENCIAL",
  saude: "CHECKOUT_URL_SAUDE",
  educacao: "CHECKOUT_URL_EDUCACAO",
  obras: "CHECKOUT_URL_OBRAS",
  licitacoes: "CHECKOUT_URL_LICITACOES",
  gestao: "CHECKOUT_URL_GESTAO",
};

/** URL de pagamento configurada para o módulo, ou null quando não há. */
export function linkContratacao(addon: PlanoAddon): { url: string | null } {
  const variavel = VARIAVEL_AMBIENTE_POR_PLANO[addon];
  const configurado = process.env[variavel]?.trim();
  return configurado ? { url: configurado } : { url: null };
}
