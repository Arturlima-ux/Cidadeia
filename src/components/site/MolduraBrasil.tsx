"use client";

import { useEffect, useRef } from "react";
import { decodificarPontos, MAPA_ALTURA, MAPA_LARGURA } from "@/lib/mapa-municipios";

// ── O BRASIL VIRA A MOLDURA ──
//
// O quadro de proposta chega apagado e sem borda acesa. Quando ele entra na
// tela, os 5.570 municípios do Brasil (os mesmos pontos do mapa do topo da
// página, nas coordenadas reais do IBGE) aparecem sobre ele, desenhando o
// mapa. Conforme a pessoa rola, cada município sai do mapa e voa para o
// seu lugar na moldura. A borda se monta de cima para baixo, pelos dois
// lados ao mesmo tempo, e se fecha no meio da borda de baixo no instante
// em que o quadro inteiro cabe na tela. Subindo, os municípios voltam para
// o mapa.
//
// No fechamento, uma corrente de luz percorre os 5.570 pontos, do encontro
// até o topo, com um clarão no ponto onde os dois lados se tocaram, e o
// quadro acende (data-aceso, no CSS). A moldura fica feita de municípios.
//
// Se a pessoa escolheu o município dela no topo da página, é ele que sai
// primeiro: maior, mais claro, e é ele que acende o resto.
//
// ── COMO ──
//
// WebGL, um ponto por município. Cada ponto sabe onde está no mapa e qual é
// o seu lugar na borda (calculado uma vez: os municípios são ordenados pelo
// ângulo em volta do centro do mapa e distribuídos por igual no perímetro,
// então cada um voa mais ou menos para fora, sem cruzar com os outros). O
// vertex shader faz o resto a cada quadro: posição na curva entre mapa e
// borda, tamanho, brilho. 5.570 pontos é nada para uma GPU.
//
// O laço só roda com o quadro na tela e até o fim do fechamento. Depois,
// um último quadro parado e nenhum custo. Sem WebGL ou com "reduzir
// movimento", o quadro só acende quando aparece inteiro.

const PAD = 40;
const RAIO = 28;

const VERT_PONTOS = `
precision highp float;
attribute vec2 aMapa;    // posição no mapa original (0..1000 x 0..975)
attribute float aSlot;   // 0 (meio do topo) .. 1 (meio da base), ao longo do meio perímetro
attribute float aLado;   // +1 direita, -1 esquerda
attribute vec3 aSorte;   // três números aleatórios por ponto
attribute float aEscolhido;
uniform vec2 uCanvas;
uniform float uPad;
uniform vec2 uSize;
uniform float uR;
uniform float uProg;
uniform float uBurst;
uniform float uTime;
uniform float uDpr;
uniform vec3 uMapa;      // centro do mapa (px do quadro) e escala
varying float vAlpha;
varying float vQuente;
varying float vEscolhido;

vec4 borda(float s) {
  // ponto e normal no meio perímetro direito, a s px do meio do topo
  float r = uR;
  float w = uSize.x, h = uSize.y;
  float q = 1.5707963 * r;
  float a1 = w * 0.5 - r;
  if (s <= a1) return vec4(w * 0.5 + s, 0.0, 0.0, -1.0);
  s -= a1;
  if (s <= q) { float a = -1.5707963 + s / r; return vec4(w - r + r * cos(a), r + r * sin(a), cos(a), sin(a)); }
  s -= q;
  if (s <= h - 2.0 * r) return vec4(w, r + s, 1.0, 0.0);
  s -= h - 2.0 * r;
  if (s <= q) { float a = s / r; return vec4(w - r + r * cos(a), h - r + r * sin(a), cos(a), sin(a)); }
  s -= q;
  return vec4(max(w * 0.5, w - r - s), h, 0.0, 1.0);
}

void main() {
  float metade = uSize.x - 2.0 * uR + uSize.y - 2.0 * uR + 3.14159265 * uR;
  vec4 b = borda(aSlot * metade);
  vec2 alvo = vec2(aLado > 0.0 ? b.x : uSize.x - b.x, b.y);
  vec2 normal = vec2(b.z * aLado, b.w);
  // a moldura de municípios tem textura: cada um um pouco fora da linha
  alvo += normal * (aSorte.x - 0.5) * 3.0;

  // Quando cada um sai: o escolhido primeiro; os outros pela ordem na
  // borda, do topo para a base. Todos chegam até uProg = 1.
  float sai = aEscolhido > 0.5 ? 0.5 : 0.57 + 0.30 * aSlot + 0.02 * aSorte.y;
  float k = clamp((uProg - sai) / 0.12, 0.0, 1.0);
  float e = k * k * (3.0 - 2.0 * k);

  // curva: o ponto de controle sai para o lado, cada um num tanto
  vec2 noMapa = uMapa.xy + (aMapa - vec2(500.0, 487.5)) * uMapa.z;
  vec2 meio = mix(noMapa, alvo, 0.5);
  vec2 dir = alvo - noMapa;
  vec2 perp = normalize(vec2(-dir.y, dir.x) + 1e-5);
  vec2 ctrl = meio + perp * (aSorte.z - 0.5) * 0.45 * length(dir) + normal * 30.0;
  vec2 p = mix(mix(noMapa, ctrl, e), mix(ctrl, alvo, e), e);

  // o mapa aparece no começo da rolagem, fraco, cintilando
  // o mapa se acende de Brasília para fora, como no topo da página
  float distBsb = length(aMapa - vec2(627.0, 530.0)) / 620.0;
  float mapa = smoothstep(0.18 + distBsb * 0.28, 0.26 + distBsb * 0.28, uProg) * (0.75 + 0.25 * sin(uTime * 2.0 + aSorte.y * 40.0));
  float voando = e * (1.0 - e) * 4.0;
  float alpha = mix(0.7 * mapa, 0.85, e) + voando * 0.15;
  float quente = voando * 0.6;
  float tam = mix(1.7, 1.9, e) + voando * 0.8;

  // o fechamento: corrente de luz do encontro até o topo
  if (uBurst >= 0.0) {
    float sv = 1.0 - uBurst * 1.15;
    float onda = exp(-pow((aSlot - sv) / 0.035, 2.0));
    quente += onda * 1.6;
    tam += onda * 2.4;
    float assenta = clamp((uBurst - 0.9) / 0.6, 0.0, 1.0);
    alpha = mix(max(alpha, onda), 0.55, assenta);
  }

  if (aEscolhido > 0.5) {
    tam += 3.5;
    quente += 0.7 + 0.3 * sin(uTime * 6.0);
    alpha = max(alpha, smoothstep(0.0, 0.05, uProg));
  }

  vAlpha = uProg < 0.001 && uBurst < 0.0 ? 0.0 : alpha;
  vQuente = quente;
  vEscolhido = aEscolhido;
  vec2 tela = p + uPad;
  gl_Position = vec4(tela.x / uCanvas.x * 2.0 - 1.0, 1.0 - tela.y / uCanvas.y * 2.0, 0.0, 1.0);
  gl_PointSize = tam * uDpr;
}
`;

