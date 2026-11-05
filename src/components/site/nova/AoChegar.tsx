"use client";

import { useEffect } from "react";
import { EVENTO_EDICAO, lerCidadeDaEdicao, type CidadeDaEdicao } from "@/lib/edicao";

// Duas coisas pequenas da landing nova, num componente só para não pesar:
//
// 1. A entrada das seções. Cada [data-surge] que ainda está fora da tela
//    ganha data-antes (desce e some um pouco) e o perde ao entrar, uma vez só.
//    O que já está na tela nunca é escondido, e sem JavaScript nada some.
// 2. O porte da cidade na tabela de preços: a coluna do porte dela acende
//    (data-porte na tabela), lido do navegador ou avisado pela edição.
export default function AoChegar() {
  useEffect(() => {
    const tabela = document.querySelector<HTMLElement>("[data-tabela-precos]");
    const marcar = (c: CidadeDaEdicao | null) => {
      if (tabela && c?.porte) tabela.dataset.porte = c.porte;
    };
    marcar(lerCidadeDaEdicao());
    const aoEdicao = (e: Event) => marcar((e as CustomEvent<CidadeDaEdicao>).detail);
    window.addEventListener(EVENTO_EDICAO, aoEdicao);

    let obs: IntersectionObserver | null = null;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
      const alvos = [...document.querySelectorAll<HTMLElement>("[data-surge]")].filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.92);
      obs = new IntersectionObserver(
        (entradas) => {
          for (const en of entradas) {
            if (!en.isIntersecting) continue;
            (en.target as HTMLElement).removeAttribute("data-antes");
            obs?.unobserve(en.target);
          }
        },
        { rootMargin: "0px 0px -12% 0px" }
      );
      for (const el of alvos) {
        el.setAttribute("data-antes", "");
        obs.observe(el);
      }
    }
    return () => {
      window.removeEventListener(EVENTO_EDICAO, aoEdicao);
      obs?.disconnect();
    };
  }, []);
  return null;
}
