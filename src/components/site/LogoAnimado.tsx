"use client";

import { useState } from "react";
import Link from "next/link";

// ── O LOGO QUE SE MONTA ──
//
// Ao tocar (ou passar o mouse), as três quadras da marca se afastam e se
// encaixam de volta, e o "ia" acende: é a cidade se montando, a ideia do
// produto em meio segundo. Pedido do fundador a partir do site da Cimed, em
// que o logo responde ao toque.
//
// O toque reinicia a animação (a chave muda), então ela roda a cada toque e
// não só na primeira vez. Quem pediu menos movimento no sistema não vê nada
// se mexer (globals.css, .logo-anima).
//
// O nome aparece em todas as larguras: no celular o menu fica na grade
// abaixo da linha do logo, e sobra espaço para ele.

export default function LogoAnimado({ tamanho = 30 }: { tamanho?: number }) {
  const [vez, setVez] = useState(0);
  return (
    <Link
      href="/"
      aria-label="CidadeIA — início"
      onClick={() => setVez((v) => v + 1)}
      className="logo-anima group inline-flex min-h-11 items-center gap-2.5 shrink-0"
    >
      <svg key={vez} viewBox="0 0 120 120" width={tamanho} height={tamanho} fill="none" aria-hidden="true" className={vez ? "logo-tocado" : undefined}>
        <rect className="logo-q1" x="0" y="0" width="120" height="34" rx="6" fill="var(--brand)" />
        <rect className="logo-q2" x="0" y="41" width="41" height="79" rx="6" fill="var(--brand)" />
        <rect className="logo-q3" x="48" y="86" width="72" height="34" rx="6" fill="var(--accent)" />
      </svg>
      <span
        className="inline font-serif font-semibold tracking-[-0.045em] leading-none"
        style={{ fontSize: tamanho * 0.72, color: "var(--foreground)" }}
      >
        cidade
        <span key={vez} className={`logo-ia ${vez ? "logo-tocado" : ""}`} style={{ color: "var(--accent)" }}>
          ia
        </span>
      </span>
    </Link>
  );
}
