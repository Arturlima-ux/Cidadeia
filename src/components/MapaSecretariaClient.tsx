"use client";

import dynamic from "next/dynamic";
import type { PontoMapa } from "./MapaSecretaria";

const MapaSecretaria = dynamic(() => import("./MapaSecretaria"), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-xl border border-border flex items-center justify-center text-sm text-muted"
      style={{ height: 340 }}
    >
      Carregando mapa...
    </div>
  ),
});

export default function MapaSecretariaClient(props: {
  pontos: PontoMapa[];
  corDestaque?: string;
}) {
  return <MapaSecretaria {...props} />;
}
