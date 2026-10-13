import { and, gte, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { eventos, leads, pedidosProposta } from "@/db/schema";
import { sinaisPorCidade, type SinalDaCidade } from "@/lib/sinais-de-interesse";

/** As cidades com sinal de interesse nos últimos `dias`. Ver sinais-de-interesse.ts. */
export async function carregarSinais(dias = 7, limite = 15): Promise<SinalDaCidade[]> {
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString();
  const [ev, comLead, comPedido] = await Promise.all([
    db
      .select({
        tipo: eventos.tipo,
        codigoIbge: eventos.codigoIbge,
        municipio: eventos.municipio,
        uf: eventos.uf,
        visitante: eventos.visitante,
        criadoEm: eventos.criadoEm,
      })
      .from(eventos)
      .where(and(gte(eventos.criadoEm, desde), isNotNull(eventos.codigoIbge), inArray(eventos.tipo, ["raio_x", "proposta_aberta"])))
      .limit(20_000),
    db.select({ c: leads.codigoIbge }).from(leads).where(isNotNull(leads.codigoIbge)),
    db.select({ c: pedidosProposta.codigoIbge }).from(pedidosProposta),
  ]);
  const emContato = new Set([...comLead, ...comPedido].map((x) => x.c).filter((c): c is string => !!c));
  return sinaisPorCidade(ev, emContato, limite);
}
