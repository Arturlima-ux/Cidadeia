"use client";

import { useEffect, useRef, useState } from "react";

function corPorValor(v: number) {
  if (v >= 75) return "var(--info)";
  if (v >= 45) return "var(--medio)";
  return "var(--urgente)";
}

export default function GaugeEficiencia({
  valor,
  label,
  sublabel,
  tamanho = 148,
}: {
  valor: number;
  label: string;
  sublabel?: string;
  tamanho?: number;
}) {
  const alvo = Math.max(0, Math.min(100, valor));
  const [animado, setAnimado] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduzido) {
      setAnimado(alvo);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const duracao = 1100;
        const inicio = performance.now();
        function passo(agora: number) {
          const t = Math.min(1, (agora - inicio) / duracao);
          const facil = 1 - Math.pow(1 - t, 3);
          setAnimado(alvo * facil);
          if (t < 1) requestAnimationFrame(passo);
        }
        requestAnimationFrame(passo);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [alvo]);

  const raio = (tamanho - 20) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const preenchido = (animado / 100) * circunferencia;
  const cor = corPorValor(alvo);

  return (
    <div ref={ref} className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: tamanho, height: tamanho }}>
        <svg width={tamanho} height={tamanho} className="-rotate-90">
          <circle
            cx={tamanho / 2}
            cy={tamanho / 2}
            r={raio}
            fill="none"
            stroke="var(--sutil)"
            strokeWidth={12}
          />
          <circle
            cx={tamanho / 2}
            cy={tamanho / 2}
            r={raio}
            fill="none"
            stroke={cor}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={circunferencia}
            strokeDashoffset={circunferencia - preenchido}
            style={{ transition: "stroke 0.4s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif text-2xl font-bold tabular-nums">
            {Math.round(animado)}%
          </span>
        </div>
      </div>
      <div>
        <p className="font-semibold text-sm">{label}</p>
        {sublabel && <p className="text-xs text-muted mt-1 leading-relaxed max-w-[16rem]">{sublabel}</p>}
      </div>
    </div>
  );
}
