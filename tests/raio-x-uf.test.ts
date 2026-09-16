import { describe, it, expect } from "vitest";
import { retratoDaUf } from "@/lib/raio-x-uf";
import { ESTADOS, doEstado, NOME_DOS_ESTADOS } from "@/lib/estados";
import { TOTAL_MUNICIPIOS } from "@/lib/municipios";

describe("retrato por UF", () => {
  it("as 27 UFs somam os 5.571 municípios", () => {
    const soma = ESTADOS.reduce((s, uf) => s + retratoDaUf(uf).total, 0);
    expect(soma).toBe(TOTAL_MUNICIPIOS);
  });

  it("as faixas somam o total e a dispensa conta só as três primeiras", () => {
    const r = retratoDaUf("PI");
    expect(r.porFaixa.reduce((s, f) => s + f.quantidade, 0)).toBe(r.total);
    expect(r.cabemNaDispensa).toBeLessThanOrEqual(r.total);
    expect(r.porFaixa.filter((f) => f.garanteDispensa).map((f) => f.chave)).toEqual(["ate10k", "de10a50k", "de50a100k"]);
  });

  it("lista do maior para o menor, com a capital no topo", () => {
    const r = retratoDaUf("PI");
    expect(r.municipios[0]?.nome).toBe("Teresina");
    for (let i = 1; i < r.municipios.length; i++) {
      expect(r.municipios[i - 1]!.populacao).toBeGreaterThanOrEqual(r.municipios[i]!.populacao);
    }
  });

  it("todo estado tem nome e preposição", () => {
    for (const uf of ESTADOS) {
      expect(NOME_DOS_ESTADOS[uf].length).toBeGreaterThan(3);
      expect(doEstado(uf)).toMatch(/^(do|da|de) /);
    }
    expect(doEstado("PI")).toBe("do Piauí");
    expect(doEstado("BA")).toBe("da Bahia");
    expect(doEstado("MG")).toBe("de Minas Gerais");
    expect(doEstado("SP")).toBe("de São Paulo");
  });
});
