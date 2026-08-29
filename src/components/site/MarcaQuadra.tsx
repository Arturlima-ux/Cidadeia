import type { SVGProps } from "react";

// ── MARCA "QUADRA" ──
// Quadras da cidade vistas de cima formando um C aberto: barra superior,
// coluna esquerda e barra inferior; o vão da direita é a abertura. Tudo cai
// numa grade de 120 com rua de 7 — é essa regularidade que faz o C fechar.
// O bloco verde é o único que muda de cor: é o "IA".

type Props = SVGProps<SVGSVGElement> & {
  /** Cor dos blocos de cidade. */
  cor?: string;
  /** Cor do bloco "IA". */
  corAcento?: string;
  /**
   * Abaixo de ~40px as ruas viram sujeira de meio pixel, então a marca troca
   * para três blocos. Deixe `true` em favicon, avatar e barra de topo.
   */
  compacta?: boolean;
};

export default function MarcaQuadra({
  cor = "var(--brand)",
  corAcento = "var(--accent)",
  compacta = false,
  ...props
}: Props) {
  return (
    <svg viewBox="0 0 120 120" fill="none" aria-hidden="true" {...props}>
      {compacta ? (
        <>
          <rect x="0" y="0" width="120" height="34" rx="6" fill={cor} />
          <rect x="0" y="41" width="41" height="79" rx="6" fill={cor} />
          <rect x="48" y="86" width="72" height="34" rx="6" fill={corAcento} />
        </>
      ) : (
        <>
          <rect x="0" y="0" width="72" height="34" rx="6" fill={cor} />
          <rect x="79" y="0" width="41" height="34" rx="6" fill={cor} opacity="0.4" />
          <rect x="0" y="41" width="41" height="38" rx="6" fill={cor} />
          <rect x="0" y="86" width="41" height="34" rx="6" fill={cor} opacity="0.68" />
          <rect x="48" y="86" width="72" height="34" rx="6" fill={corAcento} />
        </>
      )}
    </svg>
  );
}

/** Marca + palavra, do jeito que aparece no cabeçalho e no rodapé. */
export function MarcaCompleta({
  tamanho = 30,
  cor = "var(--brand)",
  corAcento = "var(--accent)",
  corTexto = "var(--foreground)",
  compacta = true,
}: {
  tamanho?: number;
  cor?: string;
  corAcento?: string;
  corTexto?: string;
  compacta?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <MarcaQuadra
        width={tamanho}
        height={tamanho}
        cor={cor}
        corAcento={corAcento}
        compacta={compacta}
      />
      <span
        className="font-serif font-extrabold tracking-[-0.045em] leading-none"
        style={{ fontSize: tamanho * 0.72, color: corTexto }}
      >
        cidade<span style={{ color: corAcento }}>ia</span>
      </span>
    </span>
  );
}
