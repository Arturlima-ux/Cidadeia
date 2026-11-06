import { paraMapa } from "@/lib/localizacao";

// ── ONDE UMA CIDADE CAI NA IMAGEM DO MAPA (nov/2026) ──
//
// O topo abre com o vídeo do Brasil crescendo e a imagem do último quadro
// (BrasilRelevo.tsx, cartaz) antes de a cena 3D existir. Para o ponto da
// cidade acender junto, sem three.js, a posição vem de uma homografia: o mapa
// (x 0–1000, y 0–975, lib/mapa-municipios.ts) para a fração da imagem, uma
// para o chão e outra para o topo do feixe (onde fica o "Você está em…").
// Ajustadas sobre 441 pontos projetados pela própria cena
// (brasil-relevo-cena.ts, window.__projetar, com ?captura=cresce): erro médio
// de 1,7 px a 1440 e 0,8 px a 390. Gravou o vídeo de novo? Ajuste de novo.

type H8 = readonly [number, number, number, number, number, number, number, number];

const H: Record<"largo" | "estreito", { chao: H8; topo: H8 }> = {
  largo: {
    chao: [0.000446854, -0.000190312, 0.321849642, 1.5969e-5, 0.000293118, 0.342103293, -1.6575e-5, -0.000330146],
    topo: [0.00045211, -0.000192583, 0.319754882, 1.6104e-5, 0.000296952, 0.306860572, -1.6801e-5, -0.000334067],
  },
  estreito: {
    chao: [0.000795556, -0.000194111, 0.121168944, 1.3743e-5, 0.000280445, 0.249439417, -1.503e-5, -0.000306939],
    topo: [0.000804449, -0.00019625, 0.116928939, 1.3873e-5, 0.000283785, 0.215228326, -1.5217e-5, -0.000310307],
  },
};

const aplicar = (h: H8, x: number, y: number): [number, number] => {
  const w = h[6] * x + h[7] * y + 1;
  return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
};

/** Frações (0–1) da imagem do mapa: o ponto no chão e o topo do feixe. */
export function naImagem(lat: number, lng: number, estreito: boolean) {
  const { x, y } = paraMapa(lat, lng);
  const h = H[estreito ? "estreito" : "largo"];
  return { chao: aplicar(h.chao, x, y), topo: aplicar(h.topo, x, y) };
}
