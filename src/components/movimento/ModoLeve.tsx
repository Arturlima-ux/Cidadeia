"use client";

import { useEffect } from "react";
import { ATRIBUTO_LEVE, CHAVE_LEVE, EVENTO_LEVE, emModoLeve, quadrosLentos } from "@/lib/modo-leve";

// ── O COMPUTADOR ESTÁ SOFRENDO? MEDE E DECIDE ──
//
// O <head> já liga o modo leve pelo hardware (poucos núcleos ou pouca
// memória). Mas há computador com bons núcleos e sem aceleração de vídeo,
// e aí tudo que se mexe é desenhado pela CPU. Então mede 2 segundos de
// quadros duas vezes (parado, 4 s depois do carregamento, e na primeira
// rolagem): se 12% deles passam de 34 ms, fora das tarefas longas do
// próprio carregamento, liga o modo leve e guarda a escolha (localStorage),
// para a próxima visita já abrir leve.
//
// Não mede com a aba escondida (o navegador segura os quadros) nem quando
// alguém já escolheu ("?leve=0" guarda "0" e desliga a medição).

type Tarefa = { inicio: number; fim: number };

export default function ModoLeve() {
  useEffect(() => {
    if (emModoLeve()) return;
    let guardado: string | null = null;
    try {
      guardado = localStorage.getItem(CHAVE_LEVE);
    } catch {}
    if (guardado === "0") return;

    let quadro = 0;
    let espera = 0;
    let observador: PerformanceObserver | null = null;
    const tarefas: Tarefa[] = [];
    try {
      observador = new PerformanceObserver((l) => {
        for (const e of l.getEntries()) tarefas.push({ inicio: e.startTime, fim: e.startTime + e.duration });
      });
      observador.observe({ type: "longtask", buffered: true });
    } catch {}

    // Uma medição de 2 s: devolve se os quadros foram lentos. Para no meio
    // se a aba for escondida.
    const medir = () =>
      new Promise<boolean>((decidir) => {
        if (document.visibilityState !== "visible") return decidir(false);
        const intervalos: number[] = [];
        let anterior = 0;
        const comeco = performance.now();
        const passo = (t: number) => {
          if (document.visibilityState !== "visible") return decidir(false);
          if (anterior) {
            const caiuNumaTarefa = tarefas.some((x) => x.fim > anterior && x.inicio < t);
            if (!caiuNumaTarefa) intervalos.push(t - anterior);
          }
          anterior = t;
          if (t - comeco < 2000) {
            quadro = requestAnimationFrame(passo);
            return;
          }
          decidir(quadrosLentos(intervalos));
        };
        quadro = requestAnimationFrame(passo);
      });

    let medindo = false;
    let feitas = 0;
    const ligar = () => {
      document.documentElement.setAttribute(ATRIBUTO_LEVE, "");
      try {
        localStorage.setItem(CHAVE_LEVE, "1");
      } catch {}
      window.dispatchEvent(new Event(EVENTO_LEVE));
      encerrar();
    };
    // Duas chances: a página parada, 4 s depois do carregamento, e os
    // primeiros 2 s da primeira rolagem, que é onde o computador fraco
    // mais sofre (cada seção nova é desenhada pela primeira vez).
    const tentar = async () => {
      if (medindo || emModoLeve()) return;
      medindo = true;
      const lento = await medir();
      medindo = false;
      feitas += 1;
      if (lento) ligar();
      else if (feitas >= 2) encerrar();
    };
    const aoRolar = () => {
      window.removeEventListener("scroll", aoRolar);
      void tentar();
    };
    const encerrar = () => {
      observador?.disconnect();
      window.removeEventListener("scroll", aoRolar);
    };
    const comecar = () => {
      espera = window.setTimeout(() => void tentar(), 4000);
      window.addEventListener("scroll", aoRolar, { passive: true });
    };
    if (document.readyState === "complete") comecar();
    else window.addEventListener("load", comecar, { once: true });
    return () => {
      window.clearTimeout(espera);
      cancelAnimationFrame(quadro);
      encerrar();
      window.removeEventListener("load", comecar);
    };
  }, []);
  return null;
}
