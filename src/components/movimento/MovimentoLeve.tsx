"use client";

import { useSyncExternalStore } from "react";
import { LazyMotion, MotionConfig } from "motion/react";
import { EVENTO_LEVE, emModoLeve } from "@/lib/modo-leve";
import ModoLeve from "./ModoLeve";

// ── ANIMAÇÃO SEM PESAR NO PRIMEIRO CARREGAMENTO ──
//
// Medido com o Lighthouse num celular simulado: a biblioteca de animação
// inteira ia junto com a home e o portal, antes de qualquer coisa aparecer.
// Com o LazyMotion, os componentes usam a versão enxuta (`m.div` em vez de
// `motion.div`) e o motor chega num pacote à parte, depois que a página já
// está na tela. `strict` faz um `motion.div` esquecido dar erro em vez de
// trazer a biblioteca inteira de volta sem ninguém perceber.

//
// ── NA HOME, DEPOIS DE CARREGAR, QUANDO O NAVEGADOR ESTÁ OCIOSO ──
// Na home estática nada da primeira tela usa o motor: o que anima (mesa de
// módulos, portal de exemplo) está abaixo da dobra. Medido no Lighthouse:
// avaliar o pacote logo depois do load custava tarefas de 110 a 140 ms.
// Antes ele era pedido no primeiro gesto (rolar, tocar, teclar), e por isso
// essas tarefas caíam justo no começo da primeira rolagem, que travava no
// computador fraco (revisão de outubro de 2026). Agora vem 2,5 s depois do
// load, quando o navegador estiver ocioso.
function quandoOcioso(): Promise<void> {
  return new Promise((pronto) => {
    const janela = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const ir = () =>
      window.setTimeout(() => {
        if (janela.requestIdleCallback) janela.requestIdleCallback(() => pronto(), { timeout: 4000 });
        else pronto();
      }, 2500);
    if (document.readyState === "complete") ir();
    else window.addEventListener("load", ir, { once: true });
  });
}

const carregar = () =>
  (window.location.pathname === "/" && !window.location.search.includes("m=") ? quandoOcioso() : Promise.resolve())
    .then(() => import("./recursos"))
    .then((r) => r.default);

// No modo leve (computador fraco, ver lib/modo-leve.ts), o motor não move
// nada: "always" faz cada animação ir direto ao estado final.
const assinarLeve = (aviso: () => void) => {
  window.addEventListener(EVENTO_LEVE, aviso);
  return () => window.removeEventListener(EVENTO_LEVE, aviso);
};

export default function MovimentoLeve({ children }: { children: React.ReactNode }) {
  const leve = useSyncExternalStore(assinarLeve, emModoLeve, () => false);
  return (
    <LazyMotion features={carregar} strict>
      <MotionConfig reducedMotion={leve ? "always" : "user"}>{children}</MotionConfig>
      <ModoLeve />
    </LazyMotion>
  );
}
