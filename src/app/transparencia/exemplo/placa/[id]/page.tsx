import { notFound } from "next/navigation";
import PlacaObraParada from "@/components/portal/PlacaObraParada";
import { instante, obrasParadasDoExemplo } from "@/lib/portal-exemplo";

// A placa na cidade fictícia de exemplo (Bela Aurora), para o prefeito ver
// antes de contratar. Mesmo componente da placa de verdade.

export const metadata = { title: "Aviso público de obra paralisada · cidade de exemplo", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PlacaDeExemplo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const obra = obrasParadasDoExemplo(instante()).find((o) => o.id === id && o.aviso === "completo");
  if (!obra) notFound();
  const base = (process.env.APP_URL ?? "https://cidadeia.vercel.app").replace(/\/$/, "");
  return <PlacaObraParada exemplo obra={obra} municipio="Bela Aurora" estado="BR" endereco={`${base}/transparencia/exemplo#obras`} />;
}
