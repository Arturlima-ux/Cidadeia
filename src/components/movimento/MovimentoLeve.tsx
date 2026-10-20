"use client";

import { LazyMotion } from "motion/react";

// ── ANIMAÇÃO SEM PESAR NO PRIMEIRO CARREGAMENTO ──
//
// Medido com o Lighthouse num celular simulado: a biblioteca de animação
// inteira ia junto com a home e o portal, antes de qualquer coisa aparecer.
// Com o LazyMotion, os componentes usam a versão enxuta (`m.div` em vez de
// `motion.div`) e o motor chega num pacote à parte, depois que a página já
// está na tela. `strict` faz um `motion.div` esquecido dar erro em vez de
// trazer a biblioteca inteira de volta sem ninguém perceber.

const carregar = () => import("./recursos").then((r) => r.default);

export default function MovimentoLeve({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={carregar} strict>
      {children}
    </LazyMotion>
  );
}
