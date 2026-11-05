"use client";

import { useEffect } from "react";
import { CHAVE_ROLAR } from "@/components/morador/AcheSuaCidade";

// Os números da cidade chegam do servidor abaixo do mapa, fora da tela de
// quem escolheu a cidade na busca do topo. Quando chegam, este marcador rola
// até eles, mas só se a escolha veio da busca (AcheSuaCidade grava o pedido);
// quem abre /?m=… direto ou recarrega a página fica onde está.
export default function RolarParaAqui({ id }: { id: string }) {
  useEffect(() => {
    let pedido: string | null = null;
    try {
      pedido = sessionStorage.getItem(CHAVE_ROLAR);
      if (pedido === id) sessionStorage.removeItem(CHAVE_ROLAR);
    } catch {
      return;
    }
    if (pedido !== id) return;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });
  }, [id]);
  return null;
}
