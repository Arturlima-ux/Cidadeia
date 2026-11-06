"use client";

import { useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import { EVENTO_LEVE, semMovimento } from "@/lib/modo-leve";
import { EVENTO_VISITANTE, guardarVisitante, lerVisitante, nomeDoLocal, type LocalAproximado } from "@/lib/onde-esta";
import type { CenaBrasil } from "./brasil-relevo-cena";
import { ARQUIVOS_DA_ABERTURA } from "./relevo-abertura";

// ── A ENTRADA DO MAPA: O BRASIL CRESCE DO PLANO (nov/2026) ──
// Pedido do fundador: "o cliente triscou, abriu e automaticamente tem uma
// animação", com o Brasil crescendo do zero até o relevo. A cena 3D leva de
// 2 a 9 s para montar, então a subida é um vídeo curto gravado da própria
// cena (public/mapa/cresce-*.mp4, 1,4 s, ~60 KB), que toca 0,05 s depois de
// poder tocar. No fim, a imagem do último quadro (cartaz-*.webp, mais
// nítida) fica no lugar até a cena 3D assumir por cima, no mesmo quadro.
// Roda num script pequeno junto do HTML, sem esperar o React. Se o vídeo
// não tocar em 3 s (economia de bateria, rede ruim) ou com movimento
// reduzido, a imagem aparece direto (subindo, ou parada). O elemento guarda
// __feito e avisa "feito", para a cena 3D não cobrir o vídeo no meio.
const ENTRADA_CARTAZ = `(function(c){if(!c||c.__iniciado)return;c.__iniciado=1;var i=c.querySelector("img"),v=c.querySelector("video"),r=matchMedia("(prefers-reduced-motion: reduce)").matches,e="cubic-bezier(0.16, 1, 0.3, 1)",tocou=0;function fim(sobe){if(c.__feito)return;c.__feito=1;i.animate(sobe&&!r?[{opacity:0,transform:"translateY(40px) scale(0.95)"},{opacity:1,transform:"none"}]:[{opacity:1},{opacity:1}],{duration:sobe&&!r?900:0,easing:e,fill:"both"});if(v){v.animate([{opacity:0},{opacity:0}],{duration:0,fill:"forwards"});try{v.pause()}catch(x){}}c.dispatchEvent(new Event("feito"))}if(r||!v||!v.play){fim(0);return}v.muted=true;v.addEventListener("playing",function(){tocou=1;v.animate([{opacity:1},{opacity:1}],{duration:0,fill:"forwards"})},{once:true});v.addEventListener("ended",function(){fim(0)},{once:true});var foi=0;function toca(){if(foi)return;foi=1;setTimeout(function(){var p=v.play();if(p&&p.catch)p.catch(function(){fim(1)})},50)}if(v.readyState>=3)toca();else v.addEventListener("canplay",toca,{once:true});setTimeout(function(){if(!tocou)fim(1)},3000)})`;

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
  // Navegação dentro do site: o script do HTML não roda; a imagem só sobe.
  useEffect(() => {
    const cartaz = palco.current?.querySelector<HTMLElement & { __iniciado?: number; __feito?: number }>(".topo3d-cartaz");
    const img = cartaz?.querySelector("img");
    if (!cartaz || !img || cartaz.__iniciado) return;
    cartaz.__iniciado = 1;
    cartaz.__feito = 1;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    img.animate(
      reduzir ? [{ opacity: 1 }, { opacity: 1 }] : [{ opacity: 0, transform: "translateY(40px) scale(0.95)" }, { opacity: 1, transform: "none" }],
      { duration: reduzir ? 0 : 900, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" },
    );
    cartaz.querySelector("video")?.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 0, fill: "forwards" });
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
          // A cena só cobre o mapa depois que a subida (vídeo) acabou.
          aoPronto: () => {
            const cartaz = palco.current?.querySelector<HTMLElement & { __feito?: number }>(".topo3d-cartaz");
            if (!cartaz || cartaz.__feito) return setPronto(true);
            cartaz.addEventListener("feito", () => setPronto(true), { once: true });
            window.setTimeout(() => setPronto(true), 4000);
          },
          // ?captura=cresce: só para gravar o vídeo da entrada (window.__quadro(t) devolve cada quadro em PNG).
          ...(new URLSearchParams(location.search).get("captura") === "cresce" ? { cresce: 1.4 } : { semEntrada: true }),
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
      {/* O Brasil crescendo (vídeo) e o mapa pronto (imagem), até a cena 3D
          chegar (TopoBrasil.tsx, .topo3d-cartaz; a entrada, ENTRADA_CARTAZ). */}
      <div className="topo3d-cartaz">
        <picture>
          <source media="(max-width: 859px)" srcSet="/mapa/cartaz-estreito.webp" width={585} height={630} />
          <img src="/mapa/cartaz-largo.webp" width={2160} height={1245} alt="" decoding="async" />
        </picture>
        <video muted playsInline preload="auto" disablePictureInPicture aria-hidden tabIndex={-1} width={1440} height={830}>
          <source media="(max-width: 859px)" src="/mapa/cresce-estreito.mp4" type="video/mp4" />
          <source src="/mapa/cresce-largo.mp4" type="video/mp4" />
        </video>
      </div>
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
