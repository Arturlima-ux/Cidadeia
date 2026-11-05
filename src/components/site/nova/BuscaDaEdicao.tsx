"use client";

import AcheSuaCidade from "@/components/morador/AcheSuaCidade";
import { escolherCidade } from "@/lib/edicao";

// A busca do topo da landing nova: em vez de navegar, entrega a cidade para a
// edição de hoje (EdicaoDeHoje.tsx), que busca os números, marca a sede no
// mapa e rola até a edição.
export default function BuscaDaEdicao({ idCampo = "cidade-da-edicao" }: { idCampo?: string }) {
  return (
    <AcheSuaCidade
      compacto
      localNoCampo
      idCampo={idCampo}
      rolarAoTopo={false}
      placeholder="Digite o nome do município"
      aoEscolher={(c) => {
        escolherCidade(c);
        window.setTimeout(() => {
          const alvo = document.getElementById("edicao");
          const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          alvo?.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });
        }, 120);
      }}
    />
  );
}
