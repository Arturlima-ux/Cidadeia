"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
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
// ── E SEM TRAVAR O CELULAR ──
// Medido com o Lighthouse num celular simulado: redesenhar os 5.570 pontos a
// 60 quadros por segundo, desde o primeiro instante, travava a página por
// mais de um segundo e meio enquanto ela carregava. Agora os pontos são
// desenhados uma vez só numa camada; a onda de entrada apenas revela essa
// camada (60 quadros, barata em qualquer aparelho) e o repouso roda a 15.
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
  const reduzir = usePrefereMenosMovimento();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pontos = decodificarPontos();
    const n = pontos.length / 2;

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

    // A onda de entrada roda em todo aparelho. Antes ela redesenhava os 5.570
    // pontos a cada quadro e por isso era desligada no celular e em
    // computador de até 4 núcleos — onde o mapa aparecia de uma vez. Agora o
    // mapa é desenhado UMA vez (a camada abaixo) e a onda só revela essa
    // imagem num círculo que cresce de Brasília: duas cópias de imagem por
    // quadro, custo de nada.
    let progresso = reduzir ? 1 : 0;
    const ponteiro = { x: -9999, y: -9999 };
    const pulsos: Pulso[] = [];
    let proximoPulso = 1600;
    let quadro = 0;
    let visivel = true;
    let inicio = performance.now();

    // O fundo de pontos, desenhado uma vez depois da onda e reaproveitado a
    // cada quadro: redesenhar 5.570 pontos 15 vezes por segundo só para o
    // "respirar" custava mais processamento do que a página inteira.
    let camada: HTMLCanvasElement | null = null;
    function fazerCamada() {
      const c = document.createElement("canvas");
      c.width = canvas!.width;
      c.height = canvas!.height;
      const k = c.getContext("2d");
      if (!k) return null;
      k.setTransform(canvas!.width / Math.max(1, largura), 0, 0, canvas!.height / Math.max(1, altura), 0, 0);
      k.fillStyle = COR.ponto;
      k.globalAlpha = 0.4;
      for (let i = 0; i < n; i++) k.fillRect(px(i) - raio / 2, py(i) - raio / 2, raio, raio);
      return c;
    }

    function desenhar(agora: number) {
      const t = (agora - inicio) / 1000;
      ctx!.clearRect(0, 0, largura, altura);
      ctx!.fillStyle = COR.ponto;

      if (progresso >= 1) {
        camada ??= fazerCamada();
        if (camada) {
          ctx!.save();
          ctx!.setTransform(1, 0, 0, 1, 0, 0);
          ctx!.globalAlpha = 1;
          ctx!.drawImage(camada, 0, 0);
          ctx!.restore();
        }
        // O brilho perto do ponteiro só existe com mouse sobre o mapa.
        if (ponteiro.x > -9000) {
          for (let i = 0; i < n; i++) {
            const x = px(i);
            const y = py(i);
            const d = Math.abs(x - ponteiro.x) + Math.abs(y - ponteiro.y);
            if (d > 150) continue;
            const perto = Math.hypot(x - ponteiro.x, y - ponteiro.y);
            if (perto >= 110) continue;
            ctx!.globalAlpha = (1 - perto / 110) * 0.55;
            ctx!.fillRect(x - raio / 2, y - raio / 2, raio, raio);
          }
        }
      } else {
        camada ??= fazerCamada();
        if (camada) {
          // Do ponto de Brasília até o canto mais longe do mapa.
          const bx = origemX + BRASILIA.x * escala;
          const by = origemY + BRASILIA.y * escala;
          const longe = Math.max(
            Math.hypot(bx - origemX, by - origemY),
            Math.hypot(origemX + MAPA_LARGURA * escala - bx, by - origemY),
            Math.hypot(bx - origemX, origemY + MAPA_ALTURA * escala - by),
            Math.hypot(origemX + MAPA_LARGURA * escala - bx, origemY + MAPA_ALTURA * escala - by)
          );
          const r = progresso * longe;
          const faixa = Math.max(18, longe * 0.07);
          const dpr = canvas!.width / Math.max(1, largura);
          // O país já alcançado pela onda, no tom de repouso.
          ctx!.save();
          ctx!.beginPath();
          ctx!.arc(bx, by, r, 0, Math.PI * 2);
          ctx!.clip();
          ctx!.setTransform(1, 0, 0, 1, 0, 0);
          ctx!.drawImage(camada, 0, 0);
          ctx!.restore();
          // A frente da onda: um anel em que os pontos passam mais claros.
          ctx!.save();
          ctx!.beginPath();
          ctx!.arc(bx, by, r, 0, Math.PI * 2);
          ctx!.arc(bx, by, Math.max(0, r - faixa), 0, Math.PI * 2, true);
          ctx!.clip();
          ctx!.setTransform(1, 0, 0, 1, 0, 0);
          ctx!.globalCompositeOperation = "lighter";
          ctx!.globalAlpha = 1 - progresso * 0.6;
          ctx!.drawImage(camada, 0, 0);
          ctx!.drawImage(camada, 0, 0);
          ctx!.restore();
          ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
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

    // Onda de entrada: 3 s depois de 0,15 s, junto com o título.
    const DURACAO = 3000;
    const ATRASO = 150;
    // Entra e sai devagar: com a curva de saída forte de antes, o círculo
    // cobria metade do país no primeiro quinto do tempo e parecia um piscar.
    const suave = (x: number) => (1 - Math.cos(Math.PI * x)) / 2;
    let ultimoQuadro = 0;
    function laco(agora: number) {
      if (progresso < 1) progresso = suave(Math.min(1, Math.max(0, (agora - inicio - ATRASO) / DURACAO)));
      // Depois da onda, 15 quadros por segundo bastam para o respirar e os alertas.
      const intervalo = progresso < 1 ? 0 : 66;
      if (visivel && agora - ultimoQuadro >= intervalo) {
        ultimoQuadro = agora;
        desenhar(agora);
      }
      quadro = requestAnimationFrame(laco);
    }

    let espera: number | null = null;
    const comecar = () => {
      espera = null;
      if (reduzir) {
        desenhar(performance.now());
      } else {
        inicio = performance.now();
        quadro = requestAnimationFrame(laco);
      }
    };
    // Só quando a página já carregou e o navegador está livre.
    const ocioso = (window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    // Prazo curto: a onda acompanha o título, que começa a subir logo de cara.
    if (ocioso) espera = ocioso(comecar, { timeout: 400 });
    else espera = window.setTimeout(comecar, 150);

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
      camada = null;
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
      if (espera !== null) {
        const cancelar = (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
        if (cancelar) cancelar(espera);
        else window.clearTimeout(espera);
      }
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

/** Preferência do sistema por menos movimento, sem a biblioteca de animação. */
function usePrefereMenosMovimento(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const m = window.matchMedia("(prefers-reduced-motion: reduce)");
      m.addEventListener("change", avisar);
      return () => m.removeEventListener("change", avisar);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}
