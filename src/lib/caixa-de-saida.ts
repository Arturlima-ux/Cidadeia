import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { pedidoEventos } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { htmlParaTexto } from "@/lib/caixa-de-saida-texto";

export { htmlParaTexto, linkRascunhoGmail } from "@/lib/caixa-de-saida-texto";

// ── A CAIXA DE SAÍDA: NENHUM E-MAIL PARA CLIENTE SE PERDE ──
//
// Quando um e-mail para fora (prefeitura, interessado) não sai, nem pela
// Resend nem pelo Gmail, ele não pode simplesmente sumir num log. Fica aqui,
// com o texto pronto, e a equipe manda à mão em /admin/saida com um clique
// ("Abrir no Gmail" já preenchido). Sem tabela nova: cada pendência é uma
// linha da linha do tempo (pedido_eventos) com um id próprio.

export const TIPO_PENDENTE = "email_pendente";
export const TIPO_RESOLVIDO = "email_resolvido";

export type EmailPendente = {
  id: string;
  para: string;
  assunto: string;
  texto: string;
  anexos: string[];
  /** Pedido de proposta ligado ao e-mail, para baixar o PDF anexo. */
  pedidoId: string | null;
  motivo: string;
  criadoEm: string;
};

export async function guardarNaCaixaDeSaida(e: {
  para: string;
  assunto: string;
  html: string;
  anexos?: string[];
  pedidoId?: string | null;
  motivo: string;
}): Promise<void> {
  await db.insert(pedidoEventos).values({
    id: gerarId("pev"),
    pedidoId: gerarId("saida"),
    tipo: TIPO_PENDENTE,
    descricao: JSON.stringify({
      para: e.para,
      assunto: e.assunto,
      texto: htmlParaTexto(e.html),
      anexos: e.anexos ?? [],
      pedidoId: e.pedidoId ?? null,
      motivo: e.motivo.slice(0, 300),
      // Só chega aqui quem pediu a cópia (lib/email.ts): a marca diz que a
      // linha é da relação comercial e não deve ser apagada pela limpeza.
      comercial: true,
    }),
    autor: "envio de e-mail",
  });
}

// ── O QUE FICOU GUARDADO ANTES DA REGRA ──
// Até outubro de 2026 todo e-mail que falhava vinha para cá, inclusive
// código de login, link de troca de senha e e-mails da ouvidoria com nome,
// contato e texto do cidadão. Essas linhas são apagadas: a limpeza roda na
// rotina diária (api/manter-vivo) e sempre que alguém abre /admin/saida.
// Fica só o que é comercial: as linhas novas trazem a marca `comercial`, e as
// antigas são reconhecidas pelo assunto dos e-mails comerciais da época.
const ASSUNTOS_COMERCIAIS_ANTIGOS = [
  /^Proposta do CidadeIA para /,
  /^Pedido recebido — proposta do CidadeIA /,
  /^CidadeIA: .*módulos ativos para /,
  /: o processo de contratação já vai pronto$/,
  /: o que o painel mostraria por dentro$/,
  /^Raio-X da Prefeitura de /,
  /^Projeção da despesa com pessoal — /,
];

/** true para a linha que pode continuar na caixa de saída da equipe. */
export function linhaPodeFicar(descricao: string): boolean {
  try {
    const d = JSON.parse(descricao) as { assunto?: unknown; comercial?: unknown };
    if (d.comercial === true) return true;
    const assunto = typeof d.assunto === "string" ? d.assunto : "";
    return ASSUNTOS_COMERCIAIS_ANTIGOS.some((r) => r.test(assunto));
  } catch {
    // Sem como ler, sem como saber o que tem dentro: sai.
    return false;
  }
}

/** Apaga as pendências que não são comerciais. Devolve quantas apagou. */
export async function limparPendentesSensiveis(): Promise<number> {
  const linhas = await db
    .select({ id: pedidoEventos.id, descricao: pedidoEventos.descricao })
    .from(pedidoEventos)
    .where(eq(pedidoEventos.tipo, TIPO_PENDENTE));
  const apagar = linhas.filter((l) => !linhaPodeFicar(l.descricao)).map((l) => l.id);
  if (apagar.length) await db.delete(pedidoEventos).where(inArray(pedidoEventos.id, apagar));
  return apagar.length;
}

export async function pendentesDaCaixaDeSaida(limite = 100): Promise<EmailPendente[]> {
  await limparPendentesSensiveis().catch((e) => console.error("[caixa de saída] limpeza:", e));
  const linhas = await db
    .select()
    .from(pedidoEventos)
    .where(eq(pedidoEventos.tipo, TIPO_PENDENTE))
    .orderBy(desc(pedidoEventos.criadoEm))
    .limit(limite);
  if (!linhas.length) return [];
  const resolvidos = await db
    .select({ pedidoId: pedidoEventos.pedidoId })
    .from(pedidoEventos)
    .where(and(eq(pedidoEventos.tipo, TIPO_RESOLVIDO), inArray(pedidoEventos.pedidoId, linhas.map((l) => l.pedidoId))));
  const feitos = new Set(resolvidos.map((r) => r.pedidoId));
  return linhas
    .filter((l) => !feitos.has(l.pedidoId))
    .flatMap((l) => {
      try {
        const d = JSON.parse(l.descricao) as Omit<EmailPendente, "id" | "criadoEm">;
        return [{ ...d, id: l.pedidoId, criadoEm: l.criadoEm }];
      } catch {
        return [];
      }
    });
}

export async function resolverPendente(id: string, autor: string): Promise<void> {
  await db.insert(pedidoEventos).values({
    id: gerarId("pev"),
    pedidoId: id,
    tipo: TIPO_RESOLVIDO,
    descricao: "Enviado à mão pela equipe",
    autor,
  });
}

