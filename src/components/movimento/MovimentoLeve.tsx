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
// ── NA HOME, SÓ QUANDO A PESSOA SE MEXE ──
// Na home estática nada da primeira tela usa o motor: a régua da LRF só
// aparece com município escolhido, e o que anima (mesa de módulos, portal de
// exemplo) está abaixo da dobra. Lá o pacote só é pedido no primeiro gesto
// (rolar, tocar, teclar) depois do load, ou oito segundos depois dele. Medido no Lighthouse da home: era
// avaliado logo depois do load em tarefas de 110 a 140 ms, sem que nada na
// tela precisasse dele. Nas outras páginas, carrega como antes.
function quandoSeMexer(): Promise<void> {
  return new Promise((pronto) => {
    const gestos = ["scroll", "pointerdown", "keydown", "touchstart", "wheel"] as const;
    let espera = 0;
    const ir = () => {
      for (const g of gestos) window.removeEventListener(g, ir, true);
      window.clearTimeout(espera);
      pronto();
    };
    const ouvir = () => {
      for (const g of gestos) window.addEventListener(g, ir, { capture: true, passive: true, once: true });
      // Rede de segurança: quem chega por um link para o meio da página
      // (#proposta) e não mexe em nada também vê o que anima, oito segundos
      // depois do load, quando a página já está quieta.
      espera = window.setTimeout(ir, 8000);
    };
    if (document.readyState === "complete") ouvir();
    else window.addEventListener("load", ouvir, { once: true });
  });
}

const carregar = () =>
  (window.location.pathname === "/" && !window.location.search.includes("m=") ? quandoSeMexer() : Promise.resolve())
    .then(() => import("./recursos"))
    .then((r) => r.default);

export default function MovimentoLeve({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={carregar} strict>
      {children}
    </LazyMotion>
  );
}
