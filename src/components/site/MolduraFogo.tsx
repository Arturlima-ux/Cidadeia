"use client";

import { useEffect, useRef } from "react";

// ── O FÓSFORO NO RASTRO DE ÁLCOOL ──
//
// O quadro de proposta chega apagado. Quando ele entra na tela, alguém risca
// um fósforo no meio da borda de cima: uma faísca, e o fogo se divide em
// dois, um para cada lado. Os dois rastros descem pela moldura (acelerando,
// como álcool pegando) e se encontram no meio da borda de baixo. No
// encontro, a luz estoura: clarão, onda de choque, faíscas, e o quadro
// acende de baixo para cima (o resto é CSS, em [data-aceso]).
//
// Tudo é desenhado num canvas por cima da moldura, durante ~2,4 s, e o
// canvas some depois. Fora isso, zero custo: nada fica rodando.
//
// As cores vêm dos tokens do tema (--brand, --accent, --accent-claro),
// lidas na hora. Fogo violeta, porque o CidadeIA é violeta.

const PAD = 70; // folga em volta da moldura para o brilho e as faíscas
const RAIO = 28; // o rounded-[28px] do quadro

const T_FOSFORO = 220; // ms: a faísca do fósforo antes de o rastro andar
const T_CORRIDA = 1050; // ms: do topo até o encontro embaixo
const T_ESTOURO = 1100; // ms: clarão, onda e faíscas depois do encontro

type Rgb = [number, number, number];

function lerCor(nome: string, reserva: Rgb): Rgb {
  const v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  const hex = v.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = v.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    const [r, g, b] = rgb[1].split(",").map((x) => parseFloat(x));
    if ([r, g, b].every((x) => Number.isFinite(x))) return [r, g, b];
  }
  return reserva;
}

