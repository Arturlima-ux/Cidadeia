// ── QUEM A PREFEITURA CONTRATA, VISTO DE UM LUGAR SÓ ──
//
// O módulo tinha duas listas que falavam da mesma coisa sem se falarem:
//
//   licitacoes — o edital. Traz um campo `fornecedor` de texto livre, digitado
//                por um servidor, e só quando alguém se lembrou de preencher.
//   contratos  — o contrato. Traz niFornecedor, que é CNPJ ou CPF.
//
// O detector de concentração de fornecedor usava a primeira, porque era a
// única que existia quando ele foi escrito. Ele casava empresas por SEMELHANÇA
// DE NOME, com uma lista de palavras vazias ("ltda", "me", "epp") e comparação
// de texto normalizado.
//
// Medido nos contratos reais de um município: 115 fornecedores distintos por
// nome contra 114 por documento. Uma empresa aparecia com duas grafias e
// contava como duas — exatamente o erro que o detector existe para não
// cometer, já que o padrão que ele procura é "o mesmo fornecedor vencendo
// processo atrás de processo".
//
// ── POR QUE JUNTAR EM VEZ DE TROCAR ──
//
// Trocar nome por documento perderia os processos que ainda não têm contrato
// publicado — e eles existem: o contrato é publicado depois do edital, então
// todo processo recém-homologado passa um tempo sem par.
//
// Manter duas funções, uma por documento e outra por nome, seria a terceira
// cópia da mesma regra. Já custou caro neste projeto: três leituras da rede de
// escolas divergiram duas vezes no mesmo mês.
//
// Então há uma junção só. Cada contratado tem uma IDENTIDADE: o documento
// quando existe, o nome normalizado quando não. A identidade forte vence, e a
// tela diz qual das duas está usando — porque "3 contratos do mesmo CNPJ" e
// "3 processos com nome parecido" são afirmações de força muito diferente.

import { normalizarFornecedor } from "@/lib/padroes-licitacoes";

export type ProcessoParaContratado = {
  numero: string;
  objeto: string;
  valorEstimado: number | null;
  fornecedor: string | null;
  status: string;
  /** Chave do PNCP, quando o processo veio da importação. */
  numeroControlePncp?: string | null;
};

export type ContratoParaContratado = {
  id: string;
  numeroControlePncp: string | null;
  /** Contratação de origem. É por aqui que contrato e edital se encontram. */
  numeroControlePncpCompra: string | null;
  objeto: string;
  fornecedorDocumento: string | null;
  fornecedorNome: string | null;
  fornecedorTipoPessoa: string | null;
  valorGlobal: number | null;
};

export type Contratado = {
  /** "doc:<digitos>" ou "nome:<normalizado>". Nunca colidem entre si. */
  identidade: string;
  nome: string;
  /** Preenchido só quando a identidade veio de documento. */
  documento: string | null;
  tipoPessoa: string | null;
  /** true quando agrupado por CNPJ/CPF; false quando por semelhança de nome. */
  porDocumento: boolean;
  contratos: ContratoParaContratado[];
  /** Processos homologados que ainda não têm contrato publicado. */
  processosSemContrato: ProcessoParaContratado[];
  /** Soma do valor global dos contratos mais o estimado dos processos soltos. */
  valor: number;
  /** Contratos + processos sem contrato. É o "venceu N vezes". */
  quantidade: number;
};

const digitos = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/**
 * Junta contratos e processos numa lista de contratados.
 *
 * Um processo cujo identificador aparece como `numeroControlePncpCompra` de
 * algum contrato NÃO é contado de novo: seria o mesmo negócio somado duas
 * vezes, inflando tanto a contagem quanto o dinheiro do padrão.
 */
export function juntarContratados(
  processos: ProcessoParaContratado[],
  contratos: ContratoParaContratado[]
): Contratado[] {
  const mapa = new Map<string, Contratado>();

  const pegar = (
    identidade: string,
    nome: string,
    documento: string | null,
    tipoPessoa: string | null
  ): Contratado => {
    const atual = mapa.get(identidade);
    if (atual) return atual;
    const novo: Contratado = {
      identidade,
      nome,
      documento,
      tipoPessoa,
      porDocumento: documento !== null,
      contratos: [],
      processosSemContrato: [],
      valor: 0,
      quantidade: 0,
    };
    mapa.set(identidade, novo);
    return novo;
  };

  // 1. Os contratos primeiro, porque trazem a identidade forte.
  for (const c of contratos) {
    const doc = digitos(c.fornecedorDocumento);
    const identidade = doc ? `doc:${doc}` : `nome:${normalizarFornecedor(c.fornecedorNome ?? "")}`;
    // Contrato sem documento E sem nome não identifica contratado nenhum.
    if (identidade === "nome:") continue;

    const alvo = pegar(identidade, c.fornecedorNome ?? doc, doc || null, c.fornecedorTipoPessoa);
    alvo.contratos.push(c);
    alvo.valor += c.valorGlobal ?? 0;
    alvo.quantidade++;
  }

  // Quais contratações já estão representadas por um contrato.
  const jaTemContrato = new Set(
    contratos.map((c) => c.numeroControlePncpCompra).filter((x): x is string => !!x)
  );

  // 2. Os processos homologados que sobraram.
  for (const p of processos) {
    if (p.status !== "homologada") continue;
    if (!p.fornecedor) continue;
    if (p.numeroControlePncp && jaTemContrato.has(p.numeroControlePncp)) continue;

    const chaveNome = normalizarFornecedor(p.fornecedor);
    if (!chaveNome) continue;

    // ── O CASAMENTO ENTRE AS DUAS FONTES ──
    //
    // Se já existe um contratado com documento cujo NOME normalizado bate com
    // o que foi digitado no processo, o processo entra nele. Sem isto, a mesma
    // empresa apareceria duas vezes na tela — uma por CNPJ, outra por nome — e
    // o padrão ficaria dividido em dois grupos pequenos demais para disparar.
    const porNomeExistente = [...mapa.values()].find(
      (c) => c.documento !== null && normalizarFornecedor(c.nome) === chaveNome
    );

    const alvo =
      porNomeExistente ?? pegar(`nome:${chaveNome}`, p.fornecedor, null, null);
    alvo.processosSemContrato.push(p);
    alvo.valor += p.valorEstimado ?? 0;
    alvo.quantidade++;
  }

  return [...mapa.values()].sort((a, b) => b.valor - a.valor);
}

/**
 * Como a tela deve descrever a força do agrupamento.
 *
 * "3 contratos do mesmo CNPJ" é um fato. "3 processos com nome parecido" é uma
 * suspeita de grafia. Dizer as duas do mesmo jeito seria emprestar ao segundo
 * uma certeza que ele não tem.
 */
export function comoFoiAgrupado(c: Contratado): string {
  if (c.porDocumento) {
    return c.processosSemContrato.length > 0
      ? "agrupado pelo CNPJ/CPF do contrato; os processos sem contrato publicado entraram pelo nome"
      : "agrupado pelo CNPJ/CPF do contrato";
  }
  return "agrupado por semelhança de nome — sem contrato publicado, não há documento para confirmar";
}
