import { notFound } from "next/navigation";
import { buscarPortal } from "../../../actions";
import { carregarPortal } from "@/lib/portal-servidor";
import { modoDoPortal } from "@/lib/endereco-publico";
import PlacaObraParada from "@/components/portal/PlacaObraParada";

// A placa de cada obra parada (art. 115, § 6º, Lei 14.133/2021). Sai da mesma
// leitura do portal: se a obra voltou a andar, a placa deixa de existir.

export const metadata = { title: "Aviso público de obra paralisada", robots: { index: false } };

export default async function PlacaDaObra({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const portal = await buscarPortal(slug);
  if (!portal || modoDoPortal(portal.planosContratados) === "minimo") notFound();
  const { obrasParadas } = await carregarPortal(portal);
  const obra = obrasParadas.find((o) => o.id === id);
  if (!obra) notFound();
  const base = (process.env.APP_URL ?? "https://cidadeia.vercel.app").replace(/\/$/, "");
  return <PlacaObraParada obra={obra} municipio={portal.municipio} estado={portal.estado} endereco={`${base}/transparencia/${slug}#obras`} />;
}
