"use client";

import { useEffect, useState } from "react";
import { semMovimento } from "@/lib/modo-leve";

// ── AS PERGUNTAS QUE TROCAM NO TOPO ──
//
// Duas perguntas por vez, uma à esquerda e outra à direita, que trocam a
// cada 2,8 s: cada par é um problema de prefeitura que um módulo resolve.
// O servidor manda o primeiro par, que é o que fica para quem tem movimento
// reduzido, modo leve ou JavaScript desligado. A troca é só de opacidade.
// O texto que o leitor de tela e o buscador leem está no h1 (page.tsx), e
// este bloco é decorativo (aria-hidden).

export const PERGUNTAS: [string, string][] = [
  ["Prazo vencendo?", "Obra parada?"],
  ["Folha no limite?", "Pedido sem resposta?"],
  ["RGF atrasado?", "Estoque acabando?"],
  ["Ano letivo curto?", "Compra sem plano?"],
];

const INTERVALO = 2800;
const TROCA = 260;

export default function PerguntasQueTrocam() {
  const [i, setI] = useState(0);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    if (semMovimento()) return;
    let troca = 0;
    const t = window.setInterval(() => {
      if (document.hidden) return;
      setSaindo(true);
      troca = window.setTimeout(() => {
        setI((x) => (x + 1) % PERGUNTAS.length);
        setSaindo(false);
      }, TROCA);
    }, INTERVALO);
    return () => {
      window.clearInterval(t);
      window.clearTimeout(troca);
    };
  }, []);

  const [a, b] = PERGUNTAS[i];
  return (
    <span aria-hidden className="perguntas" data-saindo={saindo ? "" : undefined}>
      <span className="perguntas-a">{a}</span>
      <span className="perguntas-b">{b}</span>
    </span>
  );
}
