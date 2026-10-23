"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * A chamada para ação volta à tela depois que o herói sai.
 *
 * O critério é comportamental: quem rolou uma tela inteira já demonstrou
 * interesse, e é aí que faz sentido reaparecer. Antes disso a barra só
 * roubaria espaço da primeira impressão.
 *
 * Só no celular, no rodapé, onde o polegar alcança.
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
      {/* A barra do topo, nas telas largas, saiu (revisão de outubro de
          2026): ela cobria o cabeçalho com outro menu e repetia o "Receber
          proposta" que o cabeçalho, sticky, já mostra o tempo todo. Ficou a
          do rodapé no celular, onde o polegar alcança. */}
      {/* rodapé — celular */}
      <div
        className={`sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border px-4 py-3 flex items-center gap-3 transition-transform duration-300 ${
          visivel ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ background: "var(--background)" }}
      >
        <span className="text-xs text-muted leading-tight flex-1">
          Proposta com valor, kit e base legal — no mesmo e-mail.
        </span>
        {/* "Falar" era o resto de quando o botão do desktop dizia "Falar com
            especialista". Sozinho ele promete conversa, que é justamente o que
            a página diz não ser necessário. Mesmo destino, mesma palavra dos
            outros dois. */}
        <Link
          href="/proposta"
          className="shrink-0 text-sm font-bold text-white bg-brand rounded-xl px-4 py-2.5"
        >
          Proposta
        </Link>
      </div>
    </>
  );
}
