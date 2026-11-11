"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// ── O CARROSSEL DOS MÓDULOS (nov/2026) ──
// Pedido do fundador a partir da vitrine da Apple Store ("As novidades. Veja
// o que acabou de chegar."): cartões altos lado a lado, uns escuros e uns
// claros, que correm de lado com o dedo, a roda do mouse ou as setas. A
// faixa começa alinhada à coluna do site e sangra até a borda direita.
//
// Os nomes em cima (11/11/2026): as setas ficavam embaixo dos cartões, e o
// visitante só via que havia mais módulos depois de rolar a página até elas.
// Agora a fileira com o nome de cada módulo fica entre o título e os
// cartões: mostra de saída quantos são e quais, leva direto a qualquer um e
// acende o que está na frente enquanto a faixa corre. As setas foram para a
// ponta da mesma fileira (no celular, o dedo e os nomes bastam).
// Sem script, a faixa continua rolando de lado normalmente.
export default function Carrossel({ titulo, nomes, children, rotulo }: { titulo: ReactNode; nomes: string[]; children: ReactNode; rotulo: string }) {
  const trilho = useRef<HTMLDivElement>(null);
  const fileira = useRef<HTMLDivElement>(null);
  // O módulo escolhido pelo nome. Perto do fim a faixa não consegue pôr o
  // último cartão rente à coluna; sem isto o nome aceso seria o vizinho.
  const alvo = useRef<number | null>(null);
  const [atual, setAtual] = useState(0);
  const [inicio, setInicio] = useState(true);
  const [fim, setFim] = useState(false);

  useEffect(() => {
    const t = trilho.current;
    if (!t) return;
    let pendente = false;
    const medir = () => {
      if (pendente) return;
      pendente = true;
      requestAnimationFrame(() => {
        pendente = false;
        const ehFim = t.scrollLeft + t.clientWidth > t.scrollWidth - 8;
        setInicio(t.scrollLeft < 8);
        setFim(ehFim);
        const linha = t.getBoundingClientRect().left + (parseFloat(getComputedStyle(t).scrollPaddingLeft) || 0);
        const cartoes = [...t.querySelectorAll<HTMLElement>(".car-cartao")];
        let perto = 0;
        let menor = Infinity;
        cartoes.forEach((c, i) => {
          const d = Math.abs(c.getBoundingClientRect().left - linha);
          if (d < menor) { menor = d; perto = i; }
        });
        setAtual(ehFim && alvo.current !== null ? alvo.current : perto);
      });
    };
    // Quem mexe na faixa com a mão desfaz a escolha pelo nome.
    const soltar = () => { alvo.current = null; };
    medir();
    t.addEventListener("scroll", medir, { passive: true });
    t.addEventListener("pointerdown", soltar, { passive: true });
    t.addEventListener("wheel", soltar, { passive: true });
    window.addEventListener("resize", medir);
    return () => {
      t.removeEventListener("scroll", medir);
      t.removeEventListener("pointerdown", soltar);
      t.removeEventListener("wheel", soltar);
      window.removeEventListener("resize", medir);
    };
  }, []);

  // No celular a fileira de nomes também corre: o aceso fica sempre à vista.
  useEffect(() => {
    const f = fileira.current;
    const b = f?.children[atual] as HTMLElement | undefined;
    if (!f || !b || f.scrollWidth <= f.clientWidth) return;
    const meio = b.offsetLeft + b.offsetWidth / 2 - f.clientWidth / 2;
    f.scrollTo({ left: Math.max(0, meio), behavior: suave() ? "smooth" : "auto" });
  }, [atual]);

  const ir = (i: number) => {
    const t = trilho.current;
    const c = t?.querySelectorAll<HTMLElement>(".car-cartao")[i];
    if (!t || !c) return;
    alvo.current = i;
    setAtual(i);
    const linha = parseFloat(getComputedStyle(t).scrollPaddingLeft) || 0;
    const left = t.scrollLeft + c.getBoundingClientRect().left - t.getBoundingClientRect().left - linha;
    t.scrollTo({ left, behavior: suave() ? "smooth" : "auto" });
  };

  const andar = (lado: 1 | -1) => ir(Math.max(0, Math.min(nomes.length - 1, atual + lado)));

  return (
    <div className="car">
      <div className="car-cab">{titulo}</div>
      <div className="car-nav">
        <div ref={fileira} className="car-nomes" aria-label="Ir para o módulo">
          {nomes.map((nome, i) => (
            <button
              key={nome}
              type="button"
              className={i === atual ? "aceso" : undefined}
              aria-current={i === atual ? "true" : undefined}
              onClick={() => ir(i)}
            >
              <span className="car-num">{String(i + 1).padStart(2, "0")}</span>
              {nome}
            </button>
          ))}
        </div>
        <div className="car-setas">
          <button type="button" className="liquido" onClick={() => andar(-1)} disabled={inicio && atual === 0} aria-label="Módulo anterior">‹</button>
          <button type="button" className="liquido" onClick={() => andar(1)} disabled={fim && atual === nomes.length - 1} aria-label="Próximo módulo">›</button>
        </div>
      </div>
      <div ref={trilho} className="car-trilho" role="region" aria-label={rotulo} tabIndex={0}>
        {children}
      </div>
    </div>
  );
}

function suave() {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
