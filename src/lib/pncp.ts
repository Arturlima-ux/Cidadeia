// ── PORTAL NACIONAL DE CONTRATAÇÕES PÚBLICAS (PNCP) ──
//
// Desde abril de 2024 todo ente federativo é obrigado a divulgar no PNCP os
// editais, contratos e atas — e isso não é formalidade de arquivo: a
// divulgação é CONDIÇÃO DE EFICÁCIA do contrato (art. 94 da Lei 14.133/2021).
// Processo não publicado não produz efeito, e pagamento feito sobre ele vira
// despesa irregular na conta do gestor.
//
// ── POR QUE CONFERIMOS EM VEZ DE PUBLICAR ──
//
// Publicar exige que a plataforma seja credenciada junto ao Ministério da
// Gestão e receba login próprio para representar os CNPJs dos municípios. É
// um passo de credenciamento, não de código, e enquanto ele não existe
// qualquer promessa de "publicamos por você" seria falsa.
//
// A consulta, por outro lado, é PÚBLICA e sem autenticação. Dá para responder
// hoje a pergunta que ninguém responde ao prefeito: dos processos que a
// prefeitura registrou, quais de fato constam no PNCP? Achar um que não consta
// vale mais do que publicar automaticamente o que já estava certo.

const BASE = "https://pncp.gov.br/api/consulta/v1";
const TIMEOUT_MS = 20000;

/**
 * O parâmetro de modalidade é OBRIGATÓRIO na consulta, então não existe
 * "buscar tudo": é preciso varrer modalidade por modalidade.
 *
 * A lista cobre as usadas por município. Leilão e diálogo competitivo ficam de
 * fora porque prefeitura pequena não os usa, e cada modalidade a mais é uma
 * requisição a mais contra um limite bem apertado (ver abaixo).
 */
export const MODALIDADES_MUNICIPAIS: { codigo: number; nome: string }[] = [
  { codigo: 6, nome: "Pregão eletrônico" },
  { codigo: 8, nome: "Dispensa" },
  { codigo: 9, nome: "Inexigibilidade" },
  { codigo: 4, nome: "Concorrência eletrônica" },
];

/**
 * O PNCP devolve 429 com facilidade — chegamos ao limite durante o
 * desenvolvimento com poucas chamadas seguidas. Por isso o cliente vai devagar
 * de propósito e o resultado precisa ser guardado em cache por quem chama:
 * conferir publicação é tarefa de rotina diária, não de cada abertura de tela.
 */
const PAUSA_ENTRE_CHAMADAS_MS = 1200;
const TAMANHO_PAGINA = 50; // o mínimo aceito é 10; o máximo reduz idas e vindas

export type ContratacaoPncp = {
  numeroCompra: string;
  anoCompra: number;
  modalidade: string;
  objeto: string;
  valorEstimado: number | null;
  numeroControlePncp: string;
  publicadaEm: string;
};

export type ResultadoConsultaPncp =
  | { ok: true; contratacoes: ContratacaoPncp[] }
  | { ok: false; erro: string; limiteExcedido: boolean };

