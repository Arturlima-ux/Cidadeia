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
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );

  return observador;
}

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
      className={className}
      style={{
        opacity: visivel ? 1 : 0,
        transform: visivel ? "translate(0, 0)" : DESLOCAMENTO[direcao],
        transition:
          "opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
        transitionDelay: visivel ? `${delay}ms` : "0ms",
        // `will-change` promove o elemento a uma camada de composição PRÓPRIA e
        // o mantém lá enquanto a propriedade existir. Antes ficava fixo em
        // "opacity, transform" — 29 camadas permanentes só na home, consumindo
        // memória de vídeo e trabalho de composição muito depois de a animação
        // ter acabado. Agora só vale antes de revelar, que é quando serve.
        willChange: visivel ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </Tag>
  );
}