const rgba = (c: Rgb, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`;

/** Ponto da metade direita do perímetro, a `s` px do meio da borda de cima, no sentido horário. */
function pontoNaMoldura(s: number, w: number, h: number, r: number) {
  const q = (Math.PI * r) / 2;
  const trechos = [w / 2 - r, q, h - 2 * r, q, w / 2 - r];
  let resto = s;
  // topo, do meio até o canto
  if (resto <= trechos[0]) return { x: w / 2 + resto, y: 0, nx: 0, ny: -1 };
  resto -= trechos[0];
  if (resto <= trechos[1]) {
    const a = -Math.PI / 2 + resto / r;
    return { x: w - r + r * Math.cos(a), y: r + r * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) };
  }
  resto -= trechos[1];
  if (resto <= trechos[2]) return { x: w, y: r + resto, nx: 1, ny: 0 };
  resto -= trechos[2];
  if (resto <= trechos[3]) {
    const a = resto / r;
    return { x: w - r + r * Math.cos(a), y: h - r + r * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) };
  }
  resto -= trechos[3];
  return { x: Math.max(w / 2, w - r - resto), y: h, nx: 0, ny: 1 };
}

type Lingua = { x: number; y: number; nx: number; ny: number; nasceu: number; semente: number };
type Faisca = { x: number; y: number; vx: number; vy: number; nasceu: number; vida: number; tam: number; quente: boolean };

export default function MolduraFogo({
  alvo,
  onEncontro,
  onFim,
}: {
  /** O quadro cuja moldura pega fogo. */
  alvo: React.RefObject<HTMLDivElement | null>;
  /** Chamado no instante em que os dois rastros se encontram. */
  onEncontro: () => void;
  /** Chamado quando o último brilho apaga (o canvas pode sair). */
  onFim: () => void;
}) {
  const tela = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const quadro = alvo.current;
    const canvas = tela.current;
    if (!quadro || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      onEncontro();
      onFim();
      return;
    }

    const w = quadro.offsetWidth;
    const h = quadro.offsetHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = (w + PAD * 2) * dpr;
    canvas.height = (h + PAD * 2) * dpr;
    canvas.style.width = `${w + PAD * 2}px`;
    canvas.style.height = `${h + PAD * 2}px`;
    ctx.scale(dpr, dpr);
    ctx.translate(PAD, PAD);

    const brand = lerCor("--brand", [124, 92, 255]);
    const accent = lerCor("--accent", [166, 143, 255]);
    const claro = lerCor("--accent-claro", [203, 188, 255]);
    const branco: Rgb = [255, 255, 255];

    const r = RAIO;
    const metade = w - 2 * r + h - 2 * r + Math.PI * r; // meio perímetro
    const linguas: Lingua[] = [];
    const faiscas: Faisca[] = [];
    let percorrido = 0; // px já queimados em cada lado
    let encontrou = false;
    let inicio = 0;
    let quadroAnim = 0;

    const lados = (s: number) => {
      const p = pontoNaMoldura(s, w, h, r);
      return [p, { x: w - p.x, y: p.y, nx: -p.nx, ny: p.ny }];
    };

    const soltarFaiscas = (x: number, y: number, n: number, forca: number, agora: number, dirX = 0, dirY = 0) => {
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const v = (0.25 + Math.random()) * forca;
        faiscas.push({
          x,
          y,
          vx: Math.cos(ang) * v + dirX * forca * 0.8,
          vy: Math.sin(ang) * v + dirY * forca * 0.8 - forca * 0.3,
          nasceu: agora,
          vida: 380 + Math.random() * 620,
          tam: 0.6 + Math.random() * 1.6,
          quente: Math.random() < 0.35,
        });
      }
    };

    const brilho = (x: number, y: number, raio: number, cor: Rgb, a: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, raio);
      g.addColorStop(0, rgba(branco, a));
      g.addColorStop(0.25, rgba(claro, a * 0.85));
      g.addColorStop(0.6, rgba(cor, a * 0.35));
      g.addColorStop(1, rgba(cor, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, raio, 0, Math.PI * 2);
      ctx.fill();
    };

    const passo = (agora: number) => {
      if (!inicio) inicio = agora;
      const t = agora - inicio;
      ctx.clearRect(-PAD, -PAD, w + PAD * 2, h + PAD * 2);
      ctx.globalCompositeOperation = "lighter";

      // ── 1. o fósforo ──
      if (t < T_FOSFORO) {
        const k = t / T_FOSFORO;
        brilho(w / 2, 0, 10 + 26 * k, accent, 0.5 + 0.5 * Math.random());
        if (Math.random() < 0.8) soltarFaiscas(w / 2, 0, 3, 2.2, agora, 0, -1);
      }

      // ── 2. os dois rastros ──
      const tc = Math.max(0, Math.min(1, (t - T_FOSFORO) / T_CORRIDA));
      // Álcool pega devagar e acelera.
      const alvoS = metade * (0.55 * tc * tc + 0.45 * tc);
      while (percorrido < alvoS) {
        percorrido = Math.min(alvoS, percorrido + 9);
        for (const p of lados(percorrido)) {
          linguas.push({ ...p, nasceu: agora, semente: Math.random() * 1000 });
        }
      }

      // apaga devagar depois do encontro: a moldura do CSS assume
      const apagar = encontrou ? Math.max(0, 1 - (t - T_FOSFORO - T_CORRIDA) / 700) : 1;

      if (percorrido > 0) {
        // o rastro queimado: linha fina e um halo largo
        for (const lado of [0, 1]) {
          ctx.beginPath();
          for (let s = 0; s <= percorrido; s += 6) {
            const p = lados(Math.min(s, percorrido))[lado];
            if (s === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          const fim = lados(percorrido)[lado];
          ctx.lineTo(fim.x, fim.y);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = rgba(brand, 0.22 * apagar);
          ctx.lineWidth = 9;
          ctx.stroke();
          ctx.strokeStyle = rgba(accent, 0.75 * apagar);
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
      }

      // as línguas de fogo: nascem onde o rastro passa e somem em ~0,7 s,
      // subindo (fogo sobe) e para fora da moldura
      for (let i = linguas.length - 1; i >= 0; i--) {
        const l = linguas[i];
        const idade = agora - l.nasceu;
        const vida = 1 - idade / 720;
        if (vida <= 0) {
          linguas.splice(i, 1);
          continue;
        }
        const tremor = 0.6 + 0.4 * Math.sin(agora / 38 + l.semente);
        const alt = (3 + (l.semente % 8)) * vida * tremor * apagar + 1;
        const dx = l.nx * 0.55 + (Math.sin(agora / 90 + l.semente) * 0.25);
        const dy = l.ny * 0.55 - 0.75;
        const norm = Math.hypot(dx, dy) || 1;
        // Chama como brasa macia, não como traço: um ponto de luz que
        // tremula e sobe um pouco. Traço reto parecia pelo.
        const cx = l.x + (dx / norm) * alt * 0.6;
        const cy = l.y + (dy / norm) * alt * 0.6;
        const raio = (2 + alt * 0.5) * (0.6 + 0.4 * vida);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, raio);
        g.addColorStop(0, rgba(vida > 0.6 ? claro : accent, 0.5 * vida * apagar));
        g.addColorStop(1, rgba(brand, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, raio, 0, Math.PI * 2);
        ctx.fill();
      }

      // as duas cabeças de fogo
      if (percorrido > 0 && !encontrou) {
        for (const p of lados(percorrido)) {
          const pisca = 0.75 + 0.25 * Math.random();
          brilho(p.x, p.y, 34 * pisca, brand, 0.55);
          brilho(p.x, p.y, 12 * pisca, accent, 1);
          if (Math.random() < 0.9) soltarFaiscas(p.x, p.y, 2, 1.6, agora, p.nx, p.ny);
        }
      }

      // ── 3. o encontro ──
      if (!encontrou && tc >= 1) {
        encontrou = true;
        soltarFaiscas(w / 2, h, 90, 6.5, agora, 0, -0.6);
        onEncontro();
      }
      const te = t - T_FOSFORO - T_CORRIDA;
      if (encontrou && te < T_ESTOURO) {
        const k = te / T_ESTOURO;
        const sai = 1 - k;
        // clarão
        brilho(w / 2, h, 40 + 260 * Math.pow(k, 0.5), brand, 0.9 * sai * sai);
        brilho(w / 2, h, 18 + 40 * k, accent, sai);
        // onda de choque: duas elipses que abrem (achatadas pela moldura)
        for (const [atraso, cor, larg] of [
          [0, claro, 2.5],
          [0.12, brand, 6],
        ] as [number, Rgb, number][]) {
          const kk = Math.max(0, (k - atraso) / (1 - atraso));
          if (kk <= 0) continue;
          const rx = 20 + kk * w * 0.75;
          ctx.strokeStyle = rgba(cor, 0.8 * (1 - kk));
          ctx.lineWidth = larg * (1 - kk) + 0.5;
          ctx.beginPath();
          ctx.ellipse(w / 2, h, rx, rx * 0.42, 0, Math.PI, Math.PI * 2);
          ctx.stroke();
        }
        // a luz corre de volta pela moldura, dos dois lados, até o topo
        const volta = metade * (1 - Math.pow(1 - Math.min(1, k * 1.6), 3));
        for (const lado of [0, 1]) {
          const p = lados(metade - volta)[lado];
          brilho(p.x, p.y, 22, accent, 0.9 * (1 - Math.min(1, k * 1.6)) + 0.05);
        }
      }

      // ── faíscas ──
      for (let i = faiscas.length - 1; i >= 0; i--) {
        const f = faiscas[i];
        const idade = agora - f.nasceu;
        const vida = 1 - idade / f.vida;
        if (vida <= 0) {
          faiscas.splice(i, 1);
          continue;
        }
        f.vx *= 0.965;
        f.vy = f.vy * 0.965 - 0.035; // sobe, como brasa
        f.x += f.vx;
        f.y += f.vy;
        ctx.fillStyle = rgba(f.quente ? branco : claro, vida);
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.tam * (0.5 + vida * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";

      const acabou = encontrou && te >= T_ESTOURO && faiscas.length === 0 && linguas.length === 0;
      if (acabou) {
        onFim();
        return;
      }
      quadroAnim = requestAnimationFrame(passo);
    };

    quadroAnim = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadroAnim);
    // Roda uma vez por montagem: o pai monta este componente só na hora de acender.
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
