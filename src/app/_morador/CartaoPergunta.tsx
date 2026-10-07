// A moldura de cada pergunta que a home do morador responde.
export default function CartaoPergunta({
  numero,
  titulo,
  fonte,
  ausencia,
  children,
}: {
  numero: number;
  titulo: string;
  fonte?: string;
  ausencia?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <article className="rounded-[28px] border border-border p-6 sm:p-8 flex flex-col" style={{ background: "var(--card)" }}>
      <p className="flex items-center gap-3 text-sm font-medium text-muted">
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold tabular-nums"
          style={{ background: "var(--brand-tint)", color: "var(--brand-claro)" }}
        >
          {numero}
        </span>
        {titulo}
      </p>
      <div className="mt-5 flex-1">
        {children ?? <p className="text-lg leading-relaxed">{ausencia}</p>}
      </div>
      {fonte && <p className="text-xs text-muted mt-6 pt-4 border-t border-border">Fonte: {fonte}</p>}
    </article>
  );
}

export function EsqueletoPergunta({ numero, titulo }: { numero: number; titulo: string }) {
  return (
    <CartaoPergunta numero={numero} titulo={titulo}>
      <div className="space-y-3 animate-pulse" aria-label="Consultando o Tesouro Nacional">
        <div className="h-7 rounded-lg w-11/12" style={{ background: "var(--sutil)" }} />
        <div className="h-7 rounded-lg w-8/12" style={{ background: "var(--sutil)" }} />
        <div className="h-4 rounded-lg w-7/12 mt-5" style={{ background: "var(--sutil)" }} />
      </div>
      <p className="text-sm text-muted mt-5">Perguntando ao Tesouro Nacional…</p>
    </CartaoPergunta>
  );
}
