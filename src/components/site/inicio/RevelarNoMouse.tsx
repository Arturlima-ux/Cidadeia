"use client";

import { useEffect, useRef } from "react";
import { semMovimento } from "@/lib/modo-leve";

// ── A GRADE QUE O MOUSE REVELA ──
//
// Duas camadas de pontos atrás do topo: a de base, quase invisível, e um
// círculo de 480 px com a grade no roxo claro, que acompanha o mouse
// (globals.css, .grade-lente). O ouvinte fica no topo inteiro (o pai).
//
// ── SEM REDESENHAR A TELA (revisão de outubro de 2026) ──
// Antes, a grade clara cobria o topo inteiro e uma máscara com --mx/--my
// recortava o círculo. Cada movimento do mouse mudava a máscara, e o
// navegador redesenhava a camada do tamanho do topo, a cada quadro. Medido
// com a CPU 4x mais lenta: 14 quadros por segundo com o mouse andando. Agora
// o círculo é uma camada pequena que só se desloca (transform), e a grade de
// dentro anda o contrário, módulo 28 px, para os pontos continuarem no mesmo
// lugar da grade de base. Nada é redesenhado: só o compositor trabalha.
//
// Só com mouse fino. No toque não há cursor para seguir, e com movimento
// reduzido ou no modo leve (lib/modo-leve.ts) a camada nem liga.

/** Raio do círculo e passo da grade: os mesmos de .grade-lente no CSS. */
const RAIO = 240;
const PASSO = 28;

export default function RevelarNoMouse() {
  const lente = useRef<HTMLDivElement>(null);
  const grade = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = lente.current;
    const dentro = grade.current;
    // A lente fica dentro de um recorte do tamanho do topo (sem ele, o
    // círculo passaria da borda e criaria rolagem lateral); o ouvinte fica no
    // topo, o pai do recorte.
    const area = el?.parentElement?.parentElement;
    if (!el || !dentro || !area) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (semMovimento()) return;

    let quadro = 0;
    let cx = 0;
    let cy = 0;
    const pintar = () => {
      quadro = 0;
      const r = area.getBoundingClientRect();
      const x = cx - r.left - RAIO;
      const y = cy - r.top - RAIO;
      const resto = (v: number) => ((v % PASSO) + PASSO) % PASSO;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      dentro.style.transform = `translate3d(${-resto(x)}px, ${-resto(y)}px, 0)`;
    };
    const mover = (e: PointerEvent) => {
      cx = e.clientX;
      cy = e.clientY;
      if (!quadro) quadro = requestAnimationFrame(pintar);
      if (!("ativo" in el.dataset)) el.dataset.ativo = "";
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
      <div className="grade-recorte" aria-hidden>
        <div ref={lente} className="grade-lente">
          <div ref={grade} className="grade-pontos-revela" />
        </div>
      </div>
    </>
  );
}
