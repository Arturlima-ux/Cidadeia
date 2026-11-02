"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { decodificarPontos, MAPA_ALTURA, MAPA_LARGURA } from "@/lib/mapa-municipios";
import { EVENTO_LEVE, semMovimento } from "@/lib/modo-leve";
import { ESTILO_MAPA_VIVO } from "./mapa-vivo-estilo";
import { EVENTO_VISITANTE, lerVisitante, type LocalAproximado } from "@/lib/onde-esta";
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

/** Até onde o brilho do mouse alcança, em pixels do mapa. */
const ALCANCE = 120;
/** Quantos alertas acendem ao mesmo tempo, em rodízio. */
const ALERTAS = 5;
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
  const pais = useRef<HTMLDivElement>(null);
  const brilho = useRef<HTMLCanvasElement>(null);
  const reduzir = usePrefereMenosMovimento();

  useEffect(() => {
    const caixa = raiz.current;
    const canvas = fundo.current;
    const camadaPais = pais.current;
    const camadaBrilho = brilho.current;
    if (!caixa || !canvas || !camadaBrilho || !camadaPais) return;
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
    const alvoVisitante = caixa.querySelector<HTMLElement>("[data-mapa='visitante']");
    // O visitante, pela conexão (lib/onde-esta.ts): acende sozinho, numa cor
    // própria, e some quando a posição exata do GPS chega.
    let visitante: { x: number; y: number } | null = null;
    const pelaConexao = (l: LocalAproximado | null) => {
      visitante = l ? paraMapa(l.lat, l.lng) : null;
    };
    pelaConexao(lerVisitante());
    const alertas = Array.from(caixa.querySelectorAll<HTMLElement>("[data-mapa='alerta']"));
    let voce: { x: number; y: number; raio: number } | null = null;

    function marcarFixos() {
      if (alvoDestaque) {
        const ok = destaque !== null && destaque >= 0 && destaque < n;
        if (ok) posicionar(alvoDestaque, px(destaque), py(destaque));
        alvoDestaque.hidden = !ok;
      }
      if (alvoVisitante) {
        const ok = !!visitante && !voce;
        if (ok) posicionar(alvoVisitante, origemX + visitante!.x * escala, origemY + visitante!.y * escala);
        alvoVisitante.hidden = !ok;
      }
      if (alvoVoce && voce) {
        posicionar(alvoVoce, origemX + voce.x * escala, origemY + voce.y * escala);
        alvoVoce.style.setProperty("--anel", `${Math.max(18, voce.raio * escala * 2).toFixed(0)}px`);
        alvoVoce.hidden = false;
      }
    }

    // O país, desenhado uma vez (e de novo só se a caixa mudar de tamanho).
    function desenhar() {
      const fator = Math.min(window.devicePixelRatio || 1, 2);
      largura = caixa!.offsetWidth;
      altura = caixa!.offsetHeight;
      for (const c of [canvas!, camadaBrilho!]) {
        c.width = Math.round(largura * fator);
        c.height = Math.round(altura * fator);
      }
      ctx!.setTransform(fator, 0, 0, fator, 0, 0);
      ctxBrilho!.setTransform(fator, 0, 0, fator, 0, 0);
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
    // e pode esperar o texto e a hidratação.
    let iniciado = false;
    let desmontado = false;
    const iniciar = () => {
      espera = null;
      if (desmontado || iniciado) return;
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
    // só os pontos perto dele, numa camada à parte. É barato (redesenha uns
    // poucos pontos por quadro, e só com o mouse andando), então fica ligado
    // também no modo leve; sai só com movimento reduzido pelo sistema.
    let quadro = 0;
    const tela = { x: -9999, y: -9999 };
    // A camada do brilho fica fora da tela (hidden) enquanto não há brilho:
    // um canvas transparente do tamanho do mapa também custa a cada quadro.
    camadaBrilho.hidden = true;
    const desenharBrilho = () => {
      quadro = 0;
      ctxBrilho!.clearRect(0, 0, largura, altura);
      camadaBrilho.hidden = true;
      if (tela.x < -9000) return;
      const naTela = caixa.getBoundingClientRect();
      const p = { x: tela.x - naTela.left, y: tela.y - naTela.top };
      if (p.x < -120 || p.y < -120 || p.x > largura + 120 || p.y > altura + 120) return;
      camadaBrilho.hidden = false;
      ctxBrilho!.fillStyle = corPonto;
      for (let i = 0; i < n; i++) {
        const x = px(i);
        const y = py(i);
        if (Math.abs(x - p.x) + Math.abs(y - p.y) > ALCANCE * 1.42) continue;
        const perto = Math.hypot(x - p.x, y - p.y);
        if (perto >= ALCANCE) continue;
        // Perto do mouse, o ponto cresce e acende.
        const forca = 1 - perto / ALCANCE;
        const lado = raio * (1 + forca * 0.6);
        ctxBrilho!.globalAlpha = forca * 0.55;
        ctxBrilho!.fillRect(x - lado / 2, y - lado / 2, lado, lado);
      }
      ctxBrilho!.globalAlpha = 1;
    };
    const pedirBrilho = () => {
      if (!quadro) quadro = requestAnimationFrame(desenharBrilho);
    };
    const comMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const sistemaPedeMenos = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const aoMover = (e: PointerEvent) => {
      tela.x = e.clientX;
      tela.y = e.clientY;
      pedirBrilho();
    };
    const aoSair = () => {
      tela.x = -9999;
      pedirBrilho();
    };
    if (comMouse && !sistemaPedeMenos) {
      window.addEventListener("pointermove", aoMover, { passive: true });
      document.documentElement.addEventListener("pointerleave", aoSair);
    }

    const aoLocalizar = (e: Event) => {
      const l = (e as CustomEvent<Leitura>).detail;
      const { x, y } = paraMapa(l.lat, l.lng);
      voce = { x, y, raio: l.precisaoM / 1000 / KM_POR_UNIDADE };
      if (iniciado) marcarFixos();
    };
    window.addEventListener(EVENTO_LOCALIZACAO, aoLocalizar);
    const aoVisitante = (e: Event) => {
      pelaConexao((e as CustomEvent<LocalAproximado>).detail);
      if (iniciado) marcarFixos();
    };
    window.addEventListener(EVENTO_VISITANTE, aoVisitante);

    let ultimo = "";
    const ro = new ResizeObserver(() => {
      if (!iniciado) return;
      const agora = `${caixa.offsetWidth}x${caixa.offsetHeight}`;
      if (agora === ultimo) return;
      ultimo = agora;
      desenhar();
      for (const el of alertas) sortear(el);
    });
    ro.observe(caixa);

    return () => {
      desmontado = true;
      window.removeEventListener("load", agendar);
      if (espera !== null) {
        if (janela.cancelIdleCallback) janela.cancelIdleCallback(espera);
        else window.clearTimeout(espera);
      }
      cancelAnimationFrame(quadro);
      for (const el of alertas) el.removeEventListener("animationiteration", aoCiclo);
      window.removeEventListener("pointermove", aoMover);
      document.documentElement.removeEventListener("pointerleave", aoSair);
      window.removeEventListener(EVENTO_LOCALIZACAO, aoLocalizar);
      window.removeEventListener(EVENTO_VISITANTE, aoVisitante);
      io.disconnect();
      ro.disconnect();
    };
  }, [reduzir, destaque]);

  return (
    <div ref={raiz} className={`mapa-vivo relative ${className}`} aria-hidden role="presentation">
      <style href="cidadeia-mapa-vivo" precedence="medium">
        {ESTILO_MAPA_VIVO}
      </style>
      <div ref={pais} className="mapa-vivo-pais absolute inset-0">
        <canvas ref={fundo} className="absolute inset-0 w-full h-full" />
      </div>
      <canvas ref={brilho} className="absolute inset-0 w-full h-full" />
      {Array.from({ length: ALERTAS }, (_, i) => (
        <span key={i} data-mapa="alerta" className="mapa-marcador" style={{ "--atraso": `${i * 0.92 + 0.4}s` } as React.CSSProperties}>
          <span className="mapa-alerta-anel" />
          <span className="mapa-alerta-ponto" />
        </span>
      ))}
      <span data-mapa="destaque" className="mapa-marcador" hidden>
        <span className="mapa-destaque-anel" />
        <span className="mapa-destaque-ponto" />
      </span>
      <span data-mapa="visitante" className="mapa-marcador" hidden>
        <span className="mapa-visitante-anel" />
        <span className="mapa-visitante-anel" />
        <span className="mapa-visitante-ponto" />
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
