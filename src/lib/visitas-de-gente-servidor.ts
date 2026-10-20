import { gte } from "drizzle-orm";
import { db } from "@/db";
import { eventos } from "@/db/schema";
import { separarGente } from "@/lib/visitas-de-gente";

/**
 * As visitas do site desde `corte`, sem as de robô (ver visitas-de-gente.ts).
 * Lê tudo da janela porque a regra precisa do dia inteiro de cada visitante.
 */
export async function visitasDeGente(corte: string) {
  const linhas = await db
    .select({
      tipo: eventos.tipo,
      visitante: eventos.visitante,
      codigoIbge: eventos.codigoIbge,
      municipio: eventos.municipio,
      uf: eventos.uf,
      origem: eventos.origem,
      criadoEm: eventos.criadoEm,
    })
    .from(eventos)
    .where(gte(eventos.criadoEm, corte))
    .limit(100_000);
  const { gente, robos } = separarGente(linhas);
  return { todas: linhas, gente, robos };
}
