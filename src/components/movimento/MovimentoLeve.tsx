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

//
// ── NA HOME, DEPOIS DO LOAD ──
// Na home estática nada acima da dobra usa o motor: a régua da LRF só
// aparece com município escolhido, e o resto da página liga quando a pessoa
// chega perto (HidratarAoChegar). Lá o pacote espera o evento load e o
// navegador livre, para não disputar a linha principal com a primeira
// pintura e a hidratação do topo. Nas outras páginas, carrega como antes.
function quandoLivre(): Promise<void> {
  return new Promise((pronto) => {
    const janela = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
    const agendar = () =>
      janela.requestIdleCallback ? janela.requestIdleCallback(() => pronto(), { timeout: 2000 }) : window.setTimeout(pronto, 300);
    if (document.readyState === "complete") agendar();
    else window.addEventListener("load", agendar, { once: true });
  });
}

const carregar = () =>
  (window.location.pathname === "/" && !window.location.search.includes("m=") ? quandoLivre() : Promise.resolve())
    .then(() => import("./recursos"))
    .then((r) => r.default);

export default function MovimentoLeve({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={carregar} strict>
      {children}
    </LazyMotion>
  );
}
