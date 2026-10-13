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
    }),
    autor: "envio de e-mail",
  });
}

export async function pendentesDaCaixaDeSaida(limite = 100): Promise<EmailPendente[]> {
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

