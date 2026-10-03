"use client";

import { useEffect } from "react";

// ── O FUNDO QUE CONECTA OS PILARES ──
//
// O pedido: "o fundo do site precisa desempenhar um papel fundamental:
// conectar pilares tão diferentes em uma experiência visual coesa, fluida, de
// alto impacto e única", com "transições temáticas por módulo ao rolar".
//
// O problema real por trás disso: a home apresenta saúde, educação, obras,
// licitações, portal e gestão. São seis assuntos sem nada em comum para quem
// rola a página, e a solução usual — dar a cada seção um fundo diferente —
// produz seis páginas coladas, não uma.
//
// Aqui o fundo é UM só, fixo atrás de tudo, e o que muda é a cor do halo. A
// transição acontece no fundo contínuo, então a página inteira parece uma
// coisa que muda de temperatura, e não seis blocos empilhados.
//
// ── POR QUE AS CORES NÃO SÃO NOVAS ──
//
// Os tons vêm de `--serie-1..6`, a paleta categórica validada em 02/10/2026
// com o validador do skill de dataviz, nos dois temas, contra a superfície de
// cartão de cada um: faixa de luminosidade, piso de croma, separação sob
// daltonismo, piso de visão normal e contraste. Inventar um sétimo tom aqui
// desfaria essa garantia — e a cor do halo é a mesma que identifica o módulo
// no resto do produto, o que é o ponto: o fundo não decora, ele situa.
//
// ── POR QUE NÃO É `motion` ──
//
// Isto é uma variável CSS trocando num elemento fixo, com `transition`. A
// animação roda no compositor, sem React no caminho e sem recalcular layout a
// cada quadro de rolagem. `motion` ganha onde há transição de layout
// compartilhado — é onde ele é usado nas abas do bento, e não aqui.

/** Uma seção declara o seu tema com `data-tema`. */
export type TemaDeFundo =
  | "neutro"
  | "gestao"
  | "essencial"
  | "saude"
  | "educacao"
  | "obras"
  | "licitacoes";

export default function FundoTematico() {
  useEffect(() => {
    const raiz = document.documentElement;

    // Movimento reduzido: o halo fica no tom neutro e não acompanha a
    // rolagem. A página continua inteira; só para de mudar de temperatura.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const secoes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-tema]")
    );
    if (secoes.length === 0) return;

    // Um observador só para todas as seções, como em `Reveal`: a home tem
    // dezenas de blocos, e um observador por bloco é o caminho conhecido para
    // a rolagem travar no celular.
    //
    // A faixa estreita no meio da tela é o que define "a seção que está sendo
    // lida": sem ela, duas seções visíveis ao mesmo tempo disputam o halo e
    // ele pisca na fronteira entre as duas.
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          const tema = e.target.getAttribute("data-tema");
          if (tema) raiz.setAttribute("data-fundo", tema);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    for (const s of secoes) observador.observe(s);
    return () => observador.disconnect();
  }, []);

  // O elemento é pintado pelo CSS (ver globals.css, bloco "fundo temático").
  // Fica vazio e `aria-hidden` porque não carrega informação nenhuma: quem usa
  // leitor de tela não perde nada, e quem desliga o JavaScript vê o halo
  // neutro, que é o estado inicial do CSS.
  return <div className="fundo-tematico" aria-hidden />;
}
