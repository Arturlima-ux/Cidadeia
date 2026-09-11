/** Rótulo curto acima de um título de seção — "olho", no jargão editorial. */
export default function Olho({ children, centrado }: { children: React.ReactNode; centrado?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 text-xs font-mono uppercase tracking-[0.16em] ${
        centrado ? "justify-center" : ""
      }`}
      style={{ color: "var(--brand-claro)" }}
    >
      <span className="block w-6 h-px" style={{ background: "currentColor" }} />
      {children}
    </span>
  );
}
