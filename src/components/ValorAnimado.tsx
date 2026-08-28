"use client";

import { useEffect, useRef, useState } from "react";

function formatar(valor: number, tipo: "moeda" | "percentual" | "numero", sufixo?: string): string {
  if (tipo === "moeda") {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  if (tipo === "percentual") {
    return `${valor.toFixed(valor % 1 === 0 ? 0 : 1)}%`;
  }
  const arredondado = Math.round(valor);
  return sufixo ? `${arredondado.toLocaleString("pt-BR")}${sufixo}` : arredondado.toLocaleString("pt-BR");
}

/**
 * Número que "cresce" até o valor real ao entrar na tela — em vez de já
 * aparecer pronto. Anima só a partir do valor anterior renderizado (então
 * uma atualização de R$1.000 pra R$1.200 cresce só a diferença, não zera).
 * Respeita prefers-reduced-motion.
 */
export default function ValorAnimado({
  valor,
  tipo,
  sufixo,
  duracaoMs = 900,
  className,
}: {
  valor: number;
  tipo: "moeda" | "percentual" | "numero";
  sufixo?: string;
  duracaoMs?: number;
  className?: string;
}) {
  const [exibido, setExibido] = useState(0);
  const valorAnterior = useRef(0);
  const primeiraRenderizacao = useRef(true);

  useEffect(() => {
    const prefereReduzido =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefereReduzido) {
      setExibido(valor);
      valorAnterior.current = valor;
      primeiraRenderizacao.current = false;
      return;
    }

    const de = primeiraRenderizacao.current ? 0 : valorAnterior.current;
    const inicio = performance.now();
    let quadro: number;

    function passo(agora: number) {
      const progresso = Math.min((agora - inicio) / duracaoMs, 1);
      // ease-out cúbico — desacelera suave no fim, mesma linguagem de motion do resto do app.
      const suavizado = 1 - Math.pow(1 - progresso, 3);
      setExibido(de + (valor - de) * suavizado);
      if (progresso < 1) {
        quadro = requestAnimationFrame(passo);
      } else {
        valorAnterior.current = valor;
        primeiraRenderizacao.current = false;
      }
    }

    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, duracaoMs]);

  return <span className={className}>{formatar(exibido, tipo, sufixo)}</span>;
}
