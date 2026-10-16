import { and, desc, eq, inArray, like } from "drizzle-orm";
import { db } from "@/db";
import { atendimentos, contratos, dashboardSnapshots, escolas, licitacoes, obras, pedidoEventos, publicacoes, unidadesSaude } from "@/db/schema";
import type { buscarPortal } from "@/app/transparencia/actions";
import { planosContratadosDe } from "@/lib/planos";
import { EVENTO_OK } from "@/lib/importacao-automatica";
import { maisRecente, type Conjunto, type Fontes, type Frescor } from "@/lib/dados-abertos";

// ── O QUE O PORTAL PÚBLICO CARREGA ──
// Uma leitura só, usada pela página (/transparencia/[slug]) e pelos arquivos
// de dados abertos (/transparencia/[slug]/dados/...): o que a página mostra é
// exatamente o que o arquivo entrega.

export type Portal = NonNullable<Awaited<ReturnType<typeof buscarPortal>>>;

export async function carregarPortal(portal: Portal) {
  const planos = planosContratadosDe(portal.planosContratados);
  const id = portal.prefeituraId;
  const umAnoAtras = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);

  const [snapshots, listaObras, listaLicitacoes, listaContratos, listaPublicacoes, manifestacoes, unidades, escolasDaRede, importacoes] = await Promise.all([
    portal.mostrarFinanceiro
      ? db.select().from(dashboardSnapshots).where(eq(dashboardSnapshots.prefeituraId, id)).orderBy(desc(dashboardSnapshots.atualizadoEm)).limit(60)
      : Promise.resolve([]),
    portal.mostrarObras ? db.select().from(obras).where(eq(obras.prefeituraId, id)).orderBy(desc(obras.createdAt)) : Promise.resolve([]),
    portal.mostrarLicitacoes ? db.select().from(licitacoes).where(eq(licitacoes.prefeituraId, id)).orderBy(desc(licitacoes.createdAt)) : Promise.resolve([]),
    portal.mostrarLicitacoes ? db.select().from(contratos).where(eq(contratos.prefeituraId, id)).orderBy(desc(contratos.createdAt)) : Promise.resolve([]),
    db.select().from(publicacoes).where(eq(publicacoes.prefeituraId, id)).orderBy(desc(publicacoes.atualizadoEm)),
    // Só as colunas que a voz da cidade e o arquivo usam: assunto, mensagem
    // e contato nem saem do banco.
    db
      .select({ tipo: atendimentos.tipo, status: atendimentos.status, secretaria: atendimentos.secretaria, createdAt: atendimentos.createdAt, respondidoEm: atendimentos.respondidoEm })
      .from(atendimentos)
      .where(eq(atendimentos.prefeituraId, id))
      .orderBy(desc(atendimentos.createdAt))
      .limit(2000),
    // A rede de saúde e de educação é pública (CNES e Censo Escolar).
    planos.includes("saude")
      ? db.select().from(unidadesSaude).where(and(eq(unidadesSaude.prefeituraId, id), eq(unidadesSaude.ativo, true)))
      : Promise.resolve([]),
    planos.includes("educacao")
      ? db.select().from(escolas).where(eq(escolas.prefeituraId, id)).then((ls) => ls.filter((e) => e.situacao !== "extinta" && e.situacao !== "paralisada"))
      : Promise.resolve([]),
    db
      .select({ pedidoId: pedidoEventos.pedidoId, criadoEm: pedidoEventos.criadoEm })
      .from(pedidoEventos)
      .where(and(like(pedidoEventos.pedidoId, `importacao:${id}:%`), inArray(pedidoEventos.tipo, [EVENTO_OK])))
      .orderBy(desc(pedidoEventos.criadoEm))
      .limit(60),
  ]);

  const ultimaImportacao = (fonte: string) => importacoes.find((i) => i.pedidoId === `importacao:${id}:${fonte}`)?.criadoEm ?? null;
  const publicadas = listaPublicacoes.filter((p) => p.publicado);
  const servicos = publicadas.filter((p) => p.tipo === "servico");
  const doUltimoAno = manifestacoes.filter((m) => m.createdAt >= umAnoAtras);

  const frescor: Partial<Record<Conjunto, Frescor>> = {};
  const marcar = (c: Conjunto, sozinho: string | null, fonte: string, manual: string | null) => {
    if (sozinho) frescor[c] = { quando: sozinho, sozinho: true, fonte };
    else if (manual) frescor[c] = { quando: manual, sozinho: false, fonte: "prefeitura" };
  };
  marcar("obras", listaObras.some((o) => o.origem === "pncp") ? ultimaImportacao("obras") : null, "PNCP", maisRecente(listaObras.flatMap((o) => [o.atualizadoEm, o.createdAt])));
  marcar("compras", ultimaImportacao("pncp-processos"), "PNCP", maisRecente(listaLicitacoes.map((l) => l.createdAt)));
  marcar("contratos", ultimaImportacao("pncp-contratos"), "PNCP", maisRecente(listaContratos.map((c) => c.createdAt)));
  marcar("unidades-de-saude", ultimaImportacao("cnes"), "CNES", maisRecente(unidades.flatMap((u) => [u.sincronizadoEm, u.createdAt])));
  marcar("escolas", null, "", maisRecente(escolasDaRede.flatMap((e) => [e.sincronizadoEm, e.createdAt])));
  marcar("servicos", null, "", maisRecente(servicos.map((s) => s.atualizadoEm)));
  if (doUltimoAno.length) frescor.manifestacoes = { quando: new Date().toISOString(), sozinho: true, fonte: "próprio portal, a cada manifestação" };
  const snap = snapshots[0];
  if (snap) frescor.dinheiro = { quando: snap.atualizadoEm, sozinho: snap.origem === "integracao", fonte: snap.origem === "integracao" ? "Tesouro Nacional" : "prefeitura" };

  const fontes: Fontes = {
    obras: listaObras,
    compras: listaLicitacoes,
    contratos: listaContratos,
    unidades,
    escolas: escolasDaRede,
    servicos,
    manifestacoes: doUltimoAno,
    dinheiro: snapshots,
  };

  return {
    snapshot: snapshots[0] ?? null,
    listaObras,
    listaLicitacoes,
    listaPublicacoes,
    manifestacoes,
    unidades,
    escolas: escolasDaRede,
    fontes,
    frescor,
  };
}
