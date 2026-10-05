"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";
import { decodificarPontos, MAPA_ALTURA, MAPA_LARGURA } from "@/lib/mapa-municipios";

// ── O BRASIL, UM PONTO POR MUNICÍPIO ──
//
// Substitui a malha quadriculada do topo. Cada ponto é a sede de um dos
// municípios do país, na posição real (lib/mapa-municipios.ts). Três tempos:
//
// 1. Entrada: uma onda parte de Brasília e acende o país em pouco mais de
//    dois segundos. É o único movimento orquestrado da página, junto do
//    título, e roda com `animate` do Motion.
// 2. Repouso: os pontos respiram devagar, e de tempos em tempos um município
//    acende em âmbar ou vermelho com um anel que se abre, como um alerta
//    chegando. Isso é o produto, desenhado.
// 3. Resposta: os pontos perto do ponteiro clareiam. Movimento que responde
//    a quem está olhando.
//
// Com movimento reduzido, desenha o mapa parado e não anima nada. Fora da
// tela ou com a aba escondida, para de desenhar.
//
// Canvas não lê variável CSS, então as cores vêm de getComputedStyle sobre
// os tokens do tema; nenhuma cor é escrita aqui (tests/design-system.test.ts).

const BRASILIA = { x: 627, y: 530 }; // -15,78, -47,93 na escala do mapa

type Pulso = { i: number; inicio: number; cor: string };

