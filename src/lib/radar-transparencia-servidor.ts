import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { configPublica, contratos, dashboardSnapshots, licitacoes, obras, prefeituras, publicacoes } from "@/db/schema";
import { planosContratadosDe } from "@/lib/planos";
import { lerEmendas } from "@/lib/emendas-pix-servidor";
import { radarDaTransparencia, type ItemRadar } from "@/lib/radar-transparencia";

/** O radar da transparência de uma prefeitura, com os dados de hoje. */
export async function radarDaPrefeitura(prefeituraId: string, hoje: Date = new Date()): Promise<ItemRadar[]> {
  const [cfg, [pref], pubs, [snap], [comp], [cont], [obr], emendas] = await Promise.all([
    db
      .select({ ativo: configPublica.portalAtivo, financeiro: configPublica.mostrarFinanceiro, mostrarObras: configPublica.mostrarObras, mostrarLicitacoes: configPublica.mostrarLicitacoes })
      .from(configPublica)
      .where(eq(configPublica.prefeituraId, prefeituraId))
      .limit(1)
      .then((r) => r[0] ?? null),
    db.select({ planos: prefeituras.planosContratados }).from(prefeituras).where(eq(prefeituras.id, prefeituraId)).limit(1),
    db.select({ tipo: publicacoes.tipo, publicado: publicacoes.publicado }).from(publicacoes).where(eq(publicacoes.prefeituraId, prefeituraId)),
    db
      .select({ atualizadoEm: dashboardSnapshots.atualizadoEm, origem: dashboardSnapshots.origem })
      .from(dashboardSnapshots)
      .where(eq(dashboardSnapshots.prefeituraId, prefeituraId))
      .orderBy(desc(dashboardSnapshots.atualizadoEm))
      .limit(1),
    db.select({ n: count() }).from(licitacoes).where(eq(licitacoes.prefeituraId, prefeituraId)),
    db.select({ n: count() }).from(contratos).where(eq(contratos.prefeituraId, prefeituraId)),
    db.select({ n: count() }).from(obras).where(eq(obras.prefeituraId, prefeituraId)),
    lerEmendas(prefeituraId),
  ]);
  const planos = planosContratadosDe(pref?.planos);
  const mostra = (flag: boolean | undefined) => cfg?.ativo !== false && flag !== false;
  return radarDaTransparencia(
    {
      portalAtivo: !!cfg?.ativo,
      publicadas: pubs.filter((p) => p.publicado),
      financeiro: snap && mostra(cfg?.financeiro) ? { atualizadoEm: snap.atualizadoEm, automatico: snap.origem === "integracao" } : null,
      compras: mostra(cfg?.mostrarLicitacoes) ? comp.n : 0,
      contratos: mostra(cfg?.mostrarLicitacoes) ? cont.n : 0,
      obras: mostra(cfg?.mostrarObras) ? obr.n : 0,
      emendas: emendas?.emendas.length ?? 0,
      importaLicitacoes: planos.includes("licitacoes"),
      importaObras: planos.includes("obras"),
    },
    hoje
  );
}
