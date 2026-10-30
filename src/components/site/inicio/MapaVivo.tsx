"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { decodificarPontos, MAPA_ALTURA, MAPA_LARGURA } from "@/lib/mapa-municipios";
import { EVENTO_LEVE, semMovimento } from "@/lib/modo-leve";
import { EVENTO_LOCALIZACAO, KM_POR_UNIDADE, paraMapa, type Leitura } from "@/lib/localizacao";

// ── O BRASIL, UM PONTO POR MUNICÍPIO ──
//
// Cada ponto é a sede de um dos municípios do país, na posição real
// (lib/mapa-municipios.ts). Três tempos:
//
// 1. Entrada: o país acende devagar.
// 2. Repouso: de tempos em tempos um município acende em âmbar, vermelho ou
//    verde com um anel que se abre, como um alerta chegando. Isso é o
//    produto, desenhado.
// 3. Resposta: com mouse, os pontos perto do ponteiro clareiam.
//
// ── E SEM OCUPAR O CELULAR (revisão de novembro de 2026) ──
// Até aqui o mapa era redesenhado no canvas a cada quadro: 30 quadros por
// segundo na onda de entrada e 15 no repouso, cada um copiando a imagem
// inteira do país. No Lighthouse com a CPU de celular, cada quadro desses
// passava de 100 ms e era a maior fonte de travamento da home depois do
// carregamento. Agora o canvas é desenhado UMA vez e fica parado. Tudo o que
// se mexe é feito de elementos pequenos por cima dele, animados só com
// transform e opacity pelo CSS (globals.css, .mapa-vivo): roda no compositor,
// sem JavaScript por quadro. O brilho do ponteiro redesenha só os pontos
// perto dele, numa segunda camada, e só enquanto o mouse se mexe.
//
// Com movimento reduzido, o mapa aparece parado, sem alertas.
// Canvas não lê variável CSS: a cor dos pontos vem de getComputedStyle sobre
// o token do tema; nenhuma cor é escrita aqui (tests/design-system.test.ts).

/** Quantos alertas acendem ao mesmo tempo, em rodízio. */
const ALERTAS = 3;
/** Cores dos alertas: mais atenção que incêndio, e um verde de vez em quando. */
const CORES = ["medio", "medio", "urgente", "medio", "info", "urgente"] as const;

