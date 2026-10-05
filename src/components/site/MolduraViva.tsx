"use client";

import { useEffect, useRef } from "react";

// ── A MOLDURA QUE PEGA FOGO, PRESA À ROLAGEM ──
//
// O quadro de proposta chega apagado. O fogo é a ROLAGEM: quando a borda de
// cima do quadro entra na tela, um fósforo risca no meio dela; conforme a
// pessoa desce, o fogo se divide e corre pela moldura, um rastro para cada
// lado, como álcool pegando. Se ela sobe, o fogo recua. No instante em que o
// quadro inteiro cabe na tela, os dois rastros se encontram no meio da borda
// de baixo, e aí acontece o que não volta: clarão, onda de choque, chuva de
// faíscas, uma onda de luz que sobe de volta pela moldura, e o quadro acende
// (data-aceso, no CSS).
//
// ── POR QUE SHADER ──
//
// O fogo não é desenho de traço nem sprite: é um campo calculado por pixel,
// na GPU, a cada quadro. A moldura é uma função de distância (SDF) de
// retângulo arredondado; cada pixel sabe a que distância está da borda e em
// que ponto do perímetro cai, e o fogo é ruído fractal (fbm) subindo no
// tempo, só no trecho já queimado. Atrás da cabeça o álcool vai baixando
// até virar brasa, e a luz vaza para dentro do quadro conforme queima.
//
// ── CUSTO ──
//
// Um triângulo, um shader, e o laço só roda enquanto o quadro está na tela
// e ainda não acabou. Depois do estouro o canvas some da página: nada fica
// rodando. Progresso amortecido (não salta com a roda do mouse), e quem
// chega com o quadro já inteiro na tela (link para #proposta) vê o fogo
// correr sozinho. Sem WebGL, ou com "reduzir movimento", o quadro só acende.

const PAD = 60; // folga em volta da moldura: chamas, clarão e faíscas
const RAIO = 28; // rounded-[28px]

const VERT = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uCanvas;   // canvas em px CSS
uniform float uDpr;
uniform float uPad;
uniform vec2 uSize;     // quadro em px CSS
uniform float uR;
uniform float uProg;    // 0..1 do meio perímetro queimado
uniform float uTime;
uniform float uBurst;   // s desde o encontro; < 0 antes
uniform float uFade;    // 1..0 no fim
uniform vec3 uBrand;
uniform vec3 uAccent;
uniform vec3 uClaro;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return v;
}

