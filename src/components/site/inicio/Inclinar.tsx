"use client";

import { useEffect, useRef } from "react";

// ── O CARTÃO QUE INCLINA COM O MOUSE ──
//
// Até `graus` de inclinação, na direção do mouse, e um brilho que segue o
// ponteiro por cima (.inclinar-luz). O transform é escrito direto no
// elemento, uma vez por quadro; ao sair, a transição de 500 ms do CSS traz
// o cartão de volta ao plano, partindo de onde ele estava.
//
// Só com mouse fino e sem movimento reduzido: no toque, um "hover" falso
// deixaria o cartão torto depois do toque.

export default function Inclinar({
  graus = 6,
  className = "",
  children,
}: {
  graus?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let quadro = 0;
    let px = 0.5;
    let py = 0.5;
    const pintar = () => {
      quadro = 0;
      el.style.transform = `perspective(1000px) rotateX(${((0.5 - py) * graus).toFixed(2)}deg) rotateY(${((px - 0.5) * graus).toFixed(2)}deg)`;
      el.style.setProperty("--lx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--ly", `${(py * 100).toFixed(1)}%`);
    };
    const mover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      el.dataset.movendo = "";
      if (!quadro) quadro = requestAnimationFrame(pintar);
    };
    const sair = () => {
      if (quadro) cancelAnimationFrame(quadro);
      quadro = 0;
      delete el.dataset.movendo;
      el.style.transform = "";
    };
    el.addEventListener("pointermove", mover, { passive: true });
    el.addEventListener("pointerleave", sair);
    return () => {
      el.removeEventListener("pointermove", mover);
      el.removeEventListener("pointerleave", sair);
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, [graus]);

  return (
    <div ref={caixa} className={`inclinar relative ${className}`}>
      {children}
      <span className="inclinar-luz" aria-hidden />
    </div>
  );
}
