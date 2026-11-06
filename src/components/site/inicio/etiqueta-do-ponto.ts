// ── ONDE PÕE O "VOCÊ ESTÁ EM…" (nov/2026) ──
//
// A etiqueta fica em cima do feixe do ponto. Mas, com o número da prefeitura
// e o "Não é aqui? Trocar", ela cresceu: no celular cobria o texto da busca
// (o mapa sobe 64 px por baixo dele) e, nas cidades do Sul, ficava atrás do
// botão "Conhecer os módulos". Tenta, nesta ordem: em cima do feixe, à
// direita, à esquerda, ao lado do botão e embaixo do ponto; fica com o
// primeiro lugar livre.
// Usada pela cena 3D e pelo cartaz (BrasilRelevo.tsx), para as duas porem a
// etiqueta no mesmo lugar.

export type Caixa = { x: number; y: number; w: number; h: number };

const cruza = (a: Caixa, b: Caixa) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export function lugarDaEtiqueta(o: {
  /** Largura do palco. */
  W: number;
  topo: [number, number];
  chao: [number, number];
  rw: number;
  rh: number;
  /** Acima disto a etiqueta cobre outra coisa (no celular, o texto da busca). */
  minY: number;
  evitar: Caixa[];
}): [number, number] {
  const { W, topo, chao, rw, rh, minY, evitar } = o;
  const prende = (x: number) => Math.max(8, Math.min(W - rw - 8, x));
  const tentativas: [number, number][] = [
    [prende(topo[0] - rw / 2), topo[1] - rh],
    [topo[0] + 16, topo[1] - rh / 2],
    [topo[0] - 16 - rw, topo[1] - rh / 2],
    // Ao lado do que está no caminho (o botão do mapa, nas cidades do Sul).
    ...evitar.flatMap((e): [number, number][] => [
      [e.x + e.w + 4, topo[1] - rh / 2],
      [e.x - rw - 4, topo[1] - rh / 2],
    ]),
    [prende(chao[0] - rw / 2), chao[1] + 16],
  ];
  for (const [x, y] of tentativas) {
    if (x < 8 || x + rw > W - 8 || y < minY) continue;
    const c = { x, y, w: rw, h: rh };
    if (evitar.some((e) => cruza(c, e))) continue;
    return [x, y];
  }
  return [tentativas[0][0], Math.max(minY, tentativas[0][1])];
}

/** O que a etiqueta não pode cobrir, em coordenadas do palco. */
export function obstaculos(palco: HTMLElement): { minY: number; evitar: Caixa[] } {
  const base = palco.getBoundingClientRect();
  const evitar: Caixa[] = [];
  const pilula = palco.querySelector(".topo3d-pilula");
  if (pilula) {
    const r = pilula.getBoundingClientRect();
    evitar.push({ x: r.left - base.left - 8, y: r.top - base.top - 8, w: r.width + 16, h: r.height + 16 });
  }
  // No celular o palco começa 64 px por baixo do texto da busca (TopoBrasil.tsx).
  return { minY: palco.clientWidth < 860 ? 72 : 8, evitar };
}
