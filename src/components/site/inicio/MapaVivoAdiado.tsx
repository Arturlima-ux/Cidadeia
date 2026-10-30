"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// ── O MAPA CHEGA DEPOIS DA PÁGINA ──
//
// O mapa é fundo: nenhum texto depende dele. Mesmo assim o código dele e as
// 5.571 sedes (34 kB de lib/mapa-municipios.ts) iam no pacote do topo e eram
// lidos antes de a página responder ao toque. Agora o pacote só é pedido
// depois do evento load, com o navegador livre; até lá a caixa (posicionada
// em absoluto, em globals.css .inicio-mapa) fica vazia e nada se mexe.
const MapaVivo = dynamic(() => import("./MapaVivo"), { ssr: false });

export default function MapaVivoAdiado(props: { destaque?: number | null; className?: string; intenso?: boolean }) {
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const janela = window as Window & {
      requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let espera: number | null = null;
    const liberar = () => {
      espera = janela.requestIdleCallback
        ? janela.requestIdleCallback(() => setPronto(true), { timeout: 1500 })
        : window.setTimeout(() => setPronto(true), 400);
    };
    if (document.readyState === "complete") liberar();
    else window.addEventListener("load", liberar, { once: true });
    return () => {
      window.removeEventListener("load", liberar);
      if (espera !== null) {
        if (janela.cancelIdleCallback) janela.cancelIdleCallback(espera);
        else window.clearTimeout(espera);
      }
    };
  }, []);

  return pronto ? <MapaVivo {...props} /> : null;
}
