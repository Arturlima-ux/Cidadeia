// ── O BRASIL ESCULPIDO EM GRAFITE (a cena 3D do topo) ──
//
// Aprovado pelo fundador em nov/2026, a partir do protótipo "Brasil 3D do
// CidadeIA" (referência: um globo de grafite com luzes acesas). Este arquivo
// só é carregado depois do load (BrasilRelevo.tsx, import dinâmico): o
// three.js não entra no primeiro pacote da página.
//
// - Relevo: topografia da NASA (Blue Marble, dados GEBCO, domínio público)
//   recortada pelo contorno oficial (lib/contorno-brasil.ts), em três níveis
//   de nitidez em public/mapa/relevo: o aparelho baixa só o que consegue
//   mostrar (celular 1024 px, notebook 2048, tela grande 4096). Abre com o
//   nível leve e troca pelo nítido quando ele chega.
// - Entrada "contorno de luz" (escolhida pelo fundador entre três, no
//   protótipo "Entradas do mapa", nov/2026): uma fita acesa corre pela
//   fronteira a partir do litoral do Nordeste em 1,9 s, quase em velocidade
//   constante (com 1,2 s e aceleração forte no meio, o fundador achou rápida;
//   antes, lenta); de dentro dela, já aos 0,5 s, o país sobe, o relevo cresce
//   de quase plano e o detalhe da superfície nasce junto; a fita apaga; a
//   partir de 1,5 s as capitais
//   acendem numa onda que sai de Brasília, cada uma com um brilho forte na
//   primeira vez. Nada pesado acontece no meio: shaders compilados e texturas
//   já na placa de vídeo antes do primeiro quadro (o fundador viu uma trava
//   quando o país aparecia, que era a textura subindo na hora), e a textura
//   nítida, se chegar durante a entrada, espera ela acabar.
// - Luzes: as 27 capitais (lib/capitais-mapa.ts), sempre do mesmo tamanho,
//   acendendo e apagando cada uma no seu tempo; acendem numa onda que sai de
//   Brasília.
// - Visitante: um ponto azul (o azul de localização do site), com feixe e
//   ondas no chão, na cidade aproximada pela conexão (/api/onde-estou). Só o
//   próprio visitante vê o seu ponto; nada é gravado.
// - Parado (modo leve ou movimento reduzido): um quadro só, desenhado de novo
//   apenas quando algo muda (textura nítida, tamanho, visitante).
// - Cores: todas lidas dos tokens do tema noite (globals.css), nunca escritas
//   aqui (tests/design-system.test.ts).

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { aneisDoContorno } from "@/lib/contorno-brasil";
import { CAPITAIS_NO_MAPA } from "@/lib/capitais-mapa";

export type Nivel = "baixa" | "media" | "alta";
export type CenaBrasil = {
  definirVisitante: (local: { lat: number; lng: number } | null) => void;
  parar: () => void;
  destruir: () => void;
};

const NIVEIS: Record<Nivel, { malha: number; dpr: number }> = {
  baixa: { malha: 300, dpr: 1.5 },
  media: { malha: 540, dpr: 2 },
  alta: { malha: 800, dpr: 2 },
};
const PASTA = "/mapa/relevo";
const ESCALA = 85; // exagero do relevo, em unidades do mapa (1000 de largura)
const BASE = 2;
const ALT_FEIXE = 50;

/** O nível de nitidez que este aparelho aguenta mostrar. */
export function escolherNivel(ladoCss: number, leve: boolean, maxTextura: number): Nivel {
  if (leve) return "baixa";
  const lado = ladoCss * Math.min(window.devicePixelRatio || 1, 2);
  const memoria = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (lado > 2600 && maxTextura >= 4096 && memoria >= 8) return "alta";
  if (lado > 1100 && memoria >= 4) return "media";
  return "baixa";
}

async function imagem(src: string): Promise<HTMLImageElement> {
  const i = new Image();
  i.decoding = "async";
  i.src = src;
  await i.decode();
  return i;
}

