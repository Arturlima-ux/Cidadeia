import { describe, it, expect } from "vitest";
import { ehCodigoIbge, buscarMunicipioPorCodigo } from "@/lib/populacao-ibge";

// ── O BOTÃO "RECEBER ESTA PROPOSTA" NÃO FUNCIONAVA ──
// A validação do código IBGE estava /^d{7}$/ — sete letras "d" — por um
// escape perdido. Recusava todo código real, e o pedido de proposta saía
// genérico, sem município. O teste que faltava é este.
describe("ehCodigoIbge", () => {
  it("aceita códigos reais de sete dígitos", () => {
    expect(ehCodigoIbge("3550308")).toBe(true); // São Paulo
    expect(ehCodigoIbge("2211001")).toBe(true); // Teresina
    expect(ehCodigoIbge("2201408")).toBe(true); // Barro Duro
  });

  it("recusa o que não é código", () => {
    expect(ehCodigoIbge("ddddddd")).toBe(false);
    expect(ehCodigoIbge("355030")).toBe(false);
    expect(ehCodigoIbge("35503080")).toBe(false);
    expect(ehCodigoIbge("")).toBe(false);
    expect(ehCodigoIbge(null)).toBe(false);
    expect(ehCodigoIbge(3550308)).toBe(false);
  });
});

describe("buscarMunicipioPorCodigo", () => {
  it("São Paulo, com população", async () => {
    const m = await buscarMunicipioPorCodigo("3550308");
    expect(m?.nome).toBe("São Paulo");
    expect(m?.uf).toBe("SP");
    expect(m?.populacao).toBeGreaterThan(10_000_000);
  });

  it("código inexistente é null", async () => {
    expect(await buscarMunicipioPorCodigo("9999999")).toBeNull();
  });
});
