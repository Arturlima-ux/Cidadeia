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

// ── UM MÓDULO, UMA FRASE, EM TODO LUGAR ──
//
// Estas descrições eram um texto; a home e as páginas de módulo mostravam
// outro, vindo de lib/modulos-detalhe. Quem via as duas telas encontrava
// duas versões do mesmo produto e ficava sem saber qual valia. Agora a
// frase aqui é a MESMA de `modulos-detalhe.resumo`, e um teste
// (tests/modulos-uma-fonte.test.ts) quebra se as duas se separarem de novo.
export const PLANOS_ADDON: { chave: PlanoAddon; nome: string; descricao: string }[] = [
  {
    chave: "essencial",
    nome: "Essencial",
    descricao:
      "O portal do município: a prefeitura publica de um lado, o cidadão lê e se manifesta do outro.",
  },
  {
    chave: "saude",
    nome: "Saúde",
    descricao: "A rede inteira vinda do CNES, e o que está acontecendo dentro de cada unidade.",
  },
  {
    chave: "educacao",
    nome: "Educação",
    descricao:
      "A rede vinda do Censo Escolar, e o que cada escola vive por dentro — da merenda ao aluno que sumiu.",
  },
  {
    chave: "obras",
    nome: "Obras",
    descricao: "O prazo do contrato como régua, e a obra que passou dele sem acabar.",
  },
  {
    chave: "licitacoes",
    nome: "Licitações",
    descricao:
      "Os processos e os contratos vindos do portal nacional, e os prazos que ninguém pode perder.",
  },
  {
    chave: "gestao",
    nome: "Gestão",
    descricao:
      "A visão do prefeito sobre a prefeitura inteira, numa tela só.",
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

// ── NÃO HÁ CHECKOUT ──
// Havia aqui um link de pagamento externo por módulo (CHECKOUT_URL_*), para
// o cliente contratar sozinho. Saiu em outubro de 2026: o módulo só liga
// quando a equipe confirma o pagamento da primeira fatura, dentro de um
// contrato (lib/pedidos.ts e lib/cobranca.ts). Nenhum caminho do sistema
// ativa módulo por conta do cliente.
