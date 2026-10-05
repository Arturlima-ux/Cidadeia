/**
 * Rótulo curto acima de um título de seção ("olho", no jargão editorial).
 *
 * Era monoespaçado, em caixa alta e espaçado, com um traço antes: o carimbo
 * de página feita em série. No redesenho de outubro virou texto comum, em
 * tom de apoio, como na home. Diz onde a pessoa está sem gritar.
 */
export default function Olho({ children, centrado }: { children: React.ReactNode; centrado?: boolean }) {
  return (
    <span
      className={`inline-flex items-center text-sm font-medium ${centrado ? "justify-center" : ""}`}
      style={{ color: "var(--brand-claro)" }}
    >
      {children}
    </span>
  );
}
