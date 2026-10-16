import { notFound } from "next/navigation";
import { buscarPortal } from "../actions";
import { db } from "@/db";
import { dashboardSnapshots, obras, licitacoes, publicacoes, atendimentos, unidadesSaude, escolas } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { planosContratadosDe } from "@/lib/planos";
import PortalMinimo from "../PortalMinimo";
import PortalCidade from "../PortalCidade";
import { modoDoPortal } from "@/lib/endereco-publico";
import { resumirVoz } from "@/lib/voz-da-cidade";

export const metadata = { title: "Portal da Transparência" };

// O desenho do portal mora em ../PortalCidade.tsx; aqui só os dados. A cidade
// de exemplo (/transparencia/exemplo) usa o mesmo componente.

export default async function PortalTransparencia({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const portal = await buscarPortal(slug);
  if (!portal) notFound();

  // Sem o Essencial, o endereço não some: mostra o portal mínimo.
  if (modoDoPortal(portal.planosContratados) === "minimo") return <PortalMinimo portal={portal} />;

  // A rede de saúde e de educação é pública (CNES e Censo Escolar): entra no
  // "Pergunte à cidade" quando o módulo está contratado.
  const planos = planosContratadosDe(portal.planosContratados);
  const [unidades, escolasDaRede] = await Promise.all([
    planos.includes("saude")
      ? db
          .select({ id: unidadesSaude.id, nome: unidadesSaude.nome, tipo: unidadesSaude.tipo, bairro: unidadesSaude.bairro, endereco: unidadesSaude.endereco, telefone: unidadesSaude.telefone, turno: unidadesSaude.turno, latitude: unidadesSaude.latitude, longitude: unidadesSaude.longitude })
          .from(unidadesSaude)
          .where(and(eq(unidadesSaude.prefeituraId, portal.prefeituraId), eq(unidadesSaude.ativo, true)))
      : Promise.resolve([]),
    planos.includes("educacao")
      ? db
          .select({ id: escolas.id, nome: escolas.nome, bairro: escolas.bairro, endereco: escolas.endereco, telefone: escolas.telefone, etapas: escolas.etapas, latitude: escolas.latitude, longitude: escolas.longitude, situacao: escolas.situacao })
          .from(escolas)
          .where(eq(escolas.prefeituraId, portal.prefeituraId))
          .then((ls) => ls.filter((e) => e.situacao !== "extinta" && e.situacao !== "paralisada"))
      : Promise.resolve([]),
  ]);

  const [snapshot, listaObras, listaLicitacoes, listaPublicacoes, manifestacoes] = await Promise.all([
    portal.mostrarFinanceiro
      ? db
          .select()
          .from(dashboardSnapshots)
          .where(eq(dashboardSnapshots.prefeituraId, portal.prefeituraId))
          .orderBy(desc(dashboardSnapshots.atualizadoEm))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    portal.mostrarObras
      ? db.select().from(obras).where(eq(obras.prefeituraId, portal.prefeituraId)).orderBy(desc(obras.createdAt))
      : Promise.resolve([]),
    portal.mostrarLicitacoes
      ? db.select().from(licitacoes).where(eq(licitacoes.prefeituraId, portal.prefeituraId)).orderBy(desc(licitacoes.createdAt))
      : Promise.resolve([]),
    db.select().from(publicacoes).where(eq(publicacoes.prefeituraId, portal.prefeituraId)).orderBy(desc(publicacoes.atualizadoEm)),
    // Só as colunas que a voz da cidade usa: assunto, mensagem e contato
    // nem saem do banco.
    db
      .select({
        tipo: atendimentos.tipo,
        status: atendimentos.status,
        secretaria: atendimentos.secretaria,
        createdAt: atendimentos.createdAt,
        respondidoEm: atendimentos.respondidoEm,
      })
      .from(atendimentos)
      .where(eq(atendimentos.prefeituraId, portal.prefeituraId))
      .orderBy(desc(atendimentos.createdAt))
      .limit(2000),
  ]);

  return (
    <PortalCidade
      portal={portal}
      slug={slug}
      snapshot={snapshot}
      listaObras={listaObras}
      listaLicitacoes={listaLicitacoes}
      listaPublicacoes={listaPublicacoes}
      voz={resumirVoz(manifestacoes)}
      unidades={unidades}
      escolas={escolasDaRede}
    />
  );
}