export default function MapaVivo({
  destaque = null,
  className = "",
}: {
  /** Índice do município escolhido em PONTOS, quando houver. */
  destaque?: number | null;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduzir = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pontos = decodificarPontos();
    const n = pontos.length / 2;

    // Ordem de chegada da onda: distância até Brasília, com um pouco de ruído
    // para a frente da onda não ficar um círculo de compasso.
    const chegada = new Float32Array(n);
    const fase = new Float32Array(n);
    let maior = 0;
    for (let i = 0; i < n; i++) {
      const dx = pontos[i * 2] - BRASILIA.x;
      const dy = pontos[i * 2 + 1] - BRASILIA.y;
      chegada[i] = Math.hypot(dx, dy);
      if (chegada[i] > maior) maior = chegada[i];
      fase[i] = Math.random() * Math.PI * 2;
    }
    for (let i = 0; i < n; i++) chegada[i] = (chegada[i] / maior) * 0.86 + Math.random() * 0.08;

    const estilo = getComputedStyle(canvas);
    const token = (nome: string) => estilo.getPropertyValue(nome).trim();
    const COR = {
      ponto: token("--foreground"),
      marca: token("--brand-claro"),
      medio: token("--medio"),
      urgente: token("--urgente"),
      info: token("--info"),
    };

    let largura = 0;
    let altura = 0;
    let escala = 1;
    let origemX = 0;
    let origemY = 0;
    let raio = 1;

    function medir() {
      const r = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      largura = r.width;
      altura = r.height;
      canvas!.width = Math.round(largura * dpr);
      canvas!.height = Math.round(altura * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      escala = Math.min(largura / MAPA_LARGURA, altura / MAPA_ALTURA);
      origemX = (largura - MAPA_LARGURA * escala) / 2;
      origemY = (altura - MAPA_ALTURA * escala) / 2;
      raio = Math.max(1.1, Math.min(2, escala * 2));
    }
    medir();

    const px = (i: number) => origemX + pontos[i * 2] * escala;
    const py = (i: number) => origemY + pontos[i * 2 + 1] * escala;

    let progresso = reduzir ? 1 : 0;
    const ponteiro = { x: -9999, y: -9999 };
    const pulsos: Pulso[] = [];
    let proximoPulso = 1600;
    let quadro = 0;
    let visivel = true;
    let inicio = performance.now();

    function desenhar(agora: number) {
      const t = (agora - inicio) / 1000;
      ctx!.clearRect(0, 0, largura, altura);
      ctx!.fillStyle = COR.ponto;

      for (let i = 0; i < n; i++) {
        const atraso = progresso - chegada[i];
        if (atraso < 0) continue;
        const x = px(i);
        const y = py(i);

        // A frente da onda passa mais clara e assenta no tom de repouso.
        const frente = Math.max(0, 1 - atraso * 9);
        let alfa = 0.34 + (reduzir ? 0 : 0.12 * Math.sin(t * 0.7 + fase[i])) + frente * 0.6;

        const d = Math.hypot(x - ponteiro.x, y - ponteiro.y);
        if (d < 110) alfa += (1 - d / 110) * 0.55;

        ctx!.globalAlpha = Math.min(1, alfa);
        ctx!.fillRect(x - raio / 2, y - raio / 2, raio, raio);
      }

      // Alertas chegando.
      for (let k = pulsos.length - 1; k >= 0; k--) {
        const p = pulsos[k];
        const vida = (agora - p.inicio) / 2200;
        if (vida >= 1) {
          pulsos.splice(k, 1);
          continue;
        }
        const x = px(p.i);
        const y = py(p.i);
        const sai = 1 - vida;
        ctx!.globalAlpha = sai;
        ctx!.fillStyle = p.cor;
        ctx!.beginPath();
        ctx!.arc(x, y, raio * 1.8, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.globalAlpha = sai * 0.6;
        ctx!.strokeStyle = p.cor;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.arc(x, y, 3 + vida * 22, 0, Math.PI * 2);
        ctx!.stroke();
      }

      // O município escolhido: aceso na cor da marca, com um anel que respira.
      if (destaque !== null && destaque >= 0 && destaque < n && progresso >= 1) {
        const x = px(destaque);
        const y = py(destaque);
        const resp = reduzir ? 0.5 : (Math.sin(t * 2) + 1) / 2;
        ctx!.globalAlpha = 1;
        ctx!.fillStyle = COR.marca;
        ctx!.beginPath();
        ctx!.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.globalAlpha = 0.25 + resp * 0.35;
        ctx!.strokeStyle = COR.marca;
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        ctx!.arc(x, y, 9 + resp * 5, 0, Math.PI * 2);
        ctx!.stroke();
      }

      ctx!.globalAlpha = 1;

      if (!reduzir && progresso >= 1 && agora - inicio > proximoPulso) {
        // Mais âmbar que vermelho, e um verde de vez em quando: a maioria do
        // que o sistema mostra é atenção, não incêndio.
        const sorteio = Math.random();
        const cor = sorteio < 0.55 ? COR.medio : sorteio < 0.85 ? COR.urgente : COR.info;
        pulsos.push({ i: Math.floor(Math.random() * n), inicio: agora, cor });
        proximoPulso = agora - inicio + 650 + Math.random() * 900;
      }
    }

    function laco(agora: number) {
      if (visivel) desenhar(agora);
      quadro = requestAnimationFrame(laco);
    }

    let entrada: ReturnType<typeof animate> | null = null;
    if (reduzir) {
      desenhar(performance.now());
    } else {
      inicio = performance.now();
      entrada = animate(0, 1, {
        duration: 2.6,
        delay: 0.25,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (v) => {
          progresso = v;
        },
      });
      quadro = requestAnimationFrame(laco);
    }

    const aoMover = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ponteiro.x = e.clientX - r.left;
      ponteiro.y = e.clientY - r.top;
    };
    const aoSair = () => {
      ponteiro.x = -9999;
      ponteiro.y = -9999;
    };
    if (!reduzir) {
      window.addEventListener("pointermove", aoMover, { passive: true });
      document.addEventListener("pointerleave", aoSair);
    }

    const ro = new ResizeObserver(() => {
      medir();
      if (reduzir) desenhar(performance.now());
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting && document.visibilityState === "visible";
    });
    io.observe(canvas);
    const aoTrocarAba = () => {
      visivel = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", aoTrocarAba);

    return () => {
      cancelAnimationFrame(quadro);
      entrada?.stop();
      window.removeEventListener("pointermove", aoMover);
      document.removeEventListener("pointerleave", aoSair);
      document.removeEventListener("visibilitychange", aoTrocarAba);
      ro.disconnect();
      io.disconnect();
    };
  }, [reduzir, destaque]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden
      role="presentation"
    />
  );
}
