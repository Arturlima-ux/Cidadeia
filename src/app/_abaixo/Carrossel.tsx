"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// ── O CARROSSEL DOS MÓDULOS (nov/2026) ──
// Pedido do fundador a partir da vitrine da Apple Store ("As novidades. Veja
// o que acabou de chegar."): cartões altos lado a lado, uns escuros e uns
// claros, que correm de lado com o dedo, a roda do mouse ou as setas. A
// faixa começa alinhada à coluna do site e sangra até a borda direita.
// Sem script, a faixa continua rolando de lado normalmente.
export default function Carrossel({ titulo, children, rotulo }: { titulo: ReactNode; children: ReactNode; rotulo: string }) {
  const trilho = useRef<HTMLDivElement>(null);
  const [inicio, setInicio] = useState(true);
  const [fim, setFim] = useState(false);

  useEffect(() => {
    const t = trilho.current;
    if (!t) return;
    const medir = () => {
      setInicio(t.scrollLeft < 8);
      setFim(t.scrollLeft + t.clientWidth > t.scrollWidth - 8);
    };
    medir();
    t.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir);
    return () => {
      t.removeEventListener("scroll", medir);
      window.removeEventListener("resize", medir);
    };
  }, []);

  const andar = (lado: 1 | -1) => {
    const t = trilho.current;
    if (!t) return;
    const cartao = t.querySelector<HTMLElement>(".car-cartao");
    const passo = cartao ? cartao.offsetWidth + 20 : t.clientWidth * 0.8;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    t.scrollBy({ left: lado * passo, behavior: suave ? "smooth" : "auto" });
  };

  return (
    <div className="car">
      <div className="car-cab">{titulo}</div>
      <div ref={trilho} className="car-trilho" role="region" aria-label={rotulo} tabIndex={0}>
        {children}
      </div>
      <div className="car-setas">
        <button type="button" onClick={() => andar(-1)} disabled={inicio} aria-label="Módulo anterior">‹</button>
        <button type="button" onClick={() => andar(1)} disabled={fim} aria-label="Próximo módulo">›</button>
      </div>
    </div>
  );
}
