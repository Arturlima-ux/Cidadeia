import { db } from "@/db";
import { auditoria } from "@/db/schema";
import { gerarId } from "@/lib/id";
import type { SessaoPayload } from "@/lib/sessao";

// ── TRILHA DE AUDITORIA ──
//
// "Quem mudou o status desta obra, e quando?" é a primeira pergunta do
// controle interno, e o sistema não tinha resposta. Cada alteração que
// importa — criar, alterar, excluir, responder, publicar, importar,
// ativar — deixa uma linha aqui: quem (usuário e cargo), o quê (entidade
// e id), como ficou (resumo legível) e quando.
//
// ── O QUE NÃO ENTRA ──
// Leitura não entra: registrar quem abriu qual tela viraria vigilância do
// servidor e não responde à pergunta do controle. A demo não entra: é
// ficção. Senha e chave de consulta nunca entram no resumo.
//
// ── NUNCA DERRUBA A AÇÃO ──
// Se a trilha falhar (tabela ausente, banco fora), a ação principal já
// aconteceu e continua valendo; o erro vai para o log. Auditoria que
// impede o trabalho é auditoria que alguém desliga.

export type EntidadeAuditada =
  | "obra"
  | "licitacao"
  | "unidade_saude"
  | "escola"
  | "indicador"
  | "alerta"
  | "atendimento"
  | "publicacao"
  | "usuario"
  | "portal"
  | "prefeitura"
  | "financeiro"
  | "importacao"
  | "modulo"
  | "implantacao";

export type AcaoAuditada = "criar" | "alterar" | "excluir" | "responder" | "publicar" | "despublicar" | "importar" | "ativar" | "pedir" | "concluir" | "resolver";

export const NOME_ENTIDADE: Record<EntidadeAuditada, string> = {
  obra: "Obra",
  licitacao: "Licitação",
  unidade_saude: "Unidade de saúde",
  escola: "Escola",
  indicador: "Indicador",
  alerta: "Alerta",
  atendimento: "Atendimento ao cidadão",
  publicacao: "Publicação do portal",
  usuario: "Usuário",
  portal: "Portal público",
  prefeitura: "Dados da prefeitura",
  financeiro: "Financeiro",
  importacao: "Importação",
  modulo: "Módulo",
  implantacao: "Implantação",
};

export const NOME_ACAO: Record<AcaoAuditada, string> = {
  criar: "criou",
  alterar: "alterou",
  excluir: "excluiu",
  responder: "respondeu",
  publicar: "publicou",
  despublicar: "despublicou",
  importar: "importou",
  ativar: "ativou",
  pedir: "pediu",
  concluir: "concluiu",
  resolver: "resolveu",
};

export type RegistroAuditoria = {
  acao: AcaoAuditada;
  entidade: EntidadeAuditada;
  entidadeId?: string | null;
  /** Uma frase, legível por gente: "Obra 'Reforma da UBS' de 20% para 45%, status em andamento". */
  resumo: string;
};

/** Frase completa para a tela: "Maria (secretário) alterou Obra: …". */
export function fraseDaAuditoria(l: { usuarioNome: string; usuarioCargo: string; acao: string; entidade: string; resumo: string }): string {
  const acao = NOME_ACAO[l.acao as AcaoAuditada] ?? l.acao;
  const ent = NOME_ENTIDADE[l.entidade as EntidadeAuditada] ?? l.entidade;
  return `${l.usuarioNome} (${l.usuarioCargo}) ${acao} ${ent.toLowerCase()}: ${l.resumo}`;
}

/** Corta o resumo para caber e nunca carregar segredo por acidente. */
export function limparResumo(texto: string): string {
  return texto.replace(/\s+/g, " ").trim().slice(0, 400);
}

export async function auditar(sessao: SessaoPayload | null, registro: RegistroAuditoria): Promise<void> {
  if (!sessao || sessao.demo) return;
  try {
    await db.insert(auditoria).values({
      id: gerarId("aud"),
      prefeituraId: sessao.prefeituraId,
      usuarioId: sessao.usuarioId,
      usuarioNome: sessao.nome,
      usuarioCargo: sessao.cargo,
      acao: registro.acao,
      entidade: registro.entidade,
      entidadeId: registro.entidadeId ?? null,
      resumo: limparResumo(registro.resumo),
    });
  } catch (e) {
    console.error("[auditoria] não foi possível registrar:", e);
  }
}
