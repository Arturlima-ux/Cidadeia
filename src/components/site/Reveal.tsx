"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Direcao = "up" | "left" | "right" | "none";

const DESLOCAMENTO: Record<Direcao, string> = {
  up: "translateY(28px)",
  left: "translateX(-28px)",
  right: "translateX(28px)",
  none: "translateY(0)",
};

// ── OBSERVADOR ÚNICO ──
//
// Cada Reveal criava o próprio IntersectionObserver. A home tem 29 deles, o
// que significava 29 observadores instanciados no carregamento — trabalho que
// o navegador faz antes de a página ficar utilizável, e que aparece justamente
// na máquina fraca de um balcão de prefeitura.
//
// Um observador só, compartilhado, com um registro de callbacks. O navegador
// agrupa as verificações de interseção num único ciclo.

type Callback = () => void;

let observador: IntersectionObserver | null = null;
const inscritos = new Map<Element, Callback>();

function obterObservador(): IntersectionObserver {
  if (observador) return observador;

  observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        const callback = inscritos.get(entrada.target);
        if (callback) {
          callback();
          // Revelar é irreversível: uma vez visto, o elemento não volta a
          // esconder. Deixar de observar libera o trabalho para sempre.
          inscritos.delete(entrada.target);
          observador?.unobserve(entrada.target);
        }
      }
    },
    { rootMargin: "0px 0px -10% 0px" }
  );

  return observador;
}

// ── O ESTADO ESCONDIDO SAIU DAQUI ──
//
// Este componente aplicava `opacity: 0` no estilo do próprio elemento, então o
// HTML servido já saía com o conteúdo invisível — quarenta blocos assim na
// home. Quem não executa JavaScript recebia uma página em branco: buscador,
// pré-visualização de link em mensageiro, leitor de texto.
//
// Agora quem esconde é o CSS, e só quando a classe `.com-js` existe no
// documento — ela é posta por um script no <head> (ver app/layout.tsx). Sem
// script a regra não se aplica e o conteúdo aparece; com script a animação é a
// mesma de antes, e começa antes da primeira pintura, sem piscar.
//
// O atributo `data-visivel` é o interruptor: ausente, o CSS esconde; presente,
// o elemento volta ao normal e a transição roda.

export default function Reveal({
  children,
  delay = 0,
  direcao = "up",
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  direcao?: Direcao;
  className?: string;
  as?: React.ElementType;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisivel(true);
      return;
    }

    inscritos.set(el, () => setVisivel(true));
    obterObservador().observe(el);

    return () => {
      inscritos.delete(el);
      observador?.unobserve(el);
    };
  }, []);

  return (
    <Tag
      ref={ref}
      className={`revelar ${className}`}
      data-visivel={visivel ? "1" : undefined}
      style={
        {
          "--revelar-deslocamento": DESLOCAMENTO[direcao],
          transitionDelay: visivel ? `${delay}ms` : "0ms",
        } as React.CSSProperties
      }
    >
      {children}
    </Tag>
  );
}
