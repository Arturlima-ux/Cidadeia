import { notFound } from "next/navigation";
import { compartilhamento } from "@/lib/seo";
import { buscarPortal } from "../actions";
import PortalMinimo from "../PortalMinimo";
import PortalCidade from "../PortalCidade";
import { modoDoPortal } from "@/lib/endereco-publico";
import { resumirVoz } from "@/lib/voz-da-cidade";
import { carregarPortal } from "@/lib/portal-servidor";
import { CONJUNTOS, linhasDe } from "@/lib/dados-abertos";

// Era "Portal do Cidadão" para toda cidade, com a descrição da home: no
// Google, todos os portais saíam com o mesmo título e nenhum dizia de onde.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const portal = await buscarPortal(slug);
  if (!portal) return { title: "Portal não encontrado" };
  const cidade = `${portal.municipio} (${portal.estado})`;
  return compartilhamento({
    titulo: `Portal do Cidadão de ${cidade}`,
    descricao: `Portal do cidadão de ${cidade}: protocolo com chave de consulta, ouvidoria, obras e para onde vai o dinheiro da prefeitura. Sem cadastro.`,
    caminho: `/transparencia/${slug}`,
  });
}

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
