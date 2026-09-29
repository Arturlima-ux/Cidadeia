// ── CONTRATOS NO PNCP ──
//
// Endpoint irmão do de contratações, com duas diferenças que custam caro se
// passarem despercebidas:
//
//   1. O parâmetro do CNPJ chama-se `cnpjOrgao` aqui e `cnpj` lá. Trocar um
//      pelo outro não dá erro: devolve a lista do Brasil inteiro filtrada por
//      nada, e a tela mostraria contratos de outro município como se fossem
//      deste.
//
//   2. Não há parâmetro de modalidade, então é uma varredura só por ano — bem
//      mais barata que a de contratações.
//
// A paginação segue `paginasRestantes`, pelo mesmo motivo registrado em
// pncp.ts: pedir `pagina=1` e parar lia uma fração do portal e o resto virava
// conclusão errada.

import { familiaModalidade } from "@/lib/pncp";

const BASE = "https://pncp.gov.br/api/consulta/v1/contratos";
const TIMEOUT_MS = 20000;
const PAUSA_ENTRE_CHAMADAS_MS = 400;
const TAMANHO_PAGINA = 50;
const MAXIMO_REQUISICOES = 30;

export type ContratoPncp = {
  numeroControlePncp: string;
  /** Contratação de origem. Junta com licitacoes.numeroControlePncp. */
  numeroControlePncpCompra: string | null;
  numeroContrato: string | null;
  processo: string | null;
  objeto: string;
  fornecedorDocumento: string | null;
  fornecedorNome: string | null;
  fornecedorTipoPessoa: string | null;
  valorInicial: number | null;
  valorGlobal: number | null;
  dataAssinatura: string | null;
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  tipoContrato: string | null;
  categoria: string | null;
  frutoAdesao: boolean;
  numeroRetificacao: number | null;
};

export type ResultadoConsultaContratos =
  | { ok: true; contratos: ContratoPncp[]; completa: boolean }
  | { ok: false; erro: string; limiteExcedido: boolean };

