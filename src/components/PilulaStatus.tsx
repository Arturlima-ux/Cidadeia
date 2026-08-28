export type TomStatus = "neutro" | "andamento" | "positivo" | "atencao" | "negativo";

const TONS: Record<TomStatus, { cor: string; fundo: string }> = {
  neutro: { cor: "var(--muted)", fundo: "rgba(0,0,0,0.05)" },
  andamento: { cor: "var(--brand)", fundo: "var(--brand-tint)" },
  positivo: { cor: "var(--info)", fundo: "var(--info-tint)" },
  atencao: { cor: "var(--medio)", fundo: "var(--medio-tint)" },
  negativo: { cor: "var(--urgente)", fundo: "var(--urgente-tint)" },
};

/**
 * Pílula de status de processo (obra, licitação). Obras e Licitações tinham
 * cada uma seu próprio mapa de cores cruas do Tailwind — o mesmo conceito
 * ("concluído", "cancelado") aparecia com tom diferente em cada tela.
 */
export default function PilulaStatus({
  label,
  tom,
  className = "",
}: {
  label: string;
  tom: TomStatus;
  className?: string;
}) {
  const t = TONS[tom];
  return (
    <span
      className={`text-xs font-semibold rounded-full px-2.5 py-1 whitespace-nowrap ${className}`}
      style={{ color: t.cor, background: t.fundo }}
    >
      {label}
    </span>
  );
}
