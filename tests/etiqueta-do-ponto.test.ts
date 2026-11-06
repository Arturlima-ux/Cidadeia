import { describe, expect, it } from "vitest";
import { lugarDaEtiqueta } from "@/components/site/inicio/etiqueta-do-ponto";

describe("onde fica o 'você está em…'", () => {
  const base = { W: 1000, rw: 200, rh: 60, minY: 8, evitar: [] };

  it("em cima do feixe, centrada, quando há lugar", () => {
    expect(lugarDaEtiqueta({ ...base, topo: [500, 300], chao: [500, 350] })).toEqual([400, 240]);
  });

  it("sai de cima do botão do mapa", () => {
    const evitar = [{ x: 350, y: 220, w: 300, h: 50 }];
    const [x, y] = lugarDaEtiqueta({ ...base, evitar, topo: [500, 300], chao: [500, 350] });
    expect(x).toBe(516);
    expect(y).toBe(270);
  });

  it("no celular não sobe por cima do texto da busca: desce para baixo do ponto", () => {
    const [, y] = lugarDaEtiqueta({ ...base, W: 390, rw: 240, minY: 72, topo: [200, 40], chao: [200, 90] });
    expect(y).toBe(106);
  });
});
