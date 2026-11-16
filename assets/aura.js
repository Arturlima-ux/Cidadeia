// "Aura" do prato: arte generativa com as cores dos ingredientes.
// Ocupa o lugar da foto até a casa enviar fotos/vídeos reais. Não imita comida.

let grao = null;
function textura() {
  if (grao) return grao;
  const c = document.createElement("canvas"); c.width = c.height = 160;
  const x = c.getContext("2d"), d = x.createImageData(160, 160);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 22; }
  x.putImageData(d, 0, 0); grao = c; return c;
}
const hash = s => [...s].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }

const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
const vivas = new Set();
let loop = null;
function tick(t) { vivas.forEach(f => f(t)); loop = vivas.size ? requestAnimationFrame(tick) : null; }

export function aura(canvas, cores, chave, { animar = true, base = "#140C0B" } = {}) {
  const ctx = canvas.getContext("2d");
  const r = rng(hash(chave));
  const blobs = Array.from({ length: 7 }, (_, i) => ({
    cor: cores[i % cores.length], x: r(), y: r(), raio: .35 + r() * .45,
    vx: (r() - .5) * .00006, vy: (r() - .5) * .00006, fase: r() * 6.28,
  }));
  function desenhar(t = 0) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "screen";
    const m = Math.max(w, h);
    for (const b of blobs) {
      const x = (b.x + Math.sin(t * b.vx * 40 + b.fase) * .12) * w;
      const y = (b.y + Math.cos(t * b.vy * 40 + b.fase) * .12) * h;
      const g = ctx.createRadialGradient(x, y, 0, x, y, b.raio * m);
      g.addColorStop(0, b.cor + "CC"); g.addColorStop(.45, b.cor + "55"); g.addColorStop(1, b.cor + "00");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    ctx.globalCompositeOperation = "multiply";
    const v = ctx.createRadialGradient(w / 2, h * .45, m * .2, w / 2, h / 2, m * .8);
    v.addColorStop(0, "#ffffff"); v.addColorStop(1, "#85716b");
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = ctx.createPattern(textura(), "repeat"); ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  }
  desenhar(0);
  if (!animar || reduz) return { parar() {}, redesenhar: () => desenhar(0) };
  const f = t => desenhar(t);
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { vivas.add(f); loop ??= requestAnimationFrame(tick); } else vivas.delete(f); });
  io.observe(canvas);
  return { parar() { vivas.delete(f); io.disconnect(); }, redesenhar: () => desenhar(0) };
}

// Pinta todos os <canvas data-aura="id"> dentro de um elemento.
export function pintar(raiz, porId, opts) {
  raiz.querySelectorAll("canvas[data-aura]").forEach(c => {
    if (c._aura) return;
    const it = porId(c.dataset.aura);
    if (it) c._aura = aura(c, it.aura, it.id, opts);
  });
}