// Temperatura -> cor. Fogo violeta: brasa da marca, chama clara, núcleo branco.
vec3 rampa(float t) {
  vec3 c = mix(vec3(0.0), uBrand * 0.9, smoothstep(0.0, 0.35, t));
  c = mix(c, uAccent, smoothstep(0.3, 0.65, t));
  c = mix(c, uClaro, smoothstep(0.6, 0.85, t));
  c = mix(c, vec3(1.0), smoothstep(0.85, 1.0, t));
  return c;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uCanvas.y * uDpr - gl_FragCoord.y) / uDpr; // y para baixo
  vec2 hs = uSize * 0.5;
  vec2 l = px - uPad - hs;           // relativo ao centro do quadro
  float r = uR;

  // distância com sinal à borda (fora > 0)
  vec2 q = abs(l) - hs + r;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;

  // ── corte cedo: o que está longe da borda não paga o ruído ──
  // Antes do encontro, só a faixa da moldura tem fogo. Fora dela, nada; no
  // miolo, só a luz que vaza (barata). É isto que mantém 60 fps.
  if (uBurst < 0.0) {
    if (uProg < 0.002 || d > 26.0) { gl_FragColor = vec4(0.0); return; }
  }

  // posição no perímetro, a partir do meio da borda de cima (simétrico)
  float ax = abs(l.x), y = l.y;
  float arco = 1.5707963 * r;
  float lado = uSize.y - 2.0 * r;
  float s;
  if (ax > hs.x - r && y < -hs.y + r) {
    float a = atan(y - (-hs.y + r), ax - (hs.x - r));
    s = (hs.x - r) + (a + 1.5707963) * r;
  } else if (ax > hs.x - r && y > hs.y - r) {
    float a = atan(y - (hs.y - r), ax - (hs.x - r));
    s = (hs.x - r) + arco + lado + a * r;
  } else {
    float dt = abs(y + hs.y), dr = abs(hs.x - ax), db = abs(hs.y - y);
    if (dt <= dr && dt <= db) s = ax;
    else if (dr <= db) s = (hs.x - r) + arco + (y - (-hs.y + r));
    else s = (hs.x - r) + arco + lado + arco + ((hs.x - r) - ax);
  }
  float metade = uSize.x - 2.0 * r + lado + 3.14159265 * r;
  float S = uProg * metade;                     // onde está a cabeça
  float queimado = smoothstep(S + 3.0, S - 10.0, s);
  float idade = max(S - s, 0.0);                // px atrás da cabeça
  float vigor = 0.22 + 0.78 * exp(-idade / 240.0);
  float acabou = uBurst >= 0.0 ? 1.0 : 0.0;
  if (acabou > 0.5) vigor = mix(vigor, 0.35, clamp(uBurst * 1.5, 0.0, 1.0));

  // Miolo do quadro antes do encontro: só a luz que vaza, sem ruído.
  if (acabou < 0.5 && d < -22.0) {
    vec3 luz = uBrand * queimado * exp(d / 60.0) * 0.10 * vigor * uFade;
    gl_FragColor = vec4(luz, max(luz.r, max(luz.g, luz.b)));
    return;
  }

  float t = uTime;
  vec3 col = vec3(0.0);
  float calor = 0.0;

  // ── chamas ── ruído subindo; mais altas perto da cabeça
  float e = d;                                  // fora > 0
  float n = fbm(vec2(s * 0.035, e * 0.06 - t * 2.6));
  float n2 = fbm(vec2(s * 0.09 + 40.0, e * 0.12 - t * 4.1));
  // Chamas rentes à borda: o quadro não pode parecer maior do que é.
  float alt = (3.0 + 13.0 * n * n + 4.0 * n2) * vigor;
  float corpo = smoothstep(alt, 0.0, e) * smoothstep(-3.0, 0.5, e);
  float chama = corpo * pow(n * 0.6 + n2 * 0.6, 1.6) * 1.25;
  float fio = exp(-abs(e) / 1.3);               // a linha acesa da moldura
  calor += queimado * (chama + fio * (0.4 + 0.35 * vigor));

  // cabeça: núcleo quente, com tremor
  float dh = s - S;
  float cabeca = exp(-dh * dh / (2.0 * 12.0 * 12.0)) * exp(-abs(e) / (3.0 + 3.0 * n));
  calor += (1.0 - acabou) * step(0.002, uProg) * cabeca * (1.4 + 0.4 * sin(t * 40.0 + s));

  // luz que vaza para dentro do quadro pelo trecho queimado
  float dentro = step(e, 0.0) * exp(e / 60.0);
  col += uBrand * queimado * dentro * 0.10 * vigor;

  // ── o encontro ──
  if (acabou > 0.5) {
    float tb = uBurst;
    vec2 B = l - vec2(0.0, hs.y);               // relativo ao ponto do encontro
    float fl = exp(-length(B) / (40.0 + 380.0 * tb)) * exp(-tb * 2.6);
    calor += fl * 2.2;
    // duas ondas de choque, achatadas
    for (int k = 0; k < 2; k++) {
      float tk = tb - float(k) * 0.12;
      if (tk > 0.0) {
        float rr = tk * (1100.0 - float(k) * 300.0);
        float le = length(B * vec2(1.0, 2.1));
        float largura = 4.0 + tk * 26.0;
        float onda = exp(-pow((le - rr) / largura, 2.0)) * exp(-tk * 2.2);
        col += mix(uClaro, uBrand, float(k)) * onda * (0.9 - 0.4 * float(k));
      }
    }
    // a luz volta pela moldura, do encontro até o topo
    float sv = metade - tb * 1500.0;
    float volta = exp(-pow((s - sv) / 46.0, 2.0)) * exp(-abs(e) / 5.0) * step(0.0, sv + 40.0);
    calor += volta * 1.6;
    // chuva de faíscas
    // Faíscas só onde podem estar: pixel fora do alcance pula o laço.
    if (tb < 1.5 && length(B) < 60.0 + 1000.0 * tb) for (int i = 0; i < 40; i++) {
      float fi = float(i);
      float ang = 3.14159 + hash(vec2(fi, 1.3)) * 3.14159;      // meia-lua de cima
      float v = 260.0 + 820.0 * hash(vec2(fi, 7.1));
      float vida = 0.6 + 0.9 * hash(vec2(fi, 3.7));
      if (tb < vida) {
        vec2 p = vec2(cos(ang), sin(ang) * 0.85) * v * tb;
        p.y += 520.0 * tb * tb;                                 // caem
        p *= 1.0 - 0.25 * tb;
        float dd = length(B - p);
        float tam = 1.1 + 1.3 * hash(vec2(fi, 9.9));
        float a = (1.0 - tb / vida);
        col += mix(uClaro, vec3(1.0), hash(vec2(fi, 4.4))) * exp(-dd * dd / (tam * tam)) * a * 1.6;
      }
    }
  } else if (abs(s - S) < 90.0) {
    // faíscas soltando das duas cabeças enquanto corre
    for (int i = 0; i < 18; i++) {
      float fi = float(i);
      float fase = fract(t * 1.4 + fi / 18.0);
      float semente = floor(t * 1.4 + fi / 18.0) + fi * 13.0;
      // a cabeça muda de lugar; a faísca nasce onde ela estava
      vec2 dir = vec2(hash(vec2(semente, 2.0)) - 0.5, -0.4 - hash(vec2(semente, 5.0)));
      float desvio = (hash(vec2(semente, 8.0)) - 0.5) * 30.0;
      float sp = S - fase * 30.0 + desvio;
      // compara pela coordenada de perímetro e distância: barato e simétrico
      vec2 off = dir * fase * 55.0;
      float dd = length(vec2(s - sp, e + off.y * 0.6 - abs(off.x) * 0.3));
      col += uClaro * exp(-dd * dd / 2.2) * (1.0 - fase) * 0.9;
    }
  }

  col += rampa(clamp(calor * 0.85, 0.0, 1.0)) * clamp(calor, 0.0, 1.3);
  col *= uFade;
  float a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  gl_FragColor = vec4(col, a);
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

