"use client";

import { useEffect, useRef } from "react";

// ── A GRADE QUE O MOUSE REVELA ──
//
// Duas camadas de pontos atrás do topo: a de base, quase invisível, e uma no
// roxo claro que só aparece num círculo em volta do mouse (globals.css,
// .grade-pontos-revela). O ouvinte fica no topo inteiro (o pai), mas a
// posição é escrita na própria camada da máscara: variável no pai faria o
// navegador recalcular o estilo de tudo que está dentro dele.
//
// Só com mouse fino. No toque não há cursor para seguir, e com movimento
// reduzido a camada nem liga.

export default function RevelarNoMouse() {
  const camada = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = camada.current;
    const area = el?.parentElement;
    if (!el || !area) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let quadro = 0;
    let x = 0;
    let y = 0;
    const pintar = () => {
      quadro = 0;
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
    };
    const mover = (e: PointerEvent) => {
      const r = area.getBoundingClientRect();
      x = e.clientX - r.left;
      y = e.clientY - r.top;
      if (!quadro) quadro = requestAnimationFrame(pintar);
      el.dataset.ativo = "";
    };
    const sair = () => {
      delete el.dataset.ativo;
    };
    area.addEventListener("pointermove", mover, { passive: true });
    area.addEventListener("pointerleave", sair);
    return () => {
      area.removeEventListener("pointermove", mover);
      area.removeEventListener("pointerleave", sair);
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, []);

  return (
    <>
      <div className="grade-pontos" aria-hidden />
      <div ref={camada} className="grade-pontos-revela" aria-hidden />
    </>
  );
}
