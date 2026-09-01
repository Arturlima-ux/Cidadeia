"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MarcaCompleta } from "@/components/site/MarcaQuadra";

/**
 * A chamada para ação volta à tela depois que o herói sai.
 *
 * O critério é comportamental: quem rolou uma tela inteira já demonstrou
 * interesse, e é aí que faz sentido reaparecer. Antes disso a barra só
 * roubaria espaço da primeira impressão.
 *
 * No topo em telas largas, no rodapé no celular — onde o polegar alcança.
 */
export default function BarraConversao() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    let pendente = false;

    function medir() {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(() => {
        pendente = false;
        setVisivel(window.scrollY > window.innerHeight * 0.7);
      });
    }

    window.addEventListener("scroll", medir, { passive: true });
    medir();
    return () => window.removeEventListener("scroll", medir);
  }, []);

  return (
    <>
      {/* topo — telas largas */}
      <div
        className={`hidden sm:block fixed top-0 inset-x-0 z-40 border-b transition-transform duration-300 ${
          visivel ? "translate-y-0 border-border" : "-translate-y-full border-transparent"
        }`}
        style={{
          background: "color-mix(in srgb, var(--background) 84%, transparent)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-[62px] flex items-center justify-between gap-4">
          <Link href="/" aria-label="CidadeIA — início">
            <MarcaCompleta tamanho={24} />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/kit"
              className="hidden md:inline text-sm font-semibold text-muted hover:text-foreground transition"
            >
              Kit de contratação
            </Link>
            <Link
              href="#proposta"
              className="text-sm font-bold text-white bg-brand hover:bg-brand-dark rounded-xl px-5 py-2.5 transition shadow-elevated"
            >
              Ver quanto custa
            </Link>
          </div>
        </div>
      </div>

      {/* rodapé — celular */}
      <div
        className={`sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border px-4 py-3 flex items-center gap-3 transition-transform duration-300 ${
          visivel ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          background: "color-mix(in srgb, var(--background) 92%, transparent)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        <span className="text-xs text-muted leading-tight flex-1">
          Cabe na dispensa? Veja em 30 segundos.
        </span>
        <Link
          href="#proposta"
          className="shrink-0 text-sm font-bold text-white bg-brand rounded-xl px-4 py-2.5"
        >
          Ver o valor
        </Link>
      </div>
    </>
  );
}
