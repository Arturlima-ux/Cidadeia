import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { atendimentos, pedidoEventos } from "@/db/schema";
import { EVENTO_AVALIACAO, ultimaPorManifestacao, type Avaliacao } from "@/lib/avaliacao-cidadao";

/** A última avaliação de cada manifestação da prefeitura, com o comentário (só para o painel). */
export async function avaliacoesDaPrefeitura(prefeituraId: string): Promise<Map<string, Avaliacao>> {
  const eventos = await db
    .select({ pedidoId: pedidoEventos.pedidoId, descricao: pedidoEventos.descricao })
    .from(pedidoEventos)
    .innerJoin(atendimentos, eq(atendimentos.id, pedidoEventos.pedidoId))
    .where(and(eq(atendimentos.prefeituraId, prefeituraId), eq(pedidoEventos.tipo, EVENTO_AVALIACAO)))
    .orderBy(desc(pedidoEventos.criadoEm))
    .limit(5000);
  return ultimaPorManifestacao(eventos);
}
