"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { pedidoEventos } from "@/db/schema";
import { emailDaEquipe } from "@/lib/equipe";
import { gerarId } from "@/lib/id";
import { TIPOS_EVENTO_LEAD } from "@/lib/oportunidades";

const TIPO_POR_ACAO = {
  contatado: TIPOS_EVENTO_LEAD.contatado,
  descartado: TIPOS_EVENTO_LEAD.descartado,
  virou_pedido: TIPOS_EVENTO_LEAD.virouPedido,
} as const;

/** Marca o andamento de um interessado. Só a equipe. */
export async function marcarInteressado(
  leadId: string,
  acao: keyof typeof TIPO_POR_ACAO,
  nota: string = ""
): Promise<{ ok: boolean; erro?: string }> {
  const autor = await emailDaEquipe();
  if (!autor) return { ok: false, erro: "Sem permissão." };
  if (!/^lead_[A-Za-z0-9_-]{4,64}$/.test(leadId) || !(acao in TIPO_POR_ACAO)) return { ok: false, erro: "Pedido inválido." };
  await db.insert(pedidoEventos).values({
    id: gerarId("pev"),
    pedidoId: leadId,
    tipo: TIPO_POR_ACAO[acao],
    descricao: nota.trim().slice(0, 500) || acao,
    autor,
  });
  revalidatePath("/admin/interessados");
  return { ok: true };
}