function esperar(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function texto(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function numero(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function mapearContrato(bruto: Record<string, unknown>): ContratoPncp | null {
  const id = texto(bruto.numeroControlePNCP);
  // Sem o identificador não há chave exata, e sem chave exata a reimportação
  // duplica. É a mesma regra da importação de contratações.
  if (!id) return null;

  return {
    numeroControlePncp: id,
    numeroControlePncpCompra: texto(bruto.numeroControlePncpCompra),
    numeroContrato: texto(bruto.numeroContratoEmpenho),
    processo: texto(bruto.processo),
    objeto: texto(bruto.objetoContrato) ?? "Objeto não informado no PNCP",
    fornecedorDocumento: texto(bruto.niFornecedor),
    fornecedorNome: texto(bruto.nomeRazaoSocialFornecedor),
    fornecedorTipoPessoa: texto(bruto.tipoPessoa),
    valorInicial: numero(bruto.valorInicial),
    valorGlobal: numero(bruto.valorGlobal),
    dataAssinatura: texto(bruto.dataAssinatura),
    vigenciaInicio: texto(bruto.dataVigenciaInicio),
    vigenciaFim: texto(bruto.dataVigenciaFim),
    tipoContrato: texto((bruto.tipoContrato as { nome?: unknown } | null)?.nome),
    categoria: texto((bruto.categoriaProcesso as { nome?: unknown } | null)?.nome),
    frutoAdesao: bruto.frutoAdesao === true,
    numeroRetificacao: numero(bruto.numeroRetificacao),
  };
}

/**
 * Baixa os contratos que o PNCP tem para um CNPJ, num ano.
 *
 * O filtro é por data de PUBLICAÇÃO no portal, não por ano do contrato: um
 * contrato assinado em novembro de 2025 e publicado em janeiro de 2026 aparece
 * na varredura de 2026. Quem chama deve varrer também o ano anterior quando
 * quer a vigência completa — é o que a ação de importação faz.
 */
export async function buscarContratosPncp(
  cnpj: string,
  ano: number
): Promise<ResultadoConsultaContratos> {
  const limpo = cnpj.replace(/\D/g, "");
  if (limpo.length !== 14) {
    return { ok: false, erro: "CNPJ do município inválido ou não cadastrado.", limiteExcedido: false };
  }

  const contratos: ContratoPncp[] = [];
  let pagina = 1;
  let restam = true;
  let requisicoes = 0;
  let completa = true;

  while (restam) {
    if (requisicoes >= MAXIMO_REQUISICOES) {
      completa = false;
      break;
    }
    if (requisicoes > 0) await esperar(PAUSA_ENTRE_CHAMADAS_MS);
    requisicoes++;

    // `cnpjOrgao`, não `cnpj`. Errar aqui não dá erro: traz o Brasil inteiro.
    const url =
      `${BASE}?dataInicial=${ano}0101&dataFinal=${ano}1231&cnpjOrgao=${limpo}` +
      `&pagina=${pagina}&tamanhoPagina=${TAMANHO_PAGINA}`;

    try {
      const resposta = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (resposta.status === 429) {
        return {
          ok: false,
          erro: "O PNCP está limitando as consultas agora. Tente novamente em alguns minutos.",
          limiteExcedido: true,
        };
      }
      if (resposta.status === 204) break;
      if (!resposta.ok) {
        if (pagina > 1) completa = false;
        break;
      }

      const json = (await resposta.json()) as {
        data?: unknown[];
        paginasRestantes?: number;
        totalPaginas?: number;
      };
      for (const bruto of json.data ?? []) {
        const c = mapearContrato(bruto as Record<string, unknown>);
        if (c) contratos.push(c);
      }

      const sobram =
        typeof json.paginasRestantes === "number"
          ? json.paginasRestantes
          : typeof json.totalPaginas === "number"
            ? json.totalPaginas - pagina
            : 0;
      restam = sobram > 0 && (json.data?.length ?? 0) > 0;
      pagina++;
    } catch {
      completa = false;
      break;
    }
  }

  return { ok: true, contratos, completa };
}

// ── EXIBIÇÃO DO DOCUMENTO ──

/**
 * CNPJ aparece inteiro; CPF aparece mascarado.
 *
 * Dos 134 contratos de um município medido, 16 são com pessoa física — locação
 * de área de terra, show de festejo. O PNCP publica o CPF por obrigação legal,
 * mas obrigação de publicidade do portal não é licença para reproduzir CPF
 * inteiro numa tela nossa, que circula por print e por PDF.
 *
 * O formato mantém os dígitos do meio, que são os que a Receita usa para
 * conferência humana, e esconde os das pontas.
 */
export function documentoExibivel(
  documento: string | null,
  tipoPessoa: string | null
): string | null {
  if (!documento) return null;
  const d = documento.replace(/\D/g, "");

  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  if (d.length === 11) {
    return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
  }
  // Tamanho inesperado: não dá para saber onde mascarar, então mascara tudo
  // menos o fim. Pessoa física com documento estrangeiro cai aqui.
  if (tipoPessoa === "PF") return `***${d.slice(-2)}`;
  return d || null;
}

/**
 * Agrupa contratos por contratado, usando o documento como identidade.
 *
 * O detector de concentração de fornecedor casava nomes por semelhança porque
 * era só o que havia. Com o documento, "A. M. DE ANDRADE & CIA LTDA" e
 * "AM Andrade Cia Ltda." são a mesma empresa sem heurística nenhuma — e duas
 * empresas de nome parecido deixam de ser fundidas por engano.
 */
export function agruparPorFornecedor<
  T extends { fornecedorDocumento: string | null; fornecedorNome: string | null; valorGlobal: number | null },
>(contratos: T[]): { documento: string; nome: string; contratos: T[]; valor: number }[] {
  const mapa = new Map<string, { documento: string; nome: string; contratos: T[]; valor: number }>();
  for (const c of contratos) {
    const doc = (c.fornecedorDocumento ?? "").replace(/\D/g, "");
    if (!doc) continue;
    const atual = mapa.get(doc) ?? {
      documento: doc,
      nome: c.fornecedorNome ?? doc,
      contratos: [] as T[],
      valor: 0,
    };
    atual.contratos.push(c);
    atual.valor += c.valorGlobal ?? 0;
    mapa.set(doc, atual);
  }
  return [...mapa.values()].sort((a, b) => b.valor - a.valor);
}

/** Reexporta para quem lê contrato e contratação juntos. */
export { familiaModalidade };
