"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Direcao = "up" | "left" | "right" | "none";

const DESLOCAMENTO: Record<Direcao, string> = {
  up: "translateY(28px)",
  left: "translateX(-28px)",
  right: "translateX(28px)",
  none: "translateY(0)",
};

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

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisivel(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: visivel ? 1 : 0,
        transform: visivel ? "translate(0, 0)" : DESLOCAMENTO[direcao],
        transition: "opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
        transitionDelay: visivel ? `${delay}ms` : "0ms",
        willChange: "opacity, transform",
      }}
    >
      {children}
    </Tag>
  );
}
