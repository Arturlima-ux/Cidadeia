import { eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { leads, pedidoEventos, pedidosProposta } from "@/db/schema";
import { TIPO as TIPO_PROSPECCAO } from "@/lib/prospeccao";
import { sinaisPorCidade, type SinalDaCidade } from "@/lib/sinais-de-interesse";
import { visitasDeGente } from "@/lib/visitas-de-gente-servidor";
import { FILTRO_DE_NAVEGADOR_DESDE } from "@/lib/visitas-de-gente";

/**
 * As cidades com sinal de interesse nos últimos `dias`, só com visita de
 * gente (lib/visitas-de-gente.ts). `descartadas` são as cidades que só
 * apareciam por causa de robô.
 */
export async function carregarSinaisComDescarte(
  dias = 7,
  limite = 15
): Promise<{ sinais: SinalDaCidade[]; descartadas: number; cortadoEm: string | null }> {
  const janela = new Date(Date.now() - dias * 86_400_000).toISOString();
  // Antes do filtro de navegador, robô de uma visita só não se distingue de gente.
  const desde = janela > FILTRO_DE_NAVEGADOR_DESDE ? janela : FILTRO_DE_NAVEGADOR_DESDE;
  const [{ todas, gente }, comLead, comPedido, naProspeccao] = await Promise.all([
    visitasDeGente(desde),
    db.select({ c: leads.codigoIbge }).from(leads).where(isNotNull(leads.codigoIbge)),
    db.select({ c: pedidosProposta.codigoIbge }).from(pedidosProposta),
    // A cidade que já está na mesa de prospecção também conta como em contato:
    // senão o mesmo sinal a levaria para a mesa de novo.
    db.select({ d: pedidoEventos.descricao }).from(pedidoEventos).where(eq(pedidoEventos.tipo, TIPO_PROSPECCAO.criado)),
  ]);
  const prospectadas = naProspeccao.map((x) => {
    try {
      return (JSON.parse(x.d) as { codigoIbge?: string | null }).codigoIbge ?? null;
    } catch {
      return null;
    }
  });
  const emContato = new Set([...comLead, ...comPedido].map((x) => x.c).concat(prospectadas).filter((c): c is string => !!c));
  const comGente = new Set(sinaisPorCidade(gente, emContato, 10_000).map((s) => s.codigoIbge));
  const descartadas = sinaisPorCidade(todas, emContato, 10_000).filter((s) => !comGente.has(s.codigoIbge)).length;
  return { sinais: sinaisPorCidade(gente, emContato, limite), descartadas, cortadoEm: desde === janela ? null : desde };
}

export async function carregarSinais(dias = 7, limite = 15): Promise<SinalDaCidade[]> {
  return (await carregarSinaisComDescarte(dias, limite)).sinais;
}
