"use client";

import { useEffect } from "react";

// ── A BARRA DE CIMA SE MISTURA COM A PÁGINA ATÉ A PESSOA ROLAR ──
//
// No topo, o cabeçalho não tem fundo nem linha: é parte do fundo liso da
// página (referência aprovada no Figma, outubro de 2026). Ao rolar, ganha o
// fundo opaco e a linha embaixo, para o texto que passa por trás não brigar
// com o menu. Só marca um atributo na raiz; o desenho está em globals.css
// (.cabecalho-site).
export default function CabecalhoAoRolar() {
  useEffect(() => {
    let pendente = false;
    const medir = () => {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(() => {
        pendente = false;
        document.documentElement.toggleAttribute("data-rolou", window.scrollY > 8);
      });
    };
    medir();
    window.addEventListener("scroll", medir, { passive: true });
    return () => window.removeEventListener("scroll", medir);
  }, []);
  return null;
}
