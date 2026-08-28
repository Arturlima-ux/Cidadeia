"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./PainelExecutivo.module.css";

export type AlertaExecutivo = {
  status: "sugere" | "aguardando" | "aprovado";
  secretaria: string;
  texto: string;
};

const LABEL_STATUS: Record<AlertaExecutivo["status"], string> = {
  sugere: "IA sugere",
  aguardando: "Aguardando aprovação",
  aprovado: "Aprovado",
};

export type MetricaPainel = {
  label: string;
  valor: string;
  sentimento?: "up" | "down" | "neutro";
};

function corGauge(v: number): string {
  if (v >= 75) return "#3fce8a";
  if (v >= 45) return "#f0aa3e";
  return "#e8637a";
}

function GaugeEscuro({ valor, tamanho = 88 }: { valor: number; tamanho?: number }) {
  const alvo = Math.max(0, Math.min(100, valor));
  const [animado, setAnimado] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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

  const raio = (tamanho - 14) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const preenchido = (animado / 100) * circunferencia;
  const cor = corGauge(alvo);

  return (
    <div ref={ref} style={{ width: tamanho, height: tamanho, position: "relative" }}>
      <svg width={tamanho} height={tamanho} className="-rotate-90">
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={8}
        />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke={cor}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia - preenchido}
          style={{ transition: "stroke 0.4s ease" }}
        />
      </svg>
      <svg
        width={tamanho}
        height={tamanho}
        style={{ position: "absolute", inset: 0 }}
        aria-hidden
      >
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={tamanho * 0.24}
          className={styles.gaugeVal}
        >
          {Math.round(animado)}%
        </text>
      </svg>
    </div>
  );
}

export default function PainelExecutivo({
  nomePrefeitura,
  metricas,
  eficienciaPct,
  eficienciaLabel = "Eficiência",
  alerta,
}: {
  nomePrefeitura: string;
  metricas: [MetricaPainel, MetricaPainel, MetricaPainel];
  eficienciaPct: number;
  eficienciaLabel?: string;
  alerta?: AlertaExecutivo;
}) {
  const corSentimento = (s?: MetricaPainel["sentimento"]) =>
    s === "up" ? styles.up : s === "down" ? styles.down : "";

  return (
    <div className={styles.frame}>
      <div className={styles.frameTop}>
        <span className={styles.frameDot} />
        <span className={styles.frameDot} />
        <span className={styles.frameDot} />
        <span className={styles.frameUrl}>app.cidadeia.com.br/dashboard</span>
      </div>

      <div className={styles.frameBody}>
        <div className={styles.frameToprow}>
          <h3>{nomePrefeitura}</h3>
          <span>Atualizado agora</span>
        </div>

        <div className={styles.dashGrid}>
          {metricas.map((m) => (
            <div key={m.label} className={styles.dashTile}>
              <div className={styles.tl}>{m.label}</div>
              <div className={`${styles.tv} ${corSentimento(m.sentimento)}`}>{m.valor}</div>
            </div>
          ))}

          <div className={`${styles.dashTile} ${styles.gaugeTile}`}>
            <GaugeEscuro valor={eficienciaPct} />
            <div className={styles.tl}>{eficienciaLabel}</div>
          </div>

          {alerta && (
            <div className={`${styles.dashTile} ${styles.alertTile}`}>
              <div>
                <span className={`${styles.alertStatus} ${styles[alerta.status]}`}>
                  {LABEL_STATUS[alerta.status]}
                </span>
                <span className={styles.alertText}>{alerta.texto}</span>
              </div>
              <span className={`${styles.tl} ${styles.alertSecretaria}`}>{alerta.secretaria}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
