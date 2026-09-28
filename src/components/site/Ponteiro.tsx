"use client";

import { useRef, type ReactNode, type PointerEvent } from "react";

// ── O QUE RESPONDE AO PONTEIRO ──
//
// Dois efeitos, um arquivo, porque compartilham a mesma disciplina:
// escrevem variáveis CSS e deixam o navegador compor. Nenhum dos dois
// chama setState — re-renderizar React a cada movimento do mouse é o
// caminho mais rápido para a página engasgar.
//
// ── POR QUE NADA DISSO APARECE NO CELULAR ──
// Ponteiro fino é mouse. No toque, `pointerType` é "touch" e os eventos
// são ignorados: um cartão que inclina ao encostar o dedo parece defeito,
// e o "hover" no toque fica grudado depois do toque.
//
// Sem JavaScript, as variáveis ficam no valor inicial (zero) e os
// elementos são cartões e botões normais. O CSS está em globals.css.

/** Acima disto vira brinquedo e atrapalha o clique. */
const INCLINACAO_MAXIMA = 7;
const IMA_MAXIMO = 5;

export function Inclinavel({
  children,
  className = "",
  intensidade = INCLINACAO_MAXIMA,
}: {
  children: ReactNode;
  className?: string;
  intensidade?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const mover = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // -0.5 a 0.5 em cada eixo, a partir do centro do elemento.
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.dataset.seguindo = "1";
    // O eixo X gira ao contrário: mouse embaixo inclina o topo para trás.
    el.style.setProperty("--rx", `${(-y * intensidade).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * intensidade).toFixed(2)}deg`);
  };

  const sair = () => {
    const el = ref.current;
    if (!el) return;
    // Tirar o atributo devolve a transição: o cartão volta suave.
    delete el.dataset.seguindo;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <div ref={ref} className={`inclinavel ${className}`} onPointerMove={mover} onPointerLeave={sair}>
      {children}
    </div>
  );
}

export function Magnetico({
  children,
  className = "",
  forca = IMA_MAXIMO,
}: {
  children: ReactNode;
  className?: string;
  forca?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  const mover = (e: PointerEvent<HTMLSpanElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    el.dataset.seguindo = "1";
    el.style.setProperty("--mx", `${(x * forca).toFixed(2)}px`);
    el.style.setProperty("--my", `${(y * forca).toFixed(2)}px`);
  };

  const sair = () => {
    const el = ref.current;
    if (!el) return;
    delete el.dataset.seguindo;
    el.style.setProperty("--mx", "0px");
    el.style.setProperty("--my", "0px");
  };

  return (
    <span
      ref={ref}
      className={`magnetico inline-block ${className}`}
      onPointerMove={mover}
      onPointerLeave={sair}
    >
      {children}
    </span>
  );
}
