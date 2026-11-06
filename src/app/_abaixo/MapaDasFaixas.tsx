"use client";

import { useEffect, useRef } from "react";
import { decodificarPontos, MAPA_ALTURA, MAPA_LARGURA } from "@/lib/mapa-municipios";

// O Brasil em pontos, um por município, pintado pela faixa da despesa com
// pessoal no último RGF (dados.ts, faixasDoMapa). Desenhado uma vez, parado.
// Canvas não lê variável CSS: as cores saem dos tokens por getComputedStyle.
export default function MapaDasFaixas({ faixas, rotulo }: { faixas: string; rotulo: string }) {
  const tela = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = tela.current;
    if (!c) return;
    const desenhar = () => {
      const w = c.clientWidth;
      if (!w) return;
      const h = (w * MAPA_ALTURA) / MAPA_LARGURA;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const estilo = getComputedStyle(c);
      const escuro = estilo.getPropertyValue("--sobre-forte").trim() || "black";
      const claro = estilo.getPropertyValue("--foreground").trim() || "white";
      const esc = (w / MAPA_LARGURA) * dpr;
      const r = Math.max(1.3, w / 380) * dpr;
      const p = decodificarPontos();
      ctx.clearRect(0, 0, c.width, c.height);
      // Do mais calmo ao mais grave: os acima do limite ficam por cima.
      for (const camada of ["-", "0", "1", "2", "3"]) {
        ctx.fillStyle = camada === "3" ? claro : escuro;
        ctx.globalAlpha = camada === "-" ? 0.16 : camada === "0" ? 0.42 : camada === "1" ? 0.72 : camada === "2" ? 0.95 : 1;
        for (let i = 0; i < faixas.length; i++) {
          if (faixas[i] !== camada) continue;
          ctx.beginPath();
          ctx.arc(p[i * 2] * esc, p[i * 2 + 1] * esc, camada === "3" ? r * 1.15 : r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };
    desenhar();
    const ro = new ResizeObserver(desenhar);
    ro.observe(c);
    return () => ro.disconnect();
  }, [faixas]);

  return <canvas ref={tela} role="img" aria-label={rotulo} style={{ width: "100%", aspectRatio: `${MAPA_LARGURA} / ${MAPA_ALTURA}`, display: "block" }} />;
}
