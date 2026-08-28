export type Prioridade = "urgente" | "medio" | "info";

/**
 * Fonte única de verdade da linguagem visual de prioridade — usada em
 * Alertas, Central Inteligente, sugestões da IA e cards do dashboard.
 * Antes cada tela redefinia suas próprias cores e rótulos, o que fazia
 * o mesmo alerta parecer diferente dependendo de onde aparecia.
 */
export const PRIORIDADE = {
  urgente: {
    label: "Urgente",
    cor: "var(--urgente)",
    fundo: "var(--urgente-tint)",
    borda: "var(--urgente-borda)",
  },
  medio: {
    label: "Médio",
    cor: "var(--medio)",
    fundo: "var(--medio-tint)",
    borda: "var(--medio-borda)",
  },
  info: {
    label: "Informação",
    cor: "var(--info)",
    fundo: "var(--info-tint)",
    borda: "var(--info-borda)",
  },
} as const satisfies Record<Prioridade, { label: string; cor: string; fundo: string; borda: string }>;

export function estiloPrioridade(p: string) {
  return PRIORIDADE[p as Prioridade] ?? PRIORIDADE.info;
}

export default function BadgePrioridade({
  prioridade,
  className = "",
}: {
  prioridade: string;
  className?: string;
}) {
  const e = estiloPrioridade(prioridade);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold border rounded-full px-2.5 py-0.5 shrink-0 ${className}`}
      style={{ color: e.cor, background: e.fundo, borderColor: e.borda }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: e.cor }} />
      {e.label}
    </span>
  );
}
