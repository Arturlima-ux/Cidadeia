import { AVISO_EXEMPLO, MUNICIPIO_EXEMPLO } from "@/lib/exemplos-conformidade";

/**
 * Moldura que marca conteúdo inventado.
 *
 * Precisa sobreviver a uma captura de tela: alguém vai fotografar a tela e
 * mandar no grupo, e o aviso tem que ir junto no mesmo retângulo. Por isso é
 * moldura tracejada em volta, e não uma linha de texto acima que o
 * enquadramento corta — que é como esse tipo de aviso costuma falhar.
 */
export default function FaixaExemplo({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="rounded-2xl border-2 border-dashed p-4 sm:p-5"
      style={{ borderColor: "var(--medio-borda)", background: "var(--medio-tint)" }}
      aria-label={`Exemplo com dados do município fictício ${MUNICIPIO_EXEMPLO}`}
    >
      <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--medio)" }}>
        <strong className="uppercase tracking-wide">Exemplo</strong> — {AVISO_EXEMPLO}
      </p>
      {children}
    </section>
  );
}
