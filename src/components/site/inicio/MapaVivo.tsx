"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { decodificarPontos, MAPA_ALTURA, MAPA_LARGURA } from "@/lib/mapa-municipios";
import { EVENTO_LEVE, semMovimento } from "@/lib/modo-leve";
import { homografia } from "@/lib/homografia";
import { aneisDoContorno } from "@/lib/contorno-brasil";
import { ESTILO_MAPA_VIVO } from "./mapa-vivo-estilo";
import { EVENTO_MAPA_PRONTO, EVENTO_VISITANTE, lerVisitante, type LocalAproximado } from "@/lib/onde-esta";
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
  intenso = false,
}: {
  /** Índice do município escolhido em PONTOS, quando houver. */
  destaque?: number | null;
  className?: string;
  /** Pontos mais claros e um pouco maiores: no planeta, o mapa fica deitado
   *  e longe, e com a tinta de fundo os pontos sumiam. */
  intenso?: boolean;
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
    const foto = new Image();
    if (intenso) {
      foto.decoding = "async";
      foto.src = "/mapa/brasil-noite.jpg";
    }
    const estilo = getComputedStyle(canvas);
    const corPonto = estilo.getPropertyValue("--foreground").trim();
    const corContorno = estilo.getPropertyValue("--brand-claro").trim() || corPonto;
    const corTerra = estilo.getPropertyValue("--brand").trim() || corPonto;

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

    // O território (só no planeta): a foto de satélite do Brasil à noite,
    // recortada pela fronteira, com a fronteira e o litoral acesos por cima.
    // Escolha do fundador na bancada de materiais (outubro de 2026): "o
    // primeiro", a Terra real, só que sem o globo. A foto é a Black Marble da
    // NASA (domínio público), já reprojetada para o sistema deste mapa e
    // recortada no tamanho dele (public/mapa/brasil-noite.jpg, 1000 x 975);
    // as luzes que se veem nela são as das cidades de verdade.
    let contornoAtual: Path2D | null = null;
    function desenharTerritorio() {
      const contorno = new Path2D();
      contornoAtual = contorno;
      for (const anel of aneisDoContorno()) {
        anel.forEach(([x, y], i) => {
          const cx = origemX + x * escala;
          const cy = origemY + y * escala;
          if (i === 0) contorno.moveTo(cx, cy);
          else contorno.lineTo(cx, cy);
        });
        contorno.closePath();
      }
      const k = ctx!;
      if (foto.complete && foto.naturalWidth) {
        k.save();
        k.clip(contorno);
        k.imageSmoothingEnabled = true;
        k.imageSmoothingQuality = "high";
        k.drawImage(foto, origemX, origemY, MAPA_LARGURA * escala, MAPA_ALTURA * escala);
        // Uma luz por dentro da borda, para o país se descolar do planeta.
        k.globalAlpha = 0.35;
        k.strokeStyle = corTerra;
        k.lineWidth = 10;
        k.shadowColor = corTerra;
        k.shadowBlur = 18;
        k.stroke(contorno);
        k.restore();
      }
      // A fronteira e o litoral, acesos.
      k.save();
      k.globalAlpha = 0.95;
      k.strokeStyle = corContorno;
      k.lineWidth = 1.2;
      k.lineJoin = "round";
      k.shadowColor = corContorno;
      k.shadowBlur = 10;
      k.stroke(contorno);
      k.restore();
    }

    // O país, desenhado uma vez (e de novo só se a caixa mudar de tamanho).
    function desenhar() {
      // Tamanho de layout, e não o da tela: no planeta do topo o mapa é
      // inclinado em 3D, e getBoundingClientRect devolveria a caixa já
      // achatada pela perspectiva (o desenho saía espremido e os marcadores
      // fora do lugar).
      //
      // Resolução: no planeta, a perspectiva amplia a parte de baixo do mapa
      // (a mais perto) em até 1,7 vez, e o canvas era desenhado só na
      // densidade da tela. Num notebook comum (tela 1x), o sul do país saía
      // ampliado e borrado; o fundador achou o mapa "sem HD". Agora o mapa
      // do planeta é desenhado com folga de 1,75 a 2,5 vezes, e os pontos são
      // círculos em vez de quadradinhos, que ampliados viravam borrão.
      pararOnda();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const fator = intenso ? Math.min(2.5, Math.max(1.75, dpr * 1.75)) : dpr;
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
      raio = intenso ? Math.max(1.6, Math.min(2.8, escala * 2.8)) : Math.max(1.1, Math.min(2, escala * 2));
      ctx!.clearRect(0, 0, largura, altura);
      if (intenso) desenharTerritorio();
      ctx!.fillStyle = corPonto;
      ctx!.globalAlpha = intenso ? 0.85 : 0.4;
      if (intenso) {
        // Um caminho só com todos os círculos: um preenchimento, não 5.571.
        // Somando luz à da foto, como as sedes acesas no globo.
        ctx!.globalCompositeOperation = "lighter";
        ctx!.globalAlpha = 0.7;
        const r = raio * 0.42;
        ctx!.beginPath();
        for (let i = 0; i < n; i++) {
          const x = px(i);
          const y = py(i);
          ctx!.moveTo(x + r, y);
          ctx!.arc(x, y, r, 0, Math.PI * 2);
        }
        ctx!.fill();
        ctx!.globalCompositeOperation = "source-over";
      } else {
        for (let i = 0; i < n; i++) ctx!.fillRect(px(i) - raio / 2, py(i) - raio / 2, raio, raio);
      }
      ctx!.globalAlpha = 1;
      marcarFixos();
      caixa!.dataset.pronto = "1";
      ultimo = `${Math.round(largura)}x${Math.round(altura)}`;
    }

    // ── A ONDA DE ENTRADA (planeta) ──
    // Como no mapa de antes: o país acende numa onda que sai de Brasília e
    // corre até a fronteira, com a frente mais clara e um anel de luz
    // varrendo o território. O mapa já desenhado vira uma imagem, e cada
    // quadro só a recorta num círculo maior: duas cópias de imagem por
    // quadro, por 2,6 s. Com movimento reduzido ou no modo leve, não há onda.
    // Os marcadores (alertas, visitante) esperam ela passar.
    const BRASILIA = paraMapa(-15.79, -47.88);
    let ondaQuadro = 0;
    function pararOnda() {
      if (ondaQuadro) cancelAnimationFrame(ondaQuadro);
      ondaQuadro = 0;
      delete caixa!.dataset.onda;
    }
    function onda() {
      const camada = document.createElement("canvas");
      camada.width = canvas!.width;
      camada.height = canvas!.height;
      const kc = camada.getContext("2d");
      if (!kc) return;
      kc.drawImage(canvas!, 0, 0);
      const f = canvas!.width / Math.max(1, largura);
      const bx = origemX + BRASILIA.x * escala;
      const by = origemY + BRASILIA.y * escala;
      const longe = Math.max(Math.hypot(bx, by), Math.hypot(largura - bx, by), Math.hypot(bx, altura - by), Math.hypot(largura - bx, altura - by));
      const faixa = Math.max(18, longe * 0.08);
      const DURACAO = 2600;
      const inicio = performance.now() + 150;
      const contorno = contornoAtual;
      caixa!.dataset.onda = "1";
      const k = ctx!;
      const passo = (agora: number) => {
        const x = Math.min(1, Math.max(0, (agora - inicio) / DURACAO));
        // Entra e sai devagar: com curva de saída forte, o círculo cobria
        // metade do país no primeiro quinto do tempo e parecia um piscar.
        const p = (1 - Math.cos(Math.PI * x)) / 2;
        const r = p * longe;
        k.save();
        k.setTransform(1, 0, 0, 1, 0, 0);
        k.clearRect(0, 0, canvas!.width, canvas!.height);
        // O que a onda já alcançou.
        k.beginPath();
        k.arc(bx * f, by * f, r * f, 0, Math.PI * 2);
        k.clip();
        k.drawImage(camada, 0, 0);
        k.restore();
        // A frente: um anel em que os pontos passam mais claros.
        k.save();
        k.setTransform(1, 0, 0, 1, 0, 0);
        k.beginPath();
        k.arc(bx * f, by * f, r * f, 0, Math.PI * 2);
        k.arc(bx * f, by * f, Math.max(0, r - faixa) * f, 0, Math.PI * 2, true);
        k.clip();
        k.globalCompositeOperation = "lighter";
        k.globalAlpha = 1 - p * 0.55;
        k.drawImage(camada, 0, 0);
        k.restore();
        // O anel de luz, só dentro do país.
        k.save();
        if (contorno) k.clip(contorno);
        k.globalAlpha = (1 - p) * 0.85;
        k.strokeStyle = corContorno;
        k.lineWidth = 1.6;
        k.shadowColor = corContorno;
        k.shadowBlur = 12;
        k.beginPath();
        k.arc(bx, by, r, 0, Math.PI * 2);
        k.stroke();
        k.restore();
        if (x < 1) {
          ondaQuadro = requestAnimationFrame(passo);
        } else {
          k.save();
          k.setTransform(1, 0, 0, 1, 0, 0);
          k.clearRect(0, 0, canvas!.width, canvas!.height);
          k.drawImage(camada, 0, 0);
          k.restore();
          ondaQuadro = 0;
          delete caixa!.dataset.onda;
          window.dispatchEvent(new CustomEvent(EVENTO_MAPA_PRONTO));
        }
      };
      ondaQuadro = requestAnimationFrame(passo);
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
    let desmontado = false;
    const iniciar = () => {
      espera = null;
      if (desmontado || iniciado) return;
      // No planeta, espera a foto do país (100 kB) chegar; sem ela, desenha
      // só a fronteira e as sedes.
      if (intenso && !foto.complete) {
        foto.decode().then(iniciar, iniciar);
        return;
      }
      iniciado = true;
      if (intenso) caixa.dataset.entrada = "onda";
      desenhar();
      if (intenso && !reduzir) onda();
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
    //
    // O mouse chega em coordenadas de tela, e no planeta do topo o mapa está
    // deitado em 3D e pode girar. Os quatro cantos do mapa (spans de tamanho
    // zero, lidos com getBoundingClientRect, que devolve a posição já
    // projetada) dão a homografia que leva a tela de volta ao plano do mapa
    // (lib/homografia.ts). Num mapa reto, ela é só a translação de sempre.
    const cantos = Array.from(caixa.querySelectorAll<HTMLElement>("[data-canto]"));
    let quadro = 0;
    const tela = { x: -9999, y: -9999 };
    const desenharBrilho = () => {
      quadro = 0;
      ctxBrilho!.clearRect(0, 0, largura, altura);
      if (tela.x < -9000 || cantos.length !== 4) return;
      const naTela = cantos.map((c) => {
        const r = c.getBoundingClientRect();
        return { x: r.left, y: r.top };
      });
      const paraOMapa = homografia(naTela, [
        { x: 0, y: 0 },
        { x: largura, y: 0 },
        { x: 0, y: altura },
        { x: largura, y: altura },
      ]);
      if (!paraOMapa) return;
      const p = paraOMapa(tela);
      if (p.x < -120 || p.y < -120 || p.x > largura + 120 || p.y > altura + 120) return;
      ctxBrilho!.fillStyle = corPonto;
      for (let i = 0; i < n; i++) {
        const x = px(i);
        const y = py(i);
        if (Math.abs(x - p.x) + Math.abs(y - p.y) > ALCANCE * 1.42) continue;
        const perto = Math.hypot(x - p.x, y - p.y);
        if (perto >= ALCANCE) continue;
        // Perto do mouse, o ponto cresce e acende; no planeta, onde os pontos
        // já são claros, só acender não se via.
        const forca = 1 - perto / ALCANCE;
        const lado = raio * (1 + forca * (intenso ? 1.2 : 0.6));
        ctxBrilho!.globalAlpha = forca * (intenso ? 0.95 : 0.55);
        if (intenso) {
          ctxBrilho!.beginPath();
          ctxBrilho!.arc(x, y, lado * 0.56, 0, Math.PI * 2);
          ctxBrilho!.fill();
        } else {
          ctxBrilho!.fillRect(x - lado / 2, y - lado / 2, lado, lado);
        }
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
      pararOnda();
      for (const el of alertas) el.removeEventListener("animationiteration", aoCiclo);
      window.removeEventListener("pointermove", aoMover);
      document.documentElement.removeEventListener("pointerleave", aoSair);
      window.removeEventListener(EVENTO_LOCALIZACAO, aoLocalizar);
      window.removeEventListener(EVENTO_VISITANTE, aoVisitante);
      io.disconnect();
      ro.disconnect();
    };
  }, [reduzir, destaque, intenso]);

  return (
    <div ref={raiz} className={`mapa-vivo relative ${className}`} aria-hidden role="presentation">
      <style href="cidadeia-mapa-vivo" precedence="medium">
        {ESTILO_MAPA_VIVO}
      </style>
      <canvas ref={fundo} className="mapa-vivo-pais absolute inset-0 w-full h-full" />
      <canvas ref={brilho} className="absolute inset-0 w-full h-full" />
      {/* Os quatro cantos, para o brilho achar o mouse no mapa inclinado. */}
      {[0, 1, 2, 3].map((i) => (
        <span key={`canto-${i}`} data-canto={i} className="absolute w-0 h-0" style={{ left: i % 2 ? "100%" : 0, top: i > 1 ? "100%" : 0 }} />
      ))}
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
