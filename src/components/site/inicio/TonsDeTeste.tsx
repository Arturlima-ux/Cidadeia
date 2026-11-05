"use client";

import { useLayoutEffect, useState } from "react";

// ── TONS DE TESTE (só na prévia, nunca em produção) ──
// O estilo vem de public/teste/tons-de-teste.css, por <link>, e não por
// import: assim ele não entra na folha da home nem chega à produção.
// Lê ?tom=a|b|c e veste a home com o tom (tons-de-teste.css) antes de o mapa
// em relevo montar, porque a cena 3D lê as cores na hora em que monta. Trocar
// de tom recarrega a página para o mapa montar de novo com as cores novas.
const TONS = [
  { chave: "", rotulo: "Hoje" },
  { chave: "a", rotulo: "A · Noite azul" },
  { chave: "b", rotulo: "B · Grafite quente" },
  { chave: "c", rotulo: "C · Crepúsculo" },
] as const;

export default function TonsDeTeste() {
  const [tom, setTom] = useState("");

  useLayoutEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tom") ?? "";
    const valido = TONS.some((x) => x.chave === t) ? t : "";
    const pagina = document.querySelector<HTMLElement>(".pagina-inicial");
    if (pagina && valido) pagina.dataset.tom = valido;
    // Ler a URL só existe no navegador; o primeiro desenho mostra "Hoje".
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTom(valido);
  }, []);

  return (
    <nav className="tons-teste" aria-label="Tons de teste da home">
      <link rel="stylesheet" href="/teste/tons-de-teste.css" precedence="default" />
      <span>Tom</span>
      {TONS.map((t) => (
        <a key={t.rotulo} href={t.chave ? `/?tom=${t.chave}` : "/"} aria-current={tom === t.chave ? "true" : undefined}>
          {t.rotulo}
        </a>
      ))}
    </nav>
  );
}
