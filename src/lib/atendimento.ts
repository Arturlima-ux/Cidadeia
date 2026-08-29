import { randomBytes } from "crypto";

export type TipoAtendimento =
  | "protocolo"
  | "denuncia"
  | "reclamacao"
  | "sugestao"
  | "elogio"
  | "informacao";

export type StatusAtendimento = "aberto" | "em_analise" | "respondido" | "encerrado";

export const TIPOS: { chave: TipoAtendimento; nome: string; descricao: string; permiteAnonimo: boolean }[] = [
  {
    chave: "protocolo",
    nome: "Solicitação de serviço",
    descricao: "Pedido de reparo, poda, coleta, iluminação, documento.",
    permiteAnonimo: false,
  },
  {
    chave: "reclamacao",
    nome: "Reclamação",
    descricao: "Serviço público que não funcionou como deveria.",
    permiteAnonimo: true,
  },
  {
    chave: "denuncia",
    nome: "Denúncia",
    descricao: "Irregularidade ou má conduta no serviço público.",
    permiteAnonimo: true,
  },
  {
    chave: "sugestao",
    nome: "Sugestão",
    descricao: "Ideia para melhorar um serviço da cidade.",
    permiteAnonimo: true,
  },
  {
    chave: "elogio",
    nome: "Elogio",
    descricao: "Reconhecimento a um serviço ou servidor.",
    permiteAnonimo: true,
  },
  {
    chave: "informacao",
    nome: "Pedido de informação",
    descricao: "Acesso a informação pública (Lei 12.527/2011).",
    permiteAnonimo: false,
  },
];

export const NOME_TIPO: Record<TipoAtendimento, string> = Object.fromEntries(
  TIPOS.map((t) => [t.chave, t.nome])
) as Record<TipoAtendimento, string>;

export const NOME_STATUS: Record<StatusAtendimento, string> = {
  aberto: "Aberto",
  em_analise: "Em análise",
  respondido: "Respondido",
  encerrado: "Encerrado",
};

/**
 * Denúncia, reclamação, sugestão e elogio aceitam manifestação anônima — a
 * Lei 13.460/2017 garante esse direito na ouvidoria. Solicitação de serviço e
 * pedido de informação exigem identificação, porque sem ela é impossível
 * executar o serviço ou entregar a resposta.
 */
export function permiteAnonimo(tipo: TipoAtendimento): boolean {
  return TIPOS.find((t) => t.chave === tipo)?.permiteAnonimo ?? false;
}

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem I,O,0,1 — confundem quem anota à mão

function sortear(tamanho: number): string {
  const bytes = randomBytes(tamanho);
  let saida = "";
  for (let i = 0; i < tamanho; i++) {
    saida += ALFABETO[bytes[i] % ALFABETO.length];
  }
  return saida;
}

/**
 * Número de protocolo: AAAAMM-XXXXXX (ano/mês + 6 caracteres sorteados).
 *
 * Não é sequencial de propósito. Numeração sequencial permitiria a qualquer
 * pessoa adivinhar protocolos alheios só somando 1 — e manifestação de
 * ouvidoria costuma conter denúncia.
 */
export function gerarProtocolo(agora = new Date()): string {
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  return `${ano}${mes}-${sortear(6)}`;
}

/** Chave secreta que o cidadão usa junto com o protocolo para consultar. */
export function gerarChaveConsulta(): string {
  return sortear(8);
}

/** Comparação em tempo constante — evita descobrir a chave por tentativa e erro cronometrada. */
export function chaveConfere(informada: string, armazenada: string): boolean {
  const a = informada.trim().toUpperCase();
  const b = armazenada.trim().toUpperCase();
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) {
    diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diferenca === 0;
}

/**
 * Monta o link wa.me com a mensagem já preenchida.
 *
 * Limitação honesta: isto ABRE o WhatsApp do cidadão com o texto pronto para
 * ele enviar. Não é um robô que recebe e responde sozinho — isso exigiria a
 * API oficial do WhatsApp Business (Meta), que precisa de verificação da
 * empresa, número dedicado e tem custo por conversa.
 */
export function linkWhatsApp(
  numero: string | null | undefined,
  protocolo: string,
  assunto: string
): string | null {
  if (!numero) return null;
  const limpo = numero.replace(/\D/g, "");
  if (limpo.length < 12 || limpo.length > 15) return null; // DDI+DDD+número
  const texto = `Olá! Abri o protocolo ${protocolo} sobre: ${assunto}`;
  return `https://wa.me/${limpo}?text=${encodeURIComponent(texto)}`;
}

/** Slug do portal público a partir do nome do município. */
export function gerarSlug(municipio: string, estado: string): string {
  const base = `${municipio}-${estado}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "municipio";
}
