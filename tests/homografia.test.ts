import { describe, expect, it } from "vitest";
import { homografia } from "@/lib/homografia";

const perto = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-6);

describe("homografia: da tela para o mapa inclinado", () => {
  it("leva os quatro cantos de um no outro", () => {
    const tela = [{ x: 120, y: 80 }, { x: 900, y: 80 }, { x: 40, y: 520 }, { x: 980, y: 520 }];
    const mapa = [{ x: 0, y: 0 }, { x: 800, y: 0 }, { x: 0, y: 780 }, { x: 800, y: 780 }];
    const f = homografia(tela, mapa)!;
    tela.forEach((p, i) => {
      const r = f(p);
      perto(r.x, mapa[i].x);
      perto(r.y, mapa[i].y);
    });
  });

  it("acerta um ponto do meio numa perspectiva de verdade (rotateX)", () => {
    // Plano 800x780, origem no topo-centro, rotateX(58°), perspectiva 1600.
    const a = (58 * Math.PI) / 180;
    const projeta = (x: number, y: number) => {
      const X = x - 400;
      const z = y * Math.sin(a); // a parte de baixo vem para perto
      const s = 1600 / (1600 - z);
      return { x: 400 + X * s, y: y * Math.cos(a) * s };
    };
    const cantos = [{ x: 0, y: 0 }, { x: 800, y: 0 }, { x: 0, y: 780 }, { x: 800, y: 780 }];
    const f = homografia(cantos.map((c) => projeta(c.x, c.y)), cantos)!;
    const r = f(projeta(612, 233));
    perto(r.x, 612);
    perto(r.y, 233);
  });

  it("com três cantos alinhados, não inventa conta", () => {
    const ruim = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }];
    expect(homografia(ruim, ruim)).toBeNull();
  });
});
