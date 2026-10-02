"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// ── O NÚMERO QUE CONTA ──
//
// Um número grande parado é lido como enfeite. O mesmo número subindo
// prende o olho por um segundo, e é nesse segundo que ele é lido de fato.
//
// ── TRÊS COISAS QUE QUASE TODO CONTADOR ERRA ──
//
// 1. Começa em zero no HTML. Quem não executa JavaScript — buscador,
//    pré-visualização de link, leitor de tela em modo simples — recebe
//    "0 municípios". Aqui o HTML já sai com o valor FINAL, e o JavaScript
//    só o rebaixa para animar depois que assume o controle.
//
// 2. Anima com setInterval. O intervalo não conhece a taxa de quadros do
//    monitor; em tela de 120 Hz a contagem fica travada. Aqui é
//    requestAnimationFrame, que é a taxa real.
//
// 3. Usa easing linear. A contagem fica mecânica. A curva aqui desacelera
//    no fim — o número "chega" em vez de parar de repente.

/** Desacelera no fim: rápido no começo, assentando nos últimos décimos. */
const suavizar = (t: number) => 1 - Math.pow(1 - t, 4);

const DURACAO_MS = 1400;

export default function Contador({
  ate,
  decimais = 0,
  prefixo = "",
  sufixo = "",
  className = "",
}: {
  ate: number;
  decimais?: number;
  prefixo?: string;
  sufixo?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  // Nasce no valor final, não em zero: é ele que vai para o HTML servido.
  const [valor, setValor] = useState(ate);

  // ── O SALTO PARA TRÁS QUE NINGUÉM VIA, E TODO MUNDO SENTIA ──
  //
  // O HTML sai com o valor final — e tem de sair, senão quem não executa
  // JavaScript recebe "0 municípios". Mas o primeiro quadro da animação
  // escrevia zero, e o número aparecia CERTO e dava um salto para trás antes
  // de subir. Em contador acima da dobra o salto era imediato; abaixo, ele
  // acontecia bem na hora em que o número entrava no campo de visão.
  //
  // `useLayoutEffect` roda depois da hidratação e ANTES da pintura: o zero
  // entra sem nunca chegar à tela. O efeito abaixo, que espera o elemento
  // aparecer, continua sendo quem dispara a contagem.
  //
  // Sem JavaScript ou com movimento reduzido, nada disto executa e o valor
  // final permanece — que é o comportamento correto nos dois casos.
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setValor(0);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let quadro = 0;
    let comecou = false;

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting || comecou) continue;
          comecou = true;
          observador.disconnect();

          const inicio = performance.now();
          const passo = (agora: number) => {
            const t = Math.min(1, (agora - inicio) / DURACAO_MS);
            setValor(ate * suavizar(t));
            if (t < 1) quadro = requestAnimationFrame(passo);
          };
          quadro = requestAnimationFrame(passo);
        }
      },
      { rootMargin: "0px 0px -15% 0px" }
    );

    observador.observe(el);
    return () => {
      observador.disconnect();
      cancelAnimationFrame(quadro);
    };
  }, [ate]);

  const texto = valor.toLocaleString("pt-BR", {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  });

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {/* O número muda muitas vezes por segundo. Sem isto, o leitor de tela
          anunciaria cada passo da contagem — ruído puro. Ele lê o valor
          final, que é o que o HTML já traz. */}
      <span aria-hidden="true">
        {prefixo}
        {texto}
        {sufixo}
      </span>
      <span className="sr-only">
        {prefixo}
        {ate.toLocaleString("pt-BR", { minimumFractionDigits: decimais, maximumFractionDigits: decimais })}
        {sufixo}
      </span>
    </span>
  );
}
