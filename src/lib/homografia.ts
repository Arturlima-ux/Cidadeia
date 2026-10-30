// ── DA TELA PARA O PLANO INCLINADO ──
//
// No planeta do topo, o mapa do Brasil fica deitado em 3D (perspective +
// rotateX, globals.css .planeta-mapa) e ainda pode girar no arraste. O mouse
// chega em coordenadas de tela; os pontos estão nas coordenadas do mapa. Uma
// homografia leva um quadrilátero a outro: com os quatro cantos do mapa como
// aparecem na tela e os quatro cantos de verdade, ela converte qualquer ponto
// da tela no ponto do mapa embaixo dele, seja qual for a inclinação.

export type Ponto = { x: number; y: number };

/**
 * A homografia que leva `de[i]` a `para[i]` (quatro pares). Devolve a função
 * de conversão, ou null se os pontos forem degenerados (três alinhados).
 */
export function homografia(de: Ponto[], para: Ponto[]): ((p: Ponto) => Ponto) | null {
  if (de.length !== 4 || para.length !== 4) return null;
  // Oito incógnitas (h0..h7, com h8 = 1), duas equações por par de pontos.
  const a: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = de[i];
    const { x: u, y: v } = para[i];
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  // Eliminação de Gauss com pivô parcial.
  for (let c = 0; c < 8; c++) {
    let pivo = c;
    for (let l = c + 1; l < 8; l++) if (Math.abs(a[l][c]) > Math.abs(a[pivo][c])) pivo = l;
    if (Math.abs(a[pivo][c]) < 1e-12) return null;
    [a[c], a[pivo]] = [a[pivo], a[c]];
    for (let l = 0; l < 8; l++) {
      if (l === c) continue;
      const f = a[l][c] / a[c][c];
      for (let k = c; k < 9; k++) a[l][k] -= f * a[c][k];
    }
  }
  const h = a.map((linha, i) => linha[8] / linha[i]);
  return ({ x, y }) => {
    const w = h[6] * x + h[7] * y + 1;
    return { x: (h[0] * x + h[1] * y + h[2]) / w, y: (h[3] * x + h[4] * y + h[5]) / w };
  };
}
