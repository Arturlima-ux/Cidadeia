import { describe, it, expect } from "vitest";
import { dentroDoBrasil, pareceTrocado, explicarCoordenada, LIMITES_BRASIL } from "@/lib/coordenadas";

describe("coordenadas", () => {
  it("aceita os extremos do território com folga", () => {
    expect(dentroDoBrasil(-33.75, -53.39)).toBe(true); // Chuí
    expect(dentroDoBrasil(5.27, -60.21)).toBe(true); // Monte Caburaí
    expect(dentroDoBrasil(-7.53, -73.99)).toBe(true); // Serra da Contamana
    expect(dentroDoBrasil(-20.51, -29.31)).toBe(true); // Trindade
    expect(dentroDoBrasil(-3.7327, -38.5267)).toBe(true); // Fortaleza, o placeholder
  });

  it("recusa latitude e longitude trocadas — o erro que punha o pino no oceano", () => {
    expect(dentroDoBrasil(-38.5267, -3.7327)).toBe(false);
    expect(pareceTrocado(-38.5267, -3.7327)).toBe(true);
    expect(explicarCoordenada(-38.5267, -3.7327)).toContain("trocadas");
  });

  it("fora do Brasil sem ser troca recebe a mensagem genérica", () => {
    expect(pareceTrocado(48.85, 2.35)).toBe(false); // Paris
    expect(explicarCoordenada(48.85, 2.35)).toContain("fora do Brasil");
  });

  it("dentro do Brasil não tem nada a explicar", () => {
    expect(explicarCoordenada(-15.79, -47.88)).toBeNull(); // Brasília
  });

  it("os limites do formulário e do servidor são os mesmos", () => {
    // Se um dia alguém apertar só um dos dois lados, o navegador aceita e o
    // servidor recusa (ou vice-versa) — e a pessoa não entende o erro.
    expect(LIMITES_BRASIL.latitude).toEqual({ min: -34, max: 6 });
    expect(LIMITES_BRASIL.longitude).toEqual({ min: -74, max: -28 });
  });
});