export default function MapaVivo({
  destaque = null,
  className = "",
}: {
  /** Índice do município escolhido em PONTOS, quando houver. */
  destaque?: number | null;
  className?: string;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const fundo = useRef<HTMLCanvasElement>(null);
  const brilho = useRef<HTMLCanvasElement>(null);
  const reduzir = usePrefereMenosMovimento();

  useEffect(() => {
    const caixa = raiz.current;
    const canvas = fundo.current;
    const camadaBrilho = brilho.current;
    if (!caixa || !canvas || !camadaBrilho) return;
    const ctx = canvas.getContext("2d");
    const ctxBrilho = camadaBrilho.getContext("2d");
    if (!ctx || !ctxBrilho) return;

    const pontos = decodificarPontos();
    const n = pontos.length / 2;
    const corPonto = getComputedStyle(canvas).getPropertyValue("--foreground").trim();

    let largura = 0;
    let altura = 0;
    let escala = 1;
    let origemX = 0;
    let origemY = 0;
    let raio = 1;
    const px = (i: number) => origemX + pontos[i * 2] * escala;
    const py = (i: number) => origemY + pontos[i * 2 + 1] * escala;

    // Coloca um marcador (alerta, município escolhido, "você está aqui") na
    // posição de um ponto. Só transform: nada de top/left.
    const posicionar = (el: HTMLElement, x: number, y: number) => {
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    };

    const alvoDestaque = caixa.querySelector<HTMLElement>("[data-mapa='destaque']");
    const alvoVoce = caixa.querySelector<HTMLElement>("[data-mapa='voce']");
    const alertas = Array.from(caixa.querySelectorAll<HTMLElement>("[data-mapa='alerta']"));
    let voce: { x: number; y: number; raio: number } | null = null;

    function marcarFixos() {
      if (alvoDestaque) {
        const ok = destaque !== null && destaque >= 0 && destaque < n;
        if (ok) posicionar(alvoDestaque, px(destaque), py(destaque));
        alvoDestaque.hidden = !ok;
      }
      if (alvoVoce && voce) {
        posicionar(alvoVoce, origemX + voce.x * escala, origemY + voce.y * escala);
        alvoVoce.style.setProperty("--anel", `${Math.max(18, voce.raio * escala * 2).toFixed(0)}px`);
        alvoVoce.hidden = false;
      }
    }

    // O país, desenhado uma vez (e de novo só se a caixa mudar de tamanho).
    function desenhar() {
      const r = caixa!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      largura = r.width;
      altura = r.height;
      for (const c of [canvas!, camadaBrilho!]) {
        c.width = Math.round(largura * dpr);
        c.height = Math.round(altura * dpr);
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxBrilho!.setTransform(dpr, 0, 0, dpr, 0, 0);
      escala = Math.min(largura / MAPA_LARGURA, altura / MAPA_ALTURA);
      origemX = (largura - MAPA_LARGURA * escala) / 2;
      origemY = (altura - MAPA_ALTURA * escala) / 2;
      raio = Math.max(1.1, Math.min(2, escala * 2));
      ctx!.clearRect(0, 0, largura, altura);
      ctx!.fillStyle = corPonto;
      ctx!.globalAlpha = 0.4;
      for (let i = 0; i < n; i++) ctx!.fillRect(px(i) - raio / 2, py(i) - raio / 2, raio, raio);
      ctx!.globalAlpha = 1;
      marcarFixos();
      caixa!.dataset.pronto = "1";
      ultimo = `${Math.round(largura)}x${Math.round(altura)}`;
    }

    // Alertas em rodízio: cada um, ao fim do seu ciclo (evento do próprio
    // CSS), pula para outro município sorteado e troca de cor.
    const sortear = (el: HTMLElement) => {
      const i = Math.floor(Math.random() * n);
      posicionar(el, px(i), py(i));
      el.dataset.cor = CORES[Math.floor(Math.random() * CORES.length)];
    };
    // O evento sobe dos dois filhos (anel e ponto); o anel decide.
    const aoCiclo = (e: Event) => {
      if ((e.target as HTMLElement).classList.contains("mapa-alerta-anel")) sortear(e.currentTarget as HTMLElement);
    };
    // Desenha depois do evento load, com o navegador livre: o mapa é fundo
    // e pode esperar o texto e a hidratação (na home ele já chega depois do
    // load, por MapaVivoAdiado; nas outras páginas espera aqui).
    let iniciado = false;
    const iniciar = () => {
      espera = null;
      iniciado = true;
      desenhar();
      if (!reduzir) {
        for (const el of alertas) {
          sortear(el);
          el.addEventListener("animationiteration", aoCiclo);
        }
      }
    };
    const janela = window as Window & {
      requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let espera: number | null = null;
    const agendar = () => {
      espera = janela.requestIdleCallback ? janela.requestIdleCallback(iniciar, { timeout: 1200 }) : window.setTimeout(iniciar, 200);
    };
    if (document.readyState === "complete") agendar();
    else window.addEventListener("load", agendar, { once: true });

    // Fora da tela, os alertas param (o CSS lê data-visivel).
    const io = new IntersectionObserver(([e]) => {
      caixa.dataset.visivel = e.isIntersecting ? "1" : "0";
    });
    io.observe(caixa);

    // O brilho perto do ponteiro: só com mouse, só enquanto ele se mexe, e
    // só os pontos perto dele, numa camada à parte.
    let quadro = 0;
    const ponteiro = { x: -9999, y: -9999 };
    const desenharBrilho = () => {
      quadro = 0;
      ctxBrilho!.clearRect(0, 0, largura, altura);
      if (ponteiro.x < -9000) return;
      ctxBrilho!.fillStyle = corPonto;
      for (let i = 0; i < n; i++) {
        const x = px(i);
        const y = py(i);
        if (Math.abs(x - ponteiro.x) + Math.abs(y - ponteiro.y) > 150) continue;
        const perto = Math.hypot(x - ponteiro.x, y - ponteiro.y);
        if (perto >= 110) continue;
        ctxBrilho!.globalAlpha = (1 - perto / 110) * 0.55;
        ctxBrilho!.fillRect(x - raio / 2, y - raio / 2, raio, raio);
      }
      ctxBrilho!.globalAlpha = 1;
    };
    const pedirBrilho = () => {
      if (!quadro) quadro = requestAnimationFrame(desenharBrilho);
    };
    const comMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const aoMover = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const dentro = x > -120 && y > -120 && x < r.width + 120 && y < r.height + 120;
      if (!dentro && ponteiro.x < -9000) return;
      ponteiro.x = dentro ? x : -9999;
      ponteiro.y = dentro ? y : -9999;
      pedirBrilho();
    };
    if (!reduzir && comMouse) window.addEventListener("pointermove", aoMover, { passive: true });

    const aoLocalizar = (e: Event) => {
      const l = (e as CustomEvent<Leitura>).detail;
      const { x, y } = paraMapa(l.lat, l.lng);
      voce = { x, y, raio: l.precisaoM / 1000 / KM_POR_UNIDADE };
      if (iniciado) marcarFixos();
    };
    window.addEventListener(EVENTO_LOCALIZACAO, aoLocalizar);

    let ultimo = "";
    const ro = new ResizeObserver(() => {
      if (!iniciado) return;
      const r = caixa.getBoundingClientRect();
      const agora = `${Math.round(r.width)}x${Math.round(r.height)}`;
      if (agora === ultimo) return;
      ultimo = agora;
      desenhar();
      for (const el of alertas) sortear(el);
    });
    ro.observe(caixa);

    return () => {
      window.removeEventListener("load", agendar);
      if (espera !== null) {
        if (janela.cancelIdleCallback) janela.cancelIdleCallback(espera);
        else window.clearTimeout(espera);
      }
      cancelAnimationFrame(quadro);
      for (const el of alertas) el.removeEventListener("animationiteration", aoCiclo);
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener(EVENTO_LOCALIZACAO, aoLocalizar);
      io.disconnect();
      ro.disconnect();
    };
  }, [reduzir, destaque]);

  return (
    <div ref={raiz} className={`mapa-vivo relative ${className}`} aria-hidden role="presentation">
      <canvas ref={fundo} className="mapa-vivo-pais absolute inset-0 w-full h-full" />
      <canvas ref={brilho} className="absolute inset-0 w-full h-full" />
      {Array.from({ length: ALERTAS }, (_, i) => (
        <span key={i} data-mapa="alerta" className="mapa-marcador" style={{ "--atraso": `${i * 0.73 + 0.4}s` } as React.CSSProperties}>
          <span className="mapa-alerta-anel" />
          <span className="mapa-alerta-ponto" />
        </span>
      ))}
      <span data-mapa="destaque" className="mapa-marcador" hidden>
        <span className="mapa-destaque-anel" />
        <span className="mapa-destaque-ponto" />
      </span>
      <span data-mapa="voce" className="mapa-marcador" hidden>
        <span className="mapa-voce-anel" />
        <span className="mapa-voce-ponto" />
      </span>
    </div>
  );
}

/** Preferência do sistema por menos movimento, sem a biblioteca de animação. */
function usePrefereMenosMovimento(): boolean {
  // Movimento reduzido pelo sistema ou modo leve (computador fraco, ver
  // lib/modo-leve.ts): o mapa fica parado, sem alertas nem brilho do mouse.
  return useSyncExternalStore(
    (avisar) => {
      const m = window.matchMedia("(prefers-reduced-motion: reduce)");
      m.addEventListener("change", avisar);
      window.addEventListener(EVENTO_LEVE, avisar);
      return () => {
        m.removeEventListener("change", avisar);
        window.removeEventListener(EVENTO_LEVE, avisar);
      };
    },
    semMovimento,
    () => false
  );
}
