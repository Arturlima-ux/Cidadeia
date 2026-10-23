"use client";

import { useEffect } from "react";

// A home estática não grava nada no servidor ao abrir (app/api/visita).
// Depois do load, com o navegador livre, um aviso de poucos bytes conta a
// visita e leva junto de onde a pessoa veio. Não espera resposta e não
// atrasa nada: sendBeacon segue mesmo se a pessoa fechar a aba.
export default function ContarVisita() {
  useEffect(() => {
    let feito = false;
    const avisar = () => {
      if (feito) return;
      feito = true;
      const corpo = JSON.stringify({ origem: document.referrer || "" });
      try {
        const blob = new Blob([corpo], { type: "application/json" });
        if (navigator.sendBeacon?.("/api/visita", blob)) return;
      } catch {
        // sem sendBeacon: cai no fetch abaixo
      }
      fetch("/api/visita", { method: "POST", body: corpo, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
    };
    const ocioso = (window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const agendar = () => (ocioso ? ocioso(avisar, { timeout: 3000 }) : window.setTimeout(avisar, 1500));
    if (document.readyState === "complete") agendar();
    else window.addEventListener("load", agendar, { once: true });
    return () => window.removeEventListener("load", agendar);
  }, []);
  return null;
}