const FRAG_PONTOS = `
precision mediump float;
uniform vec3 uBrand;
uniform vec3 uClaro;
varying float vAlpha;
varying float vQuente;
varying float vEscolhido;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.15, d) * vAlpha;
  vec3 c = mix(uClaro, uBrand, 0.35);
  c = mix(c, vec3(1.0), clamp(vQuente, 0.0, 1.0));
  if (vEscolhido > 0.5) c = mix(uClaro, vec3(1.0), 0.4);
  gl_FragColor = vec4(c * a, a);
}
`;

// O clarão do fechamento: um quadrado na tela inteira do canvas.
const VERT_CLARAO = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`;
const FRAG_CLARAO = `
precision mediump float;
uniform vec2 uCanvas;
uniform float uDpr;
uniform float uPad;
uniform vec2 uSize;
uniform float uBurst;
uniform vec3 uBrand;
uniform vec3 uClaro;
void main() {
  vec2 px = vec2(gl_FragCoord.x, uCanvas.y * uDpr - gl_FragCoord.y) / uDpr - uPad;
  vec2 B = px - vec2(uSize.x * 0.5, uSize.y);
  float t = uBurst;
  float flash = exp(-length(B * vec2(1.0, 1.6)) / (30.0 + 220.0 * t)) * exp(-t * 3.2);
  float le = length(B * vec2(1.0, 2.4));
  float rr = t * 900.0;
  float onda = exp(-pow((le - rr) / (3.0 + t * 18.0), 2.0)) * exp(-t * 2.6);
  vec3 c = mix(uBrand, uClaro, 0.5) * flash * 1.3 + uClaro * onda * 0.6 + vec3(1.0) * flash * flash * 0.6;
  float a = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0);
  gl_FragColor = vec4(c, a);
}
`;

type Rgb = [number, number, number];

function lerCor(nome: string, reserva: Rgb): Rgb {
  const v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  const hex = v.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  return reserva;
}

function programa(gl: WebGLRenderingContext, vert: string, frag: string) {
  const p = gl.createProgram()!;
  for (const [tipo, fonte] of [
    [gl.VERTEX_SHADER, vert],
    [gl.FRAGMENT_SHADER, frag],
  ] as const) {
    const sh = gl.createShader(tipo)!;
    gl.shaderSource(sh, fonte);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? "shader");
    gl.attachShader(p, sh);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("link");
  return p;
}

export default function MolduraBrasil({
  alvo,
  destaque = null,
  onAceso,
}: {
  alvo: React.RefObject<HTMLDivElement | null>;
  /** Índice do município escolhido em PONTOS, quando houver: ele sai primeiro. */
  destaque?: number | null;
  /** No fechamento da moldura. */
  onAceso: () => void;
}) {
  const tela = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const quadro = alvo.current;
    const canvas = tela.current;
    if (!quadro || !canvas) return;

    // 0 quando o topo do quadro entra por baixo da tela; 1 quando o quadro
    // inteiro cabe (ou, se for mais alto que a tela, quando o topo chega
    // perto do topo).
    const progressoDaRolagem = () => {
      const r = quadro.getBoundingClientRect();
      const vh = window.innerHeight;
      const curso = r.height >= vh * 0.85 ? vh * 0.85 : r.height;
      return Math.min(1, Math.max(0, (vh - r.top) / curso));
    };

    const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl = semMovimento
      ? null
      : (canvas.getContext("webgl", { premultipliedAlpha: true, antialias: true, alpha: true }) as WebGLRenderingContext | null);

    let aceso = false;
    const acender = () => {
      if (aceso) return;
      aceso = true;
      onAceso();
    };

    if (!gl) {
      const conferir = () => {
        if (progressoDaRolagem() >= 0.98) {
          window.removeEventListener("scroll", conferir);
          acender();
        }
      };
      window.addEventListener("scroll", conferir, { passive: true });
      conferir();
      return () => window.removeEventListener("scroll", conferir);
    }

    let pp: WebGLProgram, pc: WebGLProgram;
    try {
      pp = programa(gl, VERT_PONTOS, FRAG_PONTOS);
      pc = programa(gl, VERT_CLARAO, FRAG_CLARAO);
    } catch {
      acender();
      return;
    }

    // ── os municípios: lugar na borda, calculado uma vez ──
    const pontos = decodificarPontos();
    const n = pontos.length / 2;
    let cx = 0, cy = 0;
    for (let i = 0; i < n; i++) {
      cx += pontos[i * 2];
      cy += pontos[i * 2 + 1];
    }
    cx /= n;
    cy /= n;
    const direita: { i: number; ang: number }[] = [];
    const esquerda: { i: number; ang: number }[] = [];
    for (let i = 0; i < n; i++) {
      if (i === destaque) continue;
      const dx = pontos[i * 2] - cx;
      const dy = pontos[i * 2 + 1] - cy;
      // ângulo a partir do norte, 0..π de cada lado
      const ang = Math.atan2(Math.abs(dx), -dy);
      (dx >= 0 ? direita : esquerda).push({ i, ang });
    }
    const slot = new Float32Array(n);
    const lado = new Float32Array(n);
    for (const [lista, sinal] of [
      [direita, 1],
      [esquerda, -1],
    ] as const) {
      lista.sort((a, b) => a.ang - b.ang);
      lista.forEach((p, k) => {
        slot[p.i] = (k + 0.5) / lista.length;
        lado[p.i] = sinal;
      });
    }
    if (destaque !== null && destaque >= 0 && destaque < n) {
      slot[destaque] = 0;
      lado[destaque] = 1;
    }

    const sorte = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) sorte[i] = Math.random();
    const escolhido = new Float32Array(n);
    if (destaque !== null && destaque >= 0 && destaque < n) escolhido[destaque] = 1;

    const buffer = (dados: Float32Array, local: number, tam: number) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, dados, gl.STATIC_DRAW);
      return { b, local, tam };
    };
    const attr = (nome: string) => gl.getAttribLocation(pp, nome);
    const bufMapa = buffer(pontos, attr("aMapa"), 2);
    const bufs = [
      bufMapa,
      buffer(slot, attr("aSlot"), 1),
      buffer(lado, attr("aLado"), 1),
      buffer(sorte, attr("aSorte"), 3),
      buffer(escolhido, attr("aEscolhido"), 1),
    ];
    const bufQuad = buffer(new Float32Array([-1, -1, 3, -1, -1, 3]), gl.getAttribLocation(pc, "a"), 2);

    const up = (n: string) => gl.getUniformLocation(pp, n);
    const uc = (n: string) => gl.getUniformLocation(pc, n);
    const brand = lerCor("--brand", [0.49, 0.36, 1]);
    const claro = lerCor("--accent-claro", [0.8, 0.74, 1]);

    let w = 0, h = 0, dpr = 1;
    let largo = true, escalaMapa = 0.3, centroX = 0;
    const medir = () => {
      w = quadro.offsetWidth;
      h = quadro.offsetHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = w + PAD * 2, ch = h + PAD * 2;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);

      // O mapa: no computador, sobre o painel "Sua proposta" (380 px, vazio
      // antes de escolher o município); no celular, no meio do quadro.
      largo = w >= 900;
      const caixa = largo ? 236 : Math.min(w * 0.72, 260);
      escalaMapa = Math.min(caixa / MAPA_LARGURA, caixa / MAPA_ALTURA);
      centroX = largo ? w - 190 : w / 2;

      for (const [prog, u] of [
        [pp, up],
        [pc, uc],
      ] as const) {
        gl.useProgram(prog);
        gl.uniform2f(u("uCanvas"), cw, ch);
        gl.uniform1f(u("uDpr"), canvas.width / cw);
        gl.uniform1f(u("uPad"), PAD);
        gl.uniform2f(u("uSize"), w, h);
        gl.uniform3fv(u("uBrand"), brand);
        gl.uniform3fv(u("uClaro"), claro);
      }
      gl.useProgram(pp);
      gl.uniform1f(up("uR"), RAIO);
      if (!quadroAnim) quadroAnim = requestAnimationFrame(desenhar);
    };

    let visivel = false;
    let quadroAnim = 0;
    let mostrado = 0;
    let fechou = -1;
    let auto = -1;
    let antes = 0;
    const t0 = performance.now();
    if (progressoDaRolagem() >= 0.98) auto = t0;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const ligar = (b: { b: WebGLBuffer | null; local: number; tam: number }) => {
      if (b.local < 0) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, b.b);
      gl.enableVertexAttribArray(b.local);
      gl.vertexAttribPointer(b.local, b.tam, gl.FLOAT, false, 0, 0);
    };

    function desenhar(agora: number) {
      quadroAnim = 0;
      const dt = antes ? Math.min(100, agora - antes) : 16;
      antes = agora;
      let alvoP = progressoDaRolagem();
      if (auto >= 0) alvoP = Math.min(1, (agora - auto) / 1600);

      if (fechou < 0) {
        mostrado += (alvoP - mostrado) * (1 - Math.exp(-dt / 120));
        if (Math.abs(alvoP - mostrado) < 0.0005) mostrado = alvoP;
        if (mostrado >= 0.992) {
          mostrado = 1;
          fechou = agora;
          acender();
        }
      }
      const burst = fechou < 0 ? -1 : (agora - fechou) / 1000;

      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);

      gl!.useProgram(pp);
      gl!.uniform1f(up("uProg"), mostrado);
      gl!.uniform1f(up("uBurst"), burst);
      gl!.uniform1f(up("uTime"), (agora - t0) / 1000);
      // O mapa flutua na parte do quadro que já está na tela: aparece
      // inteiro mesmo com metade do quadro ainda abaixo da dobra.
      const r = quadro!.getBoundingClientRect();
      const visivelAte = Math.max(0, Math.min(h, window.innerHeight - r.top));
      const meiaAltura = (MAPA_ALTURA * escalaMapa) / 2;
      const topoLivre = largo ? 64 : 20;
      const centroY = Math.max(topoLivre + meiaAltura, Math.min(h - meiaAltura - 24, visivelAte / 2 + topoLivre / 2));
      gl!.uniform3f(up("uMapa"), centroX, centroY, escalaMapa);
      for (const b of bufs) ligar(b);
      gl!.drawArrays(gl!.POINTS, 0, n);
      for (const b of bufs) if (b.local >= 0) gl!.disableVertexAttribArray(b.local);

      if (burst >= 0 && burst < 1.6) {
        gl!.useProgram(pc);
        gl!.uniform1f(uc("uBurst"), burst);
        ligar(bufQuad);
        gl!.drawArrays(gl!.TRIANGLES, 0, 3);
        gl!.disableVertexAttribArray(bufQuad.local);
      }

      // Depois do fechamento assentado, para: o último quadro fica na tela.
      if (burst >= 1.6) return;
      if (visivel || burst >= 0) quadroAnim = requestAnimationFrame(desenhar);
    }

    medir();
    const ro = new ResizeObserver(() => {
      medir();
    });
    ro.observe(quadro);

    const io = new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
      if (visivel && !quadroAnim) {
        antes = 0;
        quadroAnim = requestAnimationFrame(desenhar);
      }
    });
    io.observe(quadro);

    return () => {
      io.disconnect();
      ro.disconnect();
      if (quadroAnim) cancelAnimationFrame(quadroAnim);
    };
    // Monta uma vez por quadro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={tela}
      aria-hidden
      className="pointer-events-none absolute z-10"
      style={{ left: -PAD, top: -PAD }}
    />
  );
}
