"use client";

import dynamic from "next/dynamic";
import type { PontoCidade } from "./MapaCidade";

/**
 * Leaflet toca em `window` na importação, então o mapa não pode ser
 * renderizado no servidor. O mesmo motivo do MapaSecretariaClient.
 */
const MapaCidade = dynamic(() => import("./MapaCidade"), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-xl border border-border flex items-center justify-center text-sm text-muted"
      style={{ height: 460 }}
    >
      Carregando mapa…
    </div>
  ),
});

export default function MapaCidadeClient({ pontos }: { pontos: PontoCidade[] }) {
  return <MapaCidade pontos={pontos} />;
}
