import { notFound } from "next/navigation";
import { buscarPortal } from "../actions";
import PortalMinimo from "../PortalMinimo";
import PortalCidade from "../PortalCidade";
import { modoDoPortal } from "@/lib/endereco-publico";
import { resumirVoz } from "@/lib/voz-da-cidade";
import { carregarPortal } from "@/lib/portal-servidor";
import { CONJUNTOS, linhasDe } from "@/lib/dados-abertos";

export const metadata = { title: "Portal da Transparência" };

// O desenho do portal mora em ../PortalCidade.tsx; a leitura, em
// lib/portal-servidor.ts (a mesma dos arquivos de dados abertos). A cidade
// de exemplo (/transparencia/exemplo) usa o mesmo componente.

export default async function PortalTransparencia({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const portal = await buscarPortal(slug);
  if (!portal) notFound();

  // Sem o Essencial, o endereço não some: mostra o portal mínimo.
  if (modoDoPortal(portal.planosContratados) === "minimo") return <PortalMinimo portal={portal} />;

  const d = await carregarPortal(portal);

  return (
    <PortalCidade
      portal={portal}
      slug={slug}
      snapshot={d.snapshot}
      listaObras={d.listaObras}
      listaLicitacoes={d.listaLicitacoes}
      listaPublicacoes={d.listaPublicacoes}
      voz={resumirVoz(d.manifestacoes)}
      unidades={d.unidades}
      escolas={d.escolas}
      frescor={d.frescor}
      emendas={d.emendas}
      obrasParadas={d.obrasParadas}
      conjuntos={CONJUNTOS.map((c) => ({ chave: c.chave, registros: linhasDe(c.chave, d.fontes).length }))}
    />
  );
}
