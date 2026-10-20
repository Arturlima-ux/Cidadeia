import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { pedidoEventos } from "@/db/schema";
import { gerarId } from "@/lib/id";

// ── A FOTOGRAFIA DA SEMANA ──
// O que uma fonte pública devolveu na última leitura, guardado como um evento
// na linha do tempo (pedido_eventos), sem tabela nova. Só a última fica.

export async function gravarFotografia(pedidoId: string, tipo: string, valor: unknown): Promise<void> {
  const id = gerarId("pev");
  await db.insert(pedidoEventos).values({ id, pedidoId, tipo, descricao: JSON.stringify(valor), autor: "importação automática" });
  await db.delete(pedidoEventos).where(and(eq(pedidoEventos.pedidoId, pedidoId), eq(pedidoEventos.tipo, tipo), ne(pedidoEventos.id, id)));
}

export async function lerFotografia<T>(pedidoId: string, tipo: string): Promise<{ valor: T; conferidoEm: string } | null> {
  const [e] = await db
    .select({ descricao: pedidoEventos.descricao, criadoEm: pedidoEventos.criadoEm })
    .from(pedidoEventos)
    .where(and(eq(pedidoEventos.pedidoId, pedidoId), eq(pedidoEventos.tipo, tipo)))
    .orderBy(desc(pedidoEventos.criadoEm))
    .limit(1);
  if (!e) return null;
  try {
    return { valor: JSON.parse(e.descricao) as T, conferidoEm: e.criadoEm };
  } catch {
    return null;
  }
}
