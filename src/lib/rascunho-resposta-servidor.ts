import { eq } from "drizzle-orm";
import { db } from "@/db";
import { configPublica } from "@/db/schema";
import { buscarPortal } from "@/app/transparencia/actions";
import { carregarPortal } from "@/lib/portal-servidor";
import { montarIndice, type ItemDaCidade } from "@/lib/pergunte-a-cidade";

/** O índice do "Pergunte à cidade" desta prefeitura, a partir do portal público. Vazio sem portal ativo. */
export async function indiceDaPrefeitura(prefeituraId: string): Promise<ItemDaCidade[]> {
  const [c] = await db.select({ slug: configPublica.slug }).from(configPublica).where(eq(configPublica.prefeituraId, prefeituraId)).limit(1);
  if (!c?.slug) return [];
  const portal = await buscarPortal(c.slug);
  if (!portal) return [];
  const d = await carregarPortal(portal);
  const publicadas = d.listaPublicacoes.filter((p) => p.publicado);
  return montarIndice({
    municipio: portal.municipio,
    servicos: publicadas.filter((p) => p.tipo === "servico"),
    outrasPublicacoes: publicadas.filter((p) => p.tipo !== "servico"),
    unidades: d.unidades,
    escolas: d.escolas,
    obras: portal.mostrarObras ? d.listaObras : [],
    compras: portal.mostrarLicitacoes ? d.listaLicitacoes : [],
    dinheiro: portal.mostrarFinanceiro && d.snapshot ? { receita: d.snapshot.receita, despesas: d.snapshot.despesas, saldo: d.snapshot.saldo } : null,
  });
}