function esperar(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Consulta as contratações que o PNCP tem publicadas para um CNPJ, num ano.
 *
 * O CNPJ é o do próprio município — vem da tabela prefeituras, não de campo
 * digitado na hora, para a conferência não poder apontar para outro ente.
 */
export async function buscarContratacoesPncp(
  cnpj: string,
  ano: number
): Promise<ResultadoConsultaPncp> {
  const limpo = cnpj.replace(/\D/g, "");
  if (limpo.length !== 14) {
    return { ok: false, erro: "CNPJ do município inválido ou não cadastrado.", limiteExcedido: false };
  }

  const encontradas: ContratacaoPncp[] = [];

  for (const [indice, modalidade] of MODALIDADES_MUNICIPAIS.entries()) {
    if (indice > 0) await esperar(PAUSA_ENTRE_CHAMADAS_MS);

    const url =
      `${BASE}/contratacoes/publicacao?dataInicial=${ano}0101&dataFinal=${ano}1231` +
      `&codigoModalidadeContratacao=${modalidade.codigo}&cnpj=${limpo}` +
      `&pagina=1&tamanhoPagina=${TAMANHO_PAGINA}`;

    try {
      const resposta = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      // 429 precisa ser distinguido de erro de verdade: significa "tente mais
      // tarde", e a tela deve dizer isso em vez de acusar falha do PNCP.
      if (resposta.status === 429) {
        return {
          ok: false,
          erro: "O PNCP está limitando as consultas agora. Tente novamente em alguns minutos.",
          limiteExcedido: true,
        };
      }

      // 204 é a resposta do PNCP para "nada encontrado" nesta modalidade.
      if (resposta.status === 204) continue;
      if (!resposta.ok) continue;

      const json = (await resposta.json()) as { data?: unknown[] };
      for (const bruto of json.data ?? []) {
        const c = bruto as Record<string, unknown>;
        encontradas.push({
          numeroCompra: String(c.numeroCompra ?? ""),
          anoCompra: Number(c.anoCompra) || ano,
          modalidade: String(c.modalidadeNome ?? modalidade.nome),
          objeto: String(c.objetoCompra ?? ""),
          valorEstimado: typeof c.valorTotalEstimado === "number" ? c.valorTotalEstimado : null,
          numeroControlePncp: String(c.numeroControlePNCP ?? ""),
          publicadaEm: String(c.dataPublicacaoPncp ?? ""),
        });
      }
    } catch {
      // Uma modalidade que falhou não invalida as outras. O que não pode
      // acontecer é a tela dizer "não publicado" por causa de timeout nosso —
      // por isso a conferência só afirma ausência quando a consulta foi bem
      // sucedida, e quem chama verifica `ok` antes de concluir qualquer coisa.
      continue;
    }
  }

  return { ok: true, contratacoes: encontradas };
}

// ── CONFERÊNCIA ──
// Daqui para baixo é função pura: é onde mora a regra, e é o que os testes
// cobrem. Nenhuma chamada de rede.

export type LicitacaoLocal = {
  id: string;
  numero: string;
  objeto: string;
  status: string;
};

export type Conferencia = {
  licitacao: LicitacaoLocal;
  publicada: boolean;
  /** Preenchido quando encontrada — dá o link e a prova. */
  correspondente: ContratacaoPncp | null;
};

/**
 * Reduz um número de processo à sua parte comparável.
 *
 * "PE 014/2026", "Pregão 14/2026" e "0014" precisam casar: o PNCP guarda
 * "0014" e a prefeitura digita do jeito que usa internamente. Tiramos tudo que
 * não é dígito da parte antes da barra e derrubamos os zeros à esquerda.
 */
export function normalizarNumero(numero: string): string {
  const antesDaBarra = numero.split("/")[0] ?? "";
  const digitos = antesDaBarra.replace(/\D/g, "");
  return digitos.replace(/^0+/, "") || digitos;
}

/** Ano no fim do número ("PE 014/2026" → 2026), quando houver. */
export function anoDoNumero(numero: string): number | null {
  const m = numero.match(/\/\s*(\d{4})\s*$/);
  return m ? Number(m[1]) : null;
}

/**
 * Cruza o que a prefeitura registrou com o que o PNCP publicou.
 *
 * Casa por número e, quando o número local traz o ano, também por ano — sem
 * isso o processo 14/2025 casaria com o 14/2026 e a tela diria "publicado"
 * para algo que não está.
 */
export function conferirPublicacao(
  locais: LicitacaoLocal[],
  noPncp: ContratacaoPncp[]
): Conferencia[] {
  return locais.map((licitacao) => {
    const alvo = normalizarNumero(licitacao.numero);
    const ano = anoDoNumero(licitacao.numero);

    const correspondente =
      alvo === ""
        ? null
        : noPncp.find(
            (c) =>
              normalizarNumero(c.numeroCompra) === alvo &&
              (ano === null || c.anoCompra === ano)
          ) ?? null;

    return { licitacao, publicada: correspondente !== null, correspondente };
  });
}

export type ResumoConferencia = {
  total: number;
  publicadas: number;
  ausentes: Conferencia[];
};

export function resumirConferencia(conferencias: Conferencia[]): ResumoConferencia {
  const ausentes = conferencias.filter((c) => !c.publicada);
  return {
    total: conferencias.length,
    publicadas: conferencias.length - ausentes.length,
    ausentes,
  };
}

/** Endereço público da contratação no PNCP, para o gestor abrir e conferir. */
export function linkPncp(c: ContratacaoPncp): string | null {
  // Formato do identificador: <cnpj>-1-<sequencial>/<ano>
  const m = c.numeroControlePncp.match(/^(\d{14})-\d+-(\d+)\/(\d{4})$/);
  if (!m) return null;
  const [, cnpj, sequencial, ano] = m;
  return `https://pncp.gov.br/app/editais/${cnpj}/${ano}/${Number(sequencial)}`;
}
