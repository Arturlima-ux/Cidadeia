"use client";

import { useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import { EVENTO_LEVE, semMovimento } from "@/lib/modo-leve";
import { EVENTO_VISITANTE, guardarVisitante, lerVisitante, nomeDoLocal, type LocalAproximado } from "@/lib/onde-esta";
import type { CenaBrasil } from "./brasil-relevo-cena";
import { ARQUIVOS_DA_ABERTURA } from "./relevo-abertura";

// ── A ENTRADA DO CARTAZ (nov/2026) ──
// EM TESTE: ?entrada=luz|queda|varre troca a entrada, para o fundador
// comparar na prévia. Sai quando ele escolher.
// Pedido do fundador: o mapa começa a se mexer 0,05 s depois de aparecer, em
// todo aparelho, e dá para ver: sobe, cresce e se acende em 1,2 s. Roda num script
// pequeno junto do HTML, sem esperar o React (que hidrata depois), e conta a
// partir de quando a imagem carregou: se contasse do HTML, num celular lento
// a animação acabaria antes de a imagem chegar. Com movimento reduzido, só
// aparece. O effect repete a entrada na navegação dentro do site (onde o
// script do HTML não roda de novo); sem eval, que a CSP de produção barra.
const ENTRADA_CARTAZ = `(function(p){var i=p&&p.querySelector("img");if(!i||i.getAnimations().length)return;var r=window.matchMedia("(prefers-reduced-motion: reduce)").matches;var V={luz:[{opacity:1,clipPath:"circle(0% at 82% 42%)",filter:"brightness(3)"},{clipPath:"circle(40% at 82% 42%)",filter:"brightness(2)",offset:0.4},{opacity:1,clipPath:"circle(130% at 82% 42%)",filter:"none"}],queda:[{opacity:0,transform:"translateY(-180px) scale(1.3)",filter:"brightness(2.5)"},{opacity:1,offset:0.35},{opacity:1,transform:"none",filter:"none"}],varre:[{opacity:1,clipPath:"inset(0 100% 0 0)",filter:"brightness(3)"},{clipPath:"inset(0 45% 0 0)",filter:"brightness(2)",offset:0.5},{opacity:1,clipPath:"inset(0 0% 0 0)",filter:"none"}]};var e=V[new URLSearchParams(location.search).get("entrada")];var f=function(){if(i.getAnimations().length)return;i.animate(r?[{opacity:1},{opacity:1}]:e||[{opacity:0,transform:"translateY(70px) scale(0.9)",filter:"brightness(0.3)"},{opacity:1,transform:"none",filter:"none"}],{duration:r?0:1200,delay:r?0:50,easing:"cubic-bezier(0.16, 1, 0.3, 1)",fill:"both"})};if(i.complete&&i.naturalWidth)f();else{i.addEventListener("load",f,{once:true});i.addEventListener("error",f,{once:true})}})`;

// ── O BRASIL EM RELEVO DO TOPO (o palco do 3D) ──
//
// O texto do topo chega pronto do servidor (TopoBrasil.tsx); aqui fica só o
// palco: a tela do 3D, o rótulo do visitante, a pílula de ação e a legenda.
// O mapa chega o quanto antes sem passar na frente do texto: as imagens do
// relevo leve vão no <head> do HTML (preload, prioridade baixa) e começam a
// baixar com a página; o three.js e a cena (brasil-relevo-cena.ts) começam na
// hidratação; a cena é montada assim que os dois chegam, sem esperar o load
// da página inteira. Antes esperava o load, o navegador livre e baixava em
// fila, e o fundador achou que o mapa demorava. A primeira pintura e o maior
// conteúdo continuam sendo o texto.
//
// O visitante: /api/onde-estou devolve a cidade aproximada pela conexão
// (cabeçalhos da Vercel), sem pedir permissão e sem gravar nada. Só quem
// visita vê o seu ponto. Sem resposta (fora do Brasil, rede local), o mapa
// fica só com as capitais.
//
// Modo leve ou movimento reduzido: um quadro parado, sem laço de animação.
// Se o modo leve ligar no meio da visita (ModoLeve mediu quadros lentos), a
// cena para na hora.

// ── A CIDADE ESCOLHIDA (novembro de 2026) ──
// Quando a pessoa busca o município no topo, a home volta com ele (?m=) e o
// ponto azul passa a marcar a sede dele (lib/sede-no-mapa.ts), no lugar de
// onde a conexão diz que ela está: a cidade escolhida vale mais.
export type CidadeNoMapa = { nome: string; uf: string; lat: number; lng: number };

export default function BrasilRelevo({ cidade = null }: { cidade?: CidadeNoMapa | null } = {}) {
  for (const src of ARQUIVOS_DA_ABERTURA) preload(src, { as: "image", fetchPriority: "low" });
  const palco = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const rotulo = useRef<HTMLDivElement>(null);
  const cena = useRef<CenaBrasil | null>(null);
  const [local, setLocal] = useState<LocalAproximado | null>(null);
  const escolhida = useRef<CidadeNoMapa | null>(cidade);
  useEffect(() => {
    escolhida.current = cidade;
  }, [cidade]);
  // Navegação dentro do site: o script do HTML não roda, a entrada roda aqui.
  useEffect(() => {
    const cartaz = palco.current?.querySelector(".topo3d-cartaz");
    const img = cartaz?.querySelector("img");
    if (!img || img.getAnimations().length) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const entrar = () => {
      if (img.getAnimations().length) return;
      img.animate(
        reduzir
          ? [{ opacity: 1 }, { opacity: 1 }]
          : [{ opacity: 0, transform: "translateY(70px) scale(0.9)", filter: "brightness(0.3)" }, { opacity: 1, transform: "none", filter: "none" }],
        { duration: reduzir ? 0 : 1200, delay: reduzir ? 0 : 50, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" },
      );
    };
    if (img.complete && img.naturalWidth) entrar();
    else img.addEventListener("load", entrar, { once: true });
  }, []);
  const [hora, setHora] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [semTresD, setSemTresD] = useState(false);
  const [gira, setGira] = useState(false);

  // O relógio de Brasília (de 15 em 15 s basta para os minutos).
  useEffect(() => {
    const ler = () => {
      try {
        setHora(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }));
      } catch {
        setHora(null);
      }
    };
    ler();
    const t = window.setInterval(ler, 15000);
    return () => window.clearInterval(t);
  }, []);

  // Logo depois da hidratação, com o navegador livre: a cena e o local do visitante.
  useEffect(() => {
    let vivo = true;
    const janela = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
    const quandoLivre = (f: () => void) => (janela.requestIdleCallback ? janela.requestIdleCallback(f, { timeout: 300 }) : window.setTimeout(f, 50));

    // O código da cena começa a baixar agora (as imagens já vieram pelo preload).
    const modulo = import("./brasil-relevo-cena");

    const montar = async () => {
      if (!palco.current || !tela.current || !rotulo.current) return;
      try {
        const { montarBrasil } = await modulo;
        if (!vivo || !palco.current || !tela.current || !rotulo.current) return;
        const c = await montarBrasil({
          palco: palco.current,
          tela: tela.current,
          rotulo: rotulo.current,
          parado: semMovimento,
          aoPronto: () => setPronto(true),
          semEntrada: true,
        });
        if (!vivo) return c.destruir();
        cena.current = c;
        setGira(palco.current.hasAttribute("data-gira"));
        const c0 = escolhida.current;
        if (c0) {
          requestAnimationFrame(() => c.definirVisitante({ lat: c0.lat, lng: c0.lng }));
          return;
        }
        const ja = lerVisitante();
        if (ja) {
          setLocal(ja);
          requestAnimationFrame(() => c.definirVisitante(ja));
        }
      } catch {
        // Sem WebGL (ou a cena falhou): o topo continua inteiro, só sem o mapa.
        if (vivo) setSemTresD(true);
      }
    };
    const perguntarLocal = () => {
      fetch("/api/onde-estou", { credentials: "same-origin" })
        .then((r) => (r.status === 200 ? (r.json() as Promise<LocalAproximado>) : null))
        .then((l) => {
          if (vivo && l) guardarVisitante(l);
        })
        .catch(() => {});
    };
    quandoLivre(() => { void montar(); perguntarLocal(); });

    const aoVisitante = (e: Event) => {
      const l = (e as CustomEvent<LocalAproximado>).detail;
      setLocal(l);
      if (escolhida.current) return;
      // Depois que o rótulo aparece, para a cena medir a largura dele.
      requestAnimationFrame(() => cena.current?.definirVisitante(l));
    };
    const aoLeve = () => cena.current?.parar();
    window.addEventListener(EVENTO_VISITANTE, aoVisitante);
    window.addEventListener(EVENTO_LEVE, aoLeve);
    return () => {
      vivo = false;
      window.removeEventListener(EVENTO_VISITANTE, aoVisitante);
      window.removeEventListener(EVENTO_LEVE, aoLeve);
      cena.current?.destruir();
      cena.current = null;
    };
  }, []);

  // A cidade muda sem desmontar o mapa (a busca troca só o ?m=): o ponto vai junto.
  const chave = cidade ? `${cidade.lat},${cidade.lng}` : "";
  useEffect(() => {
    if (!cidade) {
      if (local) cena.current?.definirVisitante(local);
      return;
    }
    requestAnimationFrame(() => cena.current?.definirVisitante({ lat: cidade.lat, lng: cidade.lng }));
    // Só a posição importa; `local` entra pelo evento do visitante.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  const nome = cidade ? `${cidade.nome}, ${cidade.uf}` : nomeDoLocal(local);
  return (
    <div ref={palco} className="topo3d-palco" data-pronto={pronto ? "" : undefined}>
      {/* O mapa já pronto, até a cena 3D chegar (TopoBrasil.tsx, .topo3d-cartaz). */}
      <picture className="topo3d-cartaz">
        <source media="(max-width: 859px)" srcSet="/mapa/cartaz-estreito.webp" width={780} height={840} />
        <img src="/mapa/cartaz-largo.webp" width={2160} height={1245} alt="" fetchPriority="high" decoding="async" />
      </picture>
      <script dangerouslySetInnerHTML={{ __html: `${ENTRADA_CARTAZ}(document.currentScript.previousElementSibling)` }} />
      <noscript><style>{`.topo3d-cartaz img{opacity:1}`}</style></noscript>
      <canvas
        ref={tela}
        className="topo3d-tela"
        role="img"
        aria-label={`O Brasil em relevo${nome ? (cidade ? `, com ${nome} acesa` : `, com um ponto aceso em ${nome}`) : ""}`}
      />
      <div ref={rotulo} className="topo3d-voce" aria-hidden hidden={!nome}>
        <i className="topo3d-ponto-voce" />
        <span>
          {cidade ? "Sua cidade:" : "Você está em"} <b>{nome}</b>
        </span>
      </div>
      <a href="#solucoes" className="topo3d-pilula liquido liquido-flutua">
        Conhecer os módulos <span className="topo3d-seta" aria-hidden>→</span>
      </a>
      <div className="topo3d-rodape" aria-hidden>
        <span className="topo3d-legenda">
          {hora && <span>Brasília {hora}</span>}
          {!semTresD && (
            <>
              {nome && <span><i className="topo3d-ponto-voce" />{cidade ? "Sua cidade" : "Você"}</span>}
            </>
          )}
        </span>
        {gira && <span>Arraste para girar</span>}
      </div>
    </div>
  );
}