export async function montarBrasil(o: {
  palco: HTMLElement;
  tela: HTMLCanvasElement;
  rotulo: HTMLElement;
  parado: () => boolean;
  aoPronto: () => void;
}): Promise<CenaBrasil> {
  const { palco, tela, rotulo } = o;
  const estilo = getComputedStyle(palco);
  const cor = (token: string) => new THREE.Color(estilo.getPropertyValue(token).trim() || "white");
  // Os tons de teste (TonsDeTeste.tsx) trocam a cor das luzes do mapa sem
  // trocar o roxo dos botões: --relevo-* vale mais que o token da marca.
  const corOu = (token: string, reserva: string) => cor(estilo.getPropertyValue(token).trim() ? token : reserva);
  const numero = (token: string, padrao: number) => {
    const v = parseFloat(estilo.getPropertyValue(token));
    return Number.isFinite(v) ? v : padrao;
  };
  const escalaHalo = numero("--relevo-halo", 1);
  const forcaSopro = numero("--relevo-sopro", 1);
  const rgba = (c: THREE.Color, a: number) => {
    const s = c.clone().convertLinearToSRGB();
    return `rgba(${Math.round(s.r * 255)},${Math.round(s.g * 255)},${Math.round(s.b * 255)},${a})`;
  };
  const C = {
    parede: cor("--grafite-parede"),
    chao: cor("--grafite-chao"),
    fundo: cor("--background"),
    chave: cor("--luz-chave"),
    ceu: cor("--luz-ceu"),
    recorte: cor("--luz-recorte"),
    marca: corOu("--relevo-luz", "--brand"),
    marcaClara: corOu("--relevo-luz-clara", "--brand-claro"),
    branco: cor("--foreground"),
    local: cor("--localizacao"),
    localClara: cor("--localizacao-clara"),
  };

  const renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: true, powerPreference: "high-performance" });
  const nivel = escolherNivel(Math.max(palco.clientWidth, palco.clientHeight), o.parado(), renderer.capabilities.maxTextureSize);
  palco.dataset.nivel = nivel;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, o.parado() ? 1 : NIVEIS[nivel].dpr));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const cena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const ambiente = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  cena.environment = ambiente;
  cena.environmentIntensity = 0.3;
  const camera = new THREE.PerspectiveCamera(28, 1, 10, 9000);
  const brasil = new THREE.Group();
  cena.add(brasil);
  // O relevo e a espessura, num grupo que a entrada achata e estica (scale.y).
  const relevo = new THREE.Group();
  brasil.add(relevo);
  const descartaveis: { dispose: () => void }[] = [renderer, pmrem, ambiente];

  const textura = (img: HTMLImageElement, deCor: boolean) => {
    const t = new THREE.Texture(img);
    t.flipY = false;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (deCor) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    renderer.initTexture(t); // sobe para a placa de vídeo agora, e não no primeiro quadro que a usa
    descartaveis.push(t);
    return t;
  };
  const arquivos = (n: Nivel) => [`${PASTA}/cor-${n}.webp`, `${PASTA}/normal-${n}.webp`, `${PASTA}/mascara-${n}.webp`];
  const [imgAlt, ...leve] = await Promise.all([`${PASTA}/altura.png`, ...arquivos("baixa")].map(imagem));

  // ── A altura em 16 bits (R alto, G baixo); B é o contorno com folga ──
  const AW = imgAlt.naturalWidth, AH = imgAlt.naturalHeight;
  const ca = document.createElement("canvas");
  ca.width = AW; ca.height = AH;
  const cxa = ca.getContext("2d", { willReadFrequently: true })!;
  cxa.drawImage(imgAlt, 0, 0);
  const pa = cxa.getImageData(0, 0, AW, AH).data;
  const ler = (i: number, j: number, alt: boolean) => {
    const k = (j * AW + i) * 4;
    return alt ? (pa[k] * 256 + pa[k + 1]) / 65535 : pa[k + 2] / 255;
  };
  function amostra(u: number, v: number, alt: boolean) {
    const x = Math.min(AW - 1.001, Math.max(0, u * AW - 0.5)), y = Math.min(AH - 1.001, Math.max(0, v * AH - 0.5));
    const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
    return (ler(x0, y0, alt) * (1 - fx) + ler(x0 + 1, y0, alt) * fx) * (1 - fy) + (ler(x0, y0 + 1, alt) * (1 - fx) + ler(x0 + 1, y0 + 1, alt) * fx) * fy;
  }
  const alturaEm = (x: number, y: number) => BASE + amostra(x / 1000, y / 975, true) * ESCALA;
  const paraX = (x: number) => x - 500, paraZ = (y: number) => y - 487.5;

  // ── O relevo, na densidade do nível ──
  const matTerra = new THREE.MeshStandardMaterial({ roughness: 0.52, metalness: 0.32, normalScale: new THREE.Vector2(0.75, 0.75), alphaTest: 0.5 });
  descartaveis.push(matTerra);
  const aplicar = ([corImg, normal, mascara]: HTMLImageElement[]) => {
    matTerra.map?.dispose(); matTerra.normalMap?.dispose(); matTerra.alphaMap?.dispose();
    matTerra.map = textura(corImg, true);
    matTerra.normalMap = textura(normal, false);
    matTerra.alphaMap = textura(mascara, false);
    matTerra.needsUpdate = true;
  };
  aplicar(leve);
  {
    const GW = NIVEIS[nivel].malha, GH = Math.round(GW * 0.975);
    const pos = new Float32Array(GW * GH * 3), uv = new Float32Array(GW * GH * 2), dentro = new Float32Array(GW * GH);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const k = j * GW + i, u = i / (GW - 1), v = j / (GH - 1);
      pos[k * 3] = paraX(u * 1000); pos[k * 3 + 1] = BASE + amostra(u, v, true) * ESCALA; pos[k * 3 + 2] = paraZ(v * 975);
      uv[k * 2] = u; uv[k * 2 + 1] = v;
      dentro[k] = amostra(u, v, false);
    }
    const idx: number[] = [];
    for (let j = 0; j < GH - 1; j++) for (let i = 0; i < GW - 1; i++) {
      const a = j * GW + i, b = a + 1, c = a + GW, d = c + 1;
      if (Math.max(dentro[a], dentro[b], dentro[c], dentro[d]) < 0.05) continue;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    descartaveis.push(g);
    relevo.add(new THREE.Mesh(g, matTerra));
  }

  // ── A espessura: parede acetinada, normais suavizadas ──
  {
    const mat = new THREE.MeshStandardMaterial({ color: C.parede, roughness: 0.42, metalness: 0.5 });
    descartaveis.push(mat);
    for (const r of aneisDoContorno()) {
      if (r.length < 8) continue;
      const forma = new THREE.Shape(r.map(([x, y]) => new THREE.Vector2(paraX(x), -paraZ(y))));
      let g: THREE.BufferGeometry = new THREE.ExtrudeGeometry(forma, { depth: BASE + 20, bevelEnabled: true, bevelThickness: 1.6, bevelSize: 1.2, bevelSegments: 3, curveSegments: 1 });
      g.deleteAttribute("uv"); g.deleteAttribute("normal");
      g = mergeVertices(g, 0.01);
      g.computeVertexNormals();
      g.rotateX(-Math.PI / 2); g.translate(0, -21.6, 0);
      descartaveis.push(g);
      relevo.add(new THREE.Mesh(g, mat));
    }
  }

  // ── Chão: um brilho escuro, a sombra de contato e um sopro de roxo ──
  function mancha(paradas: [number, string][]) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!, r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    for (const [p, s] of paradas) r.addColorStop(p, s);
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    descartaveis.push(t);
    return t;
  }
  const plano = (lado: [number, number], map: THREE.Texture, y: number, aditivo = false, onde = brasil as THREE.Object3D) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(...lado), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending }));
    m.rotation.x = -Math.PI / 2; m.position.y = y;
    descartaveis.push(m.geometry, m.material as THREE.Material);
    onde.add(m);
    return m;
  };
  plano([4200, 4200], mancha([[0, rgba(C.chao, 0.9)], [0.4, rgba(C.chao, 0.45)], [1, rgba(C.fundo, 0)]]), -24, false, cena);
  plano([1300, 1250], mancha([[0, rgba(C.fundo, 0.9)], [0.62, rgba(C.fundo, 0.5)], [1, rgba(C.fundo, 0)]]), -23.5).position.z = 25;
  const sopro = plano([1500, 1400], mancha([[0, rgba(C.marca, 0.16 * forcaSopro)], [0.55, rgba(C.marca, 0.05 * forcaSopro)], [1, rgba(C.marca, 0)]]), -23, true);
  sopro.position.set(40, -23, 30);

  // ── A fita de luz da entrada: corre pela fronteira e apaga ──
  const fita = (() => {
    const anel = aneisDoContorno().reduce((a, r) => (r.length > a.length ? r : a));
    const n = anel.length;
    let k0 = 0; // começa no ponto mais a leste: o litoral do Nordeste
    anel.forEach(([x], k) => { if (x > anel[k0][0]) k0 = k; });
    const pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx: number[] = [];
    for (let i = 0; i < n; i++) {
      const [x, y] = anel[(k0 + i) % n];
      pos.set([paraX(x), -22, paraZ(y), paraX(x), BASE + 3, paraZ(y)], i * 6);
      uv.set([i / n, 0, i / n, 1], i * 4);
      if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    // Embaixo some, em cima é quase branca: de longe, uma linha acesa na borda.
    const c = document.createElement("canvas");
    c.width = 4; c.height = 128;
    const cx = c.getContext("2d")!, gr = cx.createLinearGradient(0, 128, 0, 0);
    const quente = C.marcaClara.clone().lerp(C.branco, 0.75);
    gr.addColorStop(0, rgba(C.marcaClara, 0)); gr.addColorStop(0.7, rgba(C.marcaClara, 0.45)); gr.addColorStop(0.94, rgba(quente, 1)); gr.addColorStop(1, rgba(quente, 0.6));
    cx.fillStyle = gr; cx.fillRect(0, 0, 4, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    descartaveis.push(g, t, m.material as THREE.Material);
    m.visible = !o.parado();
    brasil.add(m);
    return { m, total: idx.length };
  })();

  // ── As capitais: mesmo tamanho sempre, acendem e apagam, cada uma no seu tempo ──
  const branco = C.branco;
  const texLuz = mancha([[0, rgba(branco, 1)], [0.12, rgba(branco, 0.85)], [0.32, rgba(branco, 0.22)], [0.6, rgba(branco, 0.05)], [1, rgba(branco, 0)]]);
  const [, bx, by] = CAPITAIS_NO_MAPA[0];
  const sprite = (c: THREE.Color, tam: number) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texLuz, color: c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    s.scale.setScalar(tam);
    descartaveis.push(s.material);
    return s;
  };
  const luzes = CAPITAIS_NO_MAPA.map(([, x, y], n) => {
    const h = alturaEm(x, y);
    const p = new THREE.Vector3(paraX(x), h + 2.2, paraZ(y));
    const halo = sprite(C.marca.clone().lerp(C.marcaClara, 0.25), 80 * escalaHalo), nucleo = sprite(C.marcaClara.clone().lerp(branco, 0.8), 17);
    halo.position.copy(p); nucleo.position.copy(p);
    brasil.add(halo, nucleo);
    return { halo, nucleo, p, h, desde: -1, oculta: false, dist: Math.hypot(x - bx, y - by) / 1000, fase: (n * 0.61803) % 1, periodo: 4.2 + ((n * 37) % 10) * 0.32, n };
  });

  // ── O visitante: azul, sempre aceso, com feixe e ondas no chão ──
  const visitante = new THREE.Group();
  visitante.visible = false;
  brasil.add(visitante);
  const texFeixe = (() => {
    const c = document.createElement("canvas");
    c.width = 8; c.height = 256;
    const g = c.getContext("2d")!, r = g.createLinearGradient(0, 0, 0, 256);
    r.addColorStop(0, rgba(C.local, 0.15)); r.addColorStop(0.4, rgba(C.local, 0.6)); r.addColorStop(1, rgba(C.localClara, 1));
    g.fillStyle = r; g.fillRect(0, 0, 8, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    descartaveis.push(t);
    return t;
  })();
  const feixe = new THREE.Mesh(new THREE.PlaneGeometry(3.4, ALT_FEIXE), new THREE.MeshBasicMaterial({ map: texFeixe, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0 }));
  descartaveis.push(feixe.geometry, feixe.material);
  const vNucleo = sprite(C.localClara, 19), vHalo = sprite(C.local, 96 * escalaHalo);
  const ondas = [0, 0.5].map((f) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 72), new THREE.MeshBasicMaterial({ color: C.local, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    descartaveis.push(m.geometry, m.material);
    visitante.add(m);
    return { m, f };
  });
  visitante.add(feixe, vHalo, vNucleo);
  let vPos: THREE.Vector3 | null = null, vDist = 0, vDesde = 0;
  const topoFeixe = new THREE.Vector3(), proj = new THREE.Vector3();

  // ── Luz de estúdio: rasante do noroeste, contraluz roxa, recorte frio ──
  cena.add(new THREE.HemisphereLight(C.ceu, C.fundo, 0.28));
  const chave = new THREE.DirectionalLight(C.chave, 3.4); chave.position.set(-760, 360, -320); cena.add(chave);
  const contra = new THREE.DirectionalLight(C.marca, 1.1); contra.position.set(560, 180, -900); cena.add(contra);
  const recorte = new THREE.DirectionalLight(C.recorte, 0.7); recorte.position.set(700, 280, 760); cena.add(recorte);

  // ── Câmera e giro com a mão (só com mouse e com movimento) ──
  const comMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const controles = new OrbitControls(camera, tela);
  Object.assign(controles, { enableZoom: false, enablePan: false, enableDamping: true, dampingFactor: 0.06, rotateSpeed: 0.5, minPolarAngle: 0.55, maxPolarAngle: 1.15, minAzimuthAngle: -0.75, maxAzimuthAngle: 0.75 });
  controles.enabled = comMouse && !o.parado();
  if (controles.enabled) palco.setAttribute("data-gira", "");
  let mexeu = false;
  controles.addEventListener("start", () => { mexeu = true; });
  let mouseX = 0, mouseSuave = 0;
  const aoMover = (e: PointerEvent) => { mouseX = e.clientX / window.innerWidth - 0.5; };
  if (controles.enabled) window.addEventListener("pointermove", aoMover, { passive: true });

  let dist = 2000;
  const alvo = new THREE.Vector3();
  const PHI = 0.95;
  function posicionar(phi: number, theta: number, perto = 1) {
    const d = dist * perto;
    camera.position.set(alvo.x + d * Math.sin(phi) * Math.sin(theta), alvo.y + d * Math.cos(phi), alvo.z + d * Math.sin(phi) * Math.cos(theta));
    controles.target.copy(alvo);
    controles.update();
  }
  function enquadrar() {
    const w = palco.clientWidth, h = palco.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const estreito = w < 860;
    // O Brasil ocupa ~62% da coluna de conteúdo, sem passar da altura.
    const mapaPx = estreito ? w * 0.98 : Math.min(Math.min(w, 1200) * 0.62, h * 1.02);
    dist = 1000 / ((mapaPx / w) * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    alvo.set(estreito ? 0 : -90, 10, estreito ? 70 : -160);
    if (!mexeu) posicionar(PHI, 0);
    if (parado) desenhar(99);
  }

  let nitida: HTMLImageElement[] | null = null; // a textura nítida, esperando a entrada acabar

  // A etiqueta "Você está em…" sobre o topo do feixe, sem sair da tela. A
  // largura dela é medida aqui, e não uma vez: quando o nome chega, a
  // etiqueta ainda está escondida (largura zero) e, com o mapa parado (modo
  // leve), a posição medida assim ficava, com a etiqueta cortada na borda
  // (print do fundador, iPhone, 3/11/2026). Quem chama de novo quando o
  // tamanho muda é o observador logo abaixo.
  function posicionarRotulo() {
    if (!vPos) return;
    brasil.updateMatrixWorld();
    camera.updateMatrixWorld();
    proj.copy(topoFeixe).applyMatrix4(brasil.matrixWorld).project(camera);
    const W = palco.clientWidth, H = palco.clientHeight, rw = rotulo.offsetWidth, rh = rotulo.offsetHeight;
    const x = Math.max(8, Math.min(W - rw - 8, ((proj.x + 1) / 2) * W - rw / 2));
    const y = Math.max(8, ((1 - proj.y) / 2) * H - rh);
    rotulo.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }
  const medirRotulo = new ResizeObserver(() => posicionarRotulo());
  medirRotulo.observe(rotulo);

  // ── Um quadro ──
  const lim = (t: number) => Math.min(1, Math.max(0, t));
  const saida = (t: number) => 1 - Math.pow(1 - lim(t), 3);
  // Seno: sai e chega suave, mas sem o pico de velocidade da cúbica no meio.
  const vaiVem = (t: number) => (1 - Math.cos(Math.PI * lim(t))) / 2;
  const passo = THREE.MathUtils.smoothstep;
  function desenhar(s: number) {
    const quieto = parado;
    // A fita corre a fronteira (1,5 s, acelera e freia) e apaga de 2,0 a 2,9 s.
    fita.m.visible = !quieto && s < 3.0;
    if (fita.m.visible) {
      fita.m.geometry.setDrawRange(0, Math.floor((fita.total / 6) * vaiVem(s / 1.9)) * 6);
      (fita.m.material as THREE.MeshBasicMaterial).opacity = 1 - passo(s, 2.1, 2.9);
    }
    // O país sobe de dentro da fita, enquanto ela ainda corre: altura de 2% a
    // 100% e o detalhe da superfície junto.
    relevo.visible = quieto || s > 0.5;
    relevo.scale.y = quieto ? 1 : 0.02 + 0.98 * saida((s - 0.5) / 1.6);
    matTerra.normalScale.setScalar(0.75 * (quieto ? 1 : saida((s - 0.6) / 1.6)));
    const onda = quieto ? 9 : Math.max(0, s - 1.5) * 0.6;
    if (nitida && (quieto || s > 3.0)) { aplicar(nitida); nitida = null; }
    if (!mexeu) {
      mouseSuave += (mouseX - mouseSuave) * 0.05;
      // A câmera já está deitada; só chega 6% mais perto, devagar.
      posicionar(PHI, (quieto ? 0 : Math.sin(s * 0.1) * 0.06) + mouseSuave * 0.16, quieto ? 1 : 1 + 0.06 * (1 - saida(s / 2.6)));
    } else controles.update();
    for (const l of luzes) {
      if (l.oculta) { l.nucleo.material.opacity = 0; l.halo.material.opacity = 0; continue; }
      l.halo.position.y = l.nucleo.position.y = l.h * relevo.scale.y + 2.2; // pousada no relevo que cresce
      const acesa = passo(onda, l.dist, l.dist + 0.05);
      if (!quieto && acesa > 0.5 && l.desde < 0) l.desde = s;
      // Acende em 0,7 s, fica 1,6 s, apaga em 0,9 s e some até a próxima vez.
      const tc = (((s / l.periodo) + l.fase) % 1) * l.periodo;
      let visto = quieto ? (l.n % 3 === 0 ? 1 : 0) : passo(tc, 0, 0.7) * (1 - passo(tc, 2.3, 3.2));
      // Na primeira vez que a onda chega, um brilho forte que assenta no ciclo.
      if (l.desde >= 0) {
        const d = s - l.desde;
        visto = Math.max(visto, 1 - passo(d, 0.9, 1.8));
        l.halo.scale.setScalar(80 * (1 + 0.6 * (1 - passo(d, 0, 0.9))));
      }
      l.nucleo.material.opacity = acesa * visto;
      l.halo.material.opacity = acesa * visto;
    }
    if (vPos) {
      const liga = quieto ? 1 : THREE.MathUtils.smoothstep(s, vDesde + vDist * 2, vDesde + 0.8 + vDist * 2);
      (feixe.material as THREE.MeshBasicMaterial).opacity = liga;
      vNucleo.material.opacity = liga;
      vHalo.material.opacity = liga * (quieto ? 0.85 : 0.7 + 0.3 * Math.sin(s * 2.2));
      feixe.rotation.y = Math.atan2(camera.position.x - feixe.position.x, camera.position.z - feixe.position.z);
      for (const w of ondas) {
        const c = quieto ? 0.35 : ((s / 2.6 + w.f) % 1);
        w.m.scale.setScalar(4 + c * 34);
        (w.m.material as THREE.MeshBasicMaterial).opacity = liga * (1 - c) * 0.8;
      }
      posicionarRotulo();
      if (liga > 0.5) rotulo.setAttribute("data-visivel", "");
    }
    renderer.render(cena, camera);
  }

  // ── O laço: só enquanto o topo está na tela e a aba está aberta ──
  let parado = o.parado();
  let t0 = -1; // o relógio da entrada começa no primeiro quadro de verdade
  let avisou = false;
  const avisar = () => { if (!avisou) { avisou = true; o.aoPronto(); } };
  let visivel = true, quadro = 0;
  const laco = (agora: number) => {
    quadro = 0;
    if (parado) return;
    if (t0 < 0) t0 = agora;
    desenhar((agora - t0) / 1000);
    avisar();
    if (visivel && !document.hidden) quadro = requestAnimationFrame(laco);
  };
  const retomar = () => { if (!parado && visivel && !document.hidden && !quadro) quadro = requestAnimationFrame(laco); };
  const observador = new IntersectionObserver(([e]) => { visivel = e.isIntersecting; retomar(); });
  observador.observe(palco);
  document.addEventListener("visibilitychange", retomar);
  const redimensionar = new ResizeObserver(() => enquadrar());
  redimensionar.observe(palco);
  enquadrar();
  // Compila os shaders antes do primeiro quadro (em paralelo, quando o
  // aparelho deixa), para a entrada não começar travada.
  if (!parado) {
    posicionar(PHI, 0);
    await renderer.compileAsync(cena, camera).catch(() => {});
  }
  if (parado) { desenhar(99); avisar(); } else retomar();

  // O nível nítido chega depois e entra no primeiro quadro após a entrada
  // (desenhar), para a subida da textura não travar o país aparecendo.
  if (nivel !== "baixa") {
    Promise.all(arquivos(nivel).map(imagem))
      .then((imgs) => { nitida = imgs; if (parado) desenhar(99); })
      .catch(() => {});
  }

  return {
    definirVisitante(local) {
      if (!local) { vPos = null; visitante.visible = false; rotulo.removeAttribute("data-visivel"); return; }
      const x = 24.0686 * local.lng + 1780.593, y = -24.8884 * local.lat + 137.0145; // lib/localizacao.ts (paraMapa)
      vPos = new THREE.Vector3(paraX(x), alturaEm(x, y) + 2.4, paraZ(y));
      vDist = Math.hypot(x - bx, y - by) / 1000;
      vDesde = Math.max(2.1, (t0 < 0 ? 0 : (performance.now() - t0) / 1000) - vDist * 2);
      feixe.position.copy(vPos).add(new THREE.Vector3(0, ALT_FEIXE / 2, 0));
      vNucleo.position.copy(vPos); vHalo.position.copy(vPos);
      for (const w of ondas) w.m.position.copy(vPos).add(new THREE.Vector3(0, 0.3, 0));
      topoFeixe.copy(vPos).add(new THREE.Vector3(0, ALT_FEIXE + 1, 0));
      for (const l of luzes) l.oculta = l.p.distanceTo(vPos) < 14; // a capital do visitante dá lugar ao ponto dele
      visitante.visible = true;
      if (parado) desenhar(99);
    },
    parar() {
      parado = true;
      controles.enabled = false;
      palco.removeAttribute("data-gira");
      cancelAnimationFrame(quadro);
      quadro = 0;
      desenhar(99);
    },
    destruir() {
      cancelAnimationFrame(quadro);
      observador.disconnect();
      redimensionar.disconnect();
      medirRotulo.disconnect();
      document.removeEventListener("visibilitychange", retomar);
      window.removeEventListener("pointermove", aoMover);
      controles.dispose();
      for (const d of descartaveis) d.dispose();
    },
  };
}
