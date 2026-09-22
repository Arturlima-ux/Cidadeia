"use client";

import { useEffect } from "react";

// ── A BARRA DE ROLAGEM É NOSSA, NÃO DO NAVEGADOR ──
//
// A barra nativa é outra em cada navegador: o Chrome aceita desenho fino
// e arredondado (::-webkit-scrollbar), o Firefox só aceita "fina" e pinta
// um filete claro do jeito dele. O resultado era um menu bonito num
// navegador e um traço grosso no outro.
//
// Aqui a barra nativa é escondida (pelo CSS, só quando há JavaScript) e
// desenhada por cima: um filete arredondado, que aparece ao rolar ou com
// o ponteiro por perto, some sozinho depois de um segundo e pode ser
// arrastado. Mesmo desenho em qualquer navegador.
//
// ── POR QUE FIXED, E NÃO DENTRO DO ELEMENTO ──
// Inserir um filho em cada área rolável quebraria layouts que contam os
// próprios filhos (grid, flex, `:first-child`). A barra vive no fim do
// body, posicionada pela posição da área na tela — nada muda de lugar.

const LARGURA = 6;
const MARGEM = 3;
const MIN_ALTURA = 28;
const SOME_APOS = 900;

type Alvo = { el: Element | Window; barra: HTMLDivElement; relogio: number | null };

function metricas(el: Element | Window) {
  if (el instanceof Window) {
    const alturaVisivel = window.innerHeight;
    return {
      topo: 0,
      direita: 0,
      alturaVisivel,
      alturaTotal: document.documentElement.scrollHeight,
      posicao: window.scrollY,
    };
  }
  const r = el.getBoundingClientRect();
  return { topo: r.top, direita: window.innerWidth - r.right, alturaVisivel: el.clientHeight, alturaTotal: el.scrollHeight, posicao: el.scrollTop };
}

export default function BarraDeRolagem() {
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return; // celular já tem barra invisível
    const alvos = new Map<Element | Window, Alvo>();

    function criarBarra(): HTMLDivElement {
      const b = document.createElement("div");
      b.setAttribute("aria-hidden", "true");
      b.className = "barra-rolagem-desenhada";
      document.body.appendChild(b);
      return b;
    }

    function atualizar(a: Alvo) {
      const m = metricas(a.el);
      const proporcao = m.alturaVisivel / m.alturaTotal;
      if (proporcao >= 0.999 || m.alturaTotal <= 0) {
        a.barra.style.display = "none";
        return;
      }
      const altura = Math.max(MIN_ALTURA, m.alturaVisivel * proporcao);
      const curso = m.alturaVisivel - altura;
      const andado = m.posicao / (m.alturaTotal - m.alturaVisivel);
      a.barra.style.display = "block";
      a.barra.style.height = `${altura}px`;
      a.barra.style.width = `${LARGURA}px`;
      a.barra.style.top = `${m.topo + curso * Math.min(1, Math.max(0, andado))}px`;
      a.barra.style.right = `${m.direita + MARGEM}px`;
    }

    function mostrar(a: Alvo) {
      atualizar(a);
      a.barra.classList.add("visivel");
      if (a.relogio) window.clearTimeout(a.relogio);
      a.relogio = window.setTimeout(() => a.barra.classList.remove("visivel"), SOME_APOS);
    }

    function registrar(el: Element | Window) {
      if (alvos.has(el)) return;
      const a: Alvo = { el, barra: criarBarra(), relogio: null };
      alvos.set(el, a);
      atualizar(a);
      // arrastar o filete move a área
      a.barra.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        const inicioY = e.clientY;
        const m0 = metricas(el);
        const inicioPos = m0.posicao;
        const curso = m0.alturaVisivel - Math.max(MIN_ALTURA, m0.alturaVisivel * (m0.alturaVisivel / m0.alturaTotal));
        a.barra.setPointerCapture(e.pointerId);
        a.barra.classList.add("visivel", "arrastando");
        const mover = (ev: PointerEvent) => {
          const proporcaoMovida = (ev.clientY - inicioY) / (curso || 1);
          const destino = inicioPos + proporcaoMovida * (m0.alturaTotal - m0.alturaVisivel);
          if (el instanceof Window) window.scrollTo({ top: destino });
          else el.scrollTop = destino;
        };
        const soltar = () => {
          a.barra.classList.remove("arrastando");
          a.barra.removeEventListener("pointermove", mover);
          a.barra.removeEventListener("pointerup", soltar);
          mostrar(a);
        };
        a.barra.addEventListener("pointermove", mover);
        a.barra.addEventListener("pointerup", soltar);
      });
    }

    registrar(window);
    document.querySelectorAll(".rolagem-discreta").forEach(registrar);

    const aoRolar = (e: Event) => {
      const alvo = e.target === document || e.target === document.documentElement ? window : (e.target as Element);
      const a = alvos.get(alvo);
      if (a) mostrar(a);
    };
    const aoMover = (e: PointerEvent) => {
      for (const a of alvos.values()) {
        if (a.el instanceof Window) continue;
        const r = (a.el as Element).getBoundingClientRect();
        const perto = e.clientX > r.right - 40 && e.clientX < r.right + 12 && e.clientY > r.top && e.clientY < r.bottom;
        if (perto) mostrar(a);
      }
      // perto da borda direita da janela: barra da página
      const daPagina = alvos.get(window);
      if (daPagina && e.clientX > window.innerWidth - 40) mostrar(daPagina);
    };
    const aoRedimensionar = () => alvos.forEach(atualizar);

    document.addEventListener("scroll", aoRolar, { capture: true, passive: true });
    document.addEventListener("pointermove", aoMover, { passive: true });
    window.addEventListener("resize", aoRedimensionar, { passive: true });

    // Áreas que aparecem depois (tabela que abre, conversa que carrega).
    const observador = new MutationObserver(() => {
      document.querySelectorAll(".rolagem-discreta").forEach(registrar);
      for (const [el, a] of alvos) {
        if (el !== window && !document.contains(el as Element)) {
          a.barra.remove();
          alvos.delete(el);
        }
      }
      alvos.forEach(atualizar);
    });
    observador.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("scroll", aoRolar, { capture: true });
      document.removeEventListener("pointermove", aoMover);
      window.removeEventListener("resize", aoRedimensionar);
      observador.disconnect();
      alvos.forEach((a) => {
        if (a.relogio) window.clearTimeout(a.relogio);
        a.barra.remove();
      });
      alvos.clear();
    };
  }, []);

  return null;
}
