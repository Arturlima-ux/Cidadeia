import { describe, expect, it } from "vitest";
import { aneisDoContorno } from "@/lib/contorno-brasil";
import { paraMapa } from "@/lib/localizacao";
import { MAPA_ALTURA, MAPA_LARGURA } from "@/lib/mapa-municipios";

// Ponto dentro de polígono (par-ímpar).
const dentro = (x: number, y: number, anel: [number, number][]) => {
  let d = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i];
    const [xj, yj] = anel[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
};

describe("contorno do Brasil", () => {
  const aneis = aneisDoContorno();
  it("o continente vem primeiro e cabe no mapa", () => {
    expect(aneis[0].length).toBeGreaterThan(500);
    for (const [x, y] of aneis[0]) {
      expect(x).toBeGreaterThan(-5);
      expect(x).toBeLessThan(MAPA_LARGURA + 5);
      expect(y).toBeGreaterThan(-5);
      expect(y).toBeLessThan(MAPA_ALTURA + 5);
    }
  });
  it("capitais caem dentro, e o oceano e a Bolívia fora", () => {
    for (const [lat, lon] of [[-5.09, -42.8], [-15.79, -47.88], [-3.12, -60.02], [-30.03, -51.23], [-23.55, -46.63]]) {
      const p = paraMapa(lat, lon);
      expect(dentro(p.x, p.y, aneis[0])).toBe(true);
    }
    for (const [lat, lon] of [[-10, -30], [-16.5, -68.15]]) {
      const p = paraMapa(lat, lon);
      expect(dentro(p.x, p.y, aneis[0])).toBe(false);
    }
  });
});
