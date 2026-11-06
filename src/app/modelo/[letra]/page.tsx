import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LandingPage from "../../page";

// ── AS TRÊS ESTRUTURAS DA HOME, PARA O FUNDADOR ESCOLHER (nov/2026) ──
// A home inteira, com o topo de sempre, e do fim do mapa para baixo uma das
// três estruturas de app/_abaixo. Só existe na prévia: em produção, 404.

export const metadata: Metadata = { robots: { index: false, follow: false }, title: "Estrutura em teste" };

export function generateStaticParams() {
  return [{ letra: "a" }, { letra: "b" }, { letra: "c" }];
}

export default async function Modelo({ params }: { params: Promise<{ letra: string }> }) {
  const { letra } = await params;
  if (process.env.VERCEL_ENV === "production") notFound();
  if (letra !== "a" && letra !== "b" && letra !== "c") notFound();
  return <LandingPage estrutura={letra} />;
}
