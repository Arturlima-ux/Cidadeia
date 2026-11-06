"use client";

import { useEffect, useState } from "react";

// ── AS PERGUNTAS QUE TROCAM NO TOPO ──
//
// Uma pergunta e a resposta do CidadeIA, que trocam a cada 2,8 s. Até
// nov/2026 eram duas perguntas de dor ("Prazo vencendo? Obra parada?");
// o fundador pediu frases que façam o prefeito olhar o produto, então a
// segunda linha virou o que o sistema entrega. Cada resposta tem lastro:
// os avisos de prazo e de limite (lib/vigia-fiscal-alertas.ts), o ofício
// montado (PASSOS) e o protocolo do portal do cidadão.
// O servidor manda o primeiro par, que é o que fica sem JavaScript. A troca
// roda em qualquer computador: no modo leve ela chegou a parar, e no
// notebook do fundador o título ficava parado no primeiro par (nov/2026).
// Trocar duas palavras a cada 2,8 s não pesa. Com movimento reduzido pedido
// no sistema, a troca continua, só pela opacidade, sem deslizar (globals.css).
// O texto que o leitor de tela e o buscador leem está no h1 (page.tsx), e
// este bloco é decorativo (aria-hidden).

export const PERGUNTAS: [string, string][] = [
  ["Prazo da LRF?", "Avisado antes."],
  ["Obra parada?", "Você sabe primeiro."],
  ["Folha no limite?", "Aviso antes do alerta."],
  ["Ofício urgente?", "Sai pronto."],
  ["Morador esperando?", "Protocolo na hora."],
];

const INTERVALO = 2800;
const TROCA = 260;

export default function PerguntasQueTrocam() {
  const [i, setI] = useState(0);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
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
