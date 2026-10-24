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
  // O arco se desenha quando o medidor entra na tela. A curva fica no CSS
  // (transição de saída, nada de laço de requestAnimationFrame com setState),
  // e quem pede movimento reduzido vê o arco pronto, sem transição.
  const [visivel, setVisivel] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setVisivel(true);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const raio = (tamanho - 20) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const preenchido = visivel ? (alvo / 100) * circunferencia : 0;
  const cor = corPorValor(alvo);

  return (
    <div ref={ref} className="flex items-center gap-4">
      {/* O número é sempre o valor real; só o arco se desenha. Antes o texto
          contava de 0 até o valor quando o medidor entrava na tela — quem
          lia com leitor de tela, imprimia ou não rolava até ele via "0%". */}
      <div
        className="relative shrink-0"
        style={{ width: tamanho, height: tamanho }}
        role="img"
        aria-label={`${label}: ${Math.round(alvo)}%`}
      >
        <svg width={tamanho} height={tamanho} className="-rotate-90" aria-hidden="true">
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
            className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-[1100ms] motion-safe:ease-[cubic-bezier(0.33,1,0.68,1)]"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums tracking-[-0.02em]" aria-hidden="true">
            {Math.round(alvo)}%
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