function compilar(gl: WebGLRenderingContext, tipo: number, fonte: string) {
  const sh = gl.createShader(tipo)!;
  gl.shaderSource(sh, fonte);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? "shader");
  return sh;
}

export default function MolduraViva({
  alvo,
  onAceso,
  onFim,
}: {
  alvo: React.RefObject<HTMLDivElement | null>;
  /** No instante em que os dois rastros se encontram. */
  onAceso: () => void;
  /** Quando o último brilho apaga e o canvas pode sair. */
  onFim: () => void;
}) {
  const tela = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const quadro = alvo.current;
    const canvas = tela.current;
    if (!quadro || !canvas) return;

    // Progresso pela rolagem: 0 quando a borda de cima entra por baixo da
    // tela, 1 quando a borda de baixo entra (o quadro inteiro visível).
    const alvoDaRolagem = () => {
      const r = quadro.getBoundingClientRect();
      const vh = window.innerHeight;
      // Quadro mais alto que a tela (celular): não cabe inteiro, então o
      // encontro acontece quando o topo dele chega perto do topo da tela.
      const curso = r.height >= vh * 0.85 ? vh * 0.85 : r.height;
      return Math.min(1, Math.max(0, (vh - r.top) / curso));
    };

    const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl = semMovimento
      ? null
      : (canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false, alpha: true }) as WebGLRenderingContext | null);

    // ── sem fogo: acende quando o quadro inteiro estiver na tela ──
    if (!gl) {
      const conferir = () => {
        if (alvoDaRolagem() >= 0.98) {
          window.removeEventListener("scroll", conferir);
          onAceso();
          onFim();
        }
      };
      window.addEventListener("scroll", conferir, { passive: true });
      conferir();
      return () => window.removeEventListener("scroll", conferir);
    }

    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compilar(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compilar(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
    } catch {
      onAceso();
      onFim();
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = {
      canvas: u("uCanvas"), dpr: u("uDpr"), pad: u("uPad"), size: u("uSize"), r: u("uR"),
      prog: u("uProg"), time: u("uTime"), burst: u("uBurst"), fade: u("uFade"),
      brand: u("uBrand"), accent: u("uAccent"), claro: u("uClaro"),
    };
    gl.uniform3fv(U.brand, lerCor("--brand", [0.49, 0.36, 1]));
    gl.uniform3fv(U.accent, lerCor("--accent", [0.65, 0.56, 1]));
    gl.uniform3fv(U.claro, lerCor("--accent-claro", [0.8, 0.74, 1]));

    let w = 0, h = 0, dpr = 1;
    const medir = () => {
      w = quadro.offsetWidth;
      h = quadro.offsetHeight;
      // Fogo é borrado por natureza: desenha com metade da resolução de
      // tela comum (nunca retina) e o navegador amplia. Junto com o corte
      // cedo no shader, foi de 3 para 20 fps em GPU emulada (60 sem o efeito).
      dpr = 0.5;
      const cw = w + PAD * 2, ch = h + PAD * 2;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U.canvas, cw, ch);
      gl.uniform1f(U.dpr, canvas.width / cw);
      gl.uniform1f(U.pad, PAD);
      gl.uniform2f(U.size, w, h);
      gl.uniform1f(U.r, RAIO);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(quadro);

    let visivel = false;
    let quadroAnim = 0;
    let mostrado = 0; // progresso desenhado, amortecido
    let encontro = -1; // ms do encontro
    let auto = -1; // ms em que o fogo começou a correr sozinho
    const t0 = performance.now();

    // Chegou com o quadro já inteiro na tela: o fogo corre sozinho.
    if (alvoDaRolagem() >= 0.98) auto = t0;

    let antes = 0;
    const desenhar = (agora: number) => {
      quadroAnim = 0;
      // Amortecimento por tempo, não por quadro: a 30 ou a 120 fps o fogo
      // anda igual, e num aparelho fraco não fica para trás da rolagem.
      const dt = antes ? Math.min(100, agora - antes) : 16;
      antes = agora;
      const tempo = (agora - t0) / 1000;
      let alvoP = alvoDaRolagem();
      if (auto >= 0) alvoP = Math.min(1, (agora - auto) / 1400);

      if (encontro < 0) {
        mostrado += (alvoP - mostrado) * (1 - Math.exp(-dt / 110));
        if (Math.abs(alvoP - mostrado) < 0.0005) mostrado = alvoP;
        if (mostrado >= 0.985) {
          mostrado = 1;
          encontro = agora;
          onAceso();
        }
      }
      const burst = encontro < 0 ? -1 : (agora - encontro) / 1000;
      const fade = burst < 1.3 ? 1 : Math.max(0, 1 - (burst - 1.3) / 0.7);

      gl.uniform1f(U.prog, mostrado);
      gl.uniform1f(U.time, tempo);
      gl.uniform1f(U.burst, burst);
      gl.uniform1f(U.fade, fade);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (mostrado > 0.0005 || burst >= 0) gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (burst >= 0 && fade <= 0) {
        onFim();
        return;
      }
      if (visivel || burst >= 0) quadroAnim = requestAnimationFrame(desenhar);
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visivel = e.isIntersecting;
        if (visivel && !quadroAnim) {
          antes = 0;
          quadroAnim = requestAnimationFrame(desenhar);
        }
      },
      { rootMargin: "0px 0px 0px 0px" }
    );
    io.observe(quadro);

    return () => {
      io.disconnect();
      ro.disconnect();
      if (quadroAnim) cancelAnimationFrame(quadroAnim);
      // Sem loseContext aqui: o efeito pode montar de novo no mesmo canvas
      // (modo estrito do React) e o contexto perdido não volta. O canvas sai
      // da página no fim e o navegador libera a GPU com ele.
    };
    // Monta uma vez; o pai desmonta quando acaba.
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
