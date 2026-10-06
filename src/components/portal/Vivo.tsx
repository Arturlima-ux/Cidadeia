"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";

// ── O QUE SE MEXE NO PORTAL ──
//
// Quatro peças pequenas, todas disparadas quando entram na tela, uma vez só:
// o bloco que surge, o número que conta, a barra que enche e o anel que
// fecha. Com "reduzir movimento", aparecem prontas.

const SAIDA = [0.22, 1, 0.36, 1] as const;

export function Surgir({ children, atraso = 0, className = "" }: { children: React.ReactNode; atraso?: number; className?: string }) {
  const reduzir = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduzir ? false : { opacity: 0, y: 28, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, delay: atraso, ease: SAIDA }}
    >
      {children}
    </motion.div>
  );
}

function formatar(v: number, formato: "inteiro" | "decimal" | "moeda") {
  if (formato === "moeda") return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  if (formato === "decimal") return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return Math.round(v).toLocaleString("pt-BR");
}

export function Contador({ valor, formato = "inteiro", duracao = 1.6, className = "" }: { valor: number; formato?: "inteiro" | "decimal" | "moeda"; duracao?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visto = useInView(ref, { once: true, margin: "-40px" });
  const reduzir = useReducedMotion();
  const [atual, setAtual] = useState(reduzir ? valor : 0);
  useEffect(() => {
    if (!visto || reduzir) return;
    const c = animate(0, valor, { duration: duracao, ease: SAIDA, onUpdate: setAtual });
    return () => c.stop();
  }, [visto, reduzir, valor, duracao]);
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {formatar(reduzir ? valor : atual, formato)}
    </span>
  );
}

export function Barra({ pct, cor, atraso = 0, altura = 12 }: { pct: number; cor: string; atraso?: number; altura?: number }) {
  const reduzir = useReducedMotion();
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: altura, background: "var(--sutil)" }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: cor, boxShadow: `0 0 18px -2px ${cor}` }}
        initial={reduzir ? false : { width: "0%" }}
        whileInView={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, delay: atraso, ease: SAIDA }}
      />
    </div>
  );
}

export function Anel({ pct, cor, tamanho = 76, atraso = 0, children }: { pct: number | null; cor: string; tamanho?: number; atraso?: number; children?: React.ReactNode }) {
  const reduzir = useReducedMotion();
  const r = tamanho / 2 - 5;
  const c = 2 * Math.PI * r;
  const alvo = pct === null ? c : c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <div className="relative shrink-0" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} className="-rotate-90">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="var(--sutil)" strokeWidth={5} />
        {pct !== null && (
          <motion.circle
            cx={tamanho / 2}
            cy={tamanho / 2}
            r={r}
            fill="none"
            stroke={cor}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={reduzir ? false : { strokeDashoffset: c }}
            whileInView={{ strokeDashoffset: alvo }}
            viewport={{ once: true }}
            transition={{ duration: 1.6, delay: atraso, ease: SAIDA }}
            style={{ filter: `drop-shadow(0 0 6px ${cor})` }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
