"use client";

import { useEffect } from "react";

// ── A BARRA APARECE ENQUANTO SE ROLA ──
//
// Só com CSS a barra de uma área interna aparece no hover. Falta o outro
// gesto: rolar com a roda do mouse sem o ponteiro sobre ela, ou com o
// teclado. Aqui a área que rolou ganha a classe "rolando" por um
// segundo — é o que faz a barra surgir e sumir sozinha, como nos
// aplicativos de mensagem.
//
// Um ouvinte só, na fase de captura, para todas as áreas da página.
// Nada de observar elementos um a um.

export default function BarraDeRolagem() {
  useEffect(() => {
    const relogios = new WeakMap<Element, number>();
    function aoRolar(e: Event) {
      const alvo = e.target;
      if (!(alvo instanceof Element) || !alvo.classList.contains("rolagem-discreta")) return;
      alvo.classList.add("rolando");
      const anterior = relogios.get(alvo);
      if (anterior) window.clearTimeout(anterior);
      relogios.set(
        alvo,
        window.setTimeout(() => alvo.classList.remove("rolando"), 900)
      );
    }
    document.addEventListener("scroll", aoRolar, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", aoRolar, { capture: true });
  }, []);
  return null;
}
