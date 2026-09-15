import { describe, it, expect } from "vitest";
import { resumoDoRaioX } from "@/lib/raio-x-texto";
import type { RaioX } from "@/lib/raio-x";

const base: RaioX = {
  municipio: "Barro Duro", uf: "PI", codigoIbge: "2201408", exercicio: 2026, bimestreReferencia: 3,
  receita: { valor: 24_000_000, detalhe: "", fonte: "Tesouro Nacional · SICONFI" },
  despesaSaude: { valor: 3_600_000, detalhe: "", fonte: "Tesouro Nacional · SICONFI" },
  despesaEducacao: { valor: 6_000_000, detalhe: "", fonte: "Tesouro Nacional · SICONFI" },
  despesaObras: { valor: null, detalhe: "", fonte: "Tesouro Nacional · SICONFI" },
  rreoEsperados: 4, rreoEntregues: 3, rreoFaltando: [4], consultadoEm: "2026-09-15T12:00:00Z",
};

describe("resumoDoRaioX", () => {
  it("diz os números com a proporção da receita e o RREO faltando", () => {
    const t = resumoDoRaioX(base).join("\n");
    expect(t).toContain("Barro Duro/PI");
    expect(t).toContain("15%"); // 3,6 de 24
    expect(t).toContain("25%");
    expect(t).toContain("não publicado");
    expect(t).toContain("faltam 1 de 4");
    expect(t).toContain("indício");
  });

  it("sem nenhum RREO, é uma frase só — e não inventa número", () => {
    const t = resumoDoRaioX({ ...base, bimestreReferencia: null, rreoEntregues: 0, rreoFaltando: [1, 2, 3, 4] }).join("\n");
    expect(t).toContain("nenhum RREO consta");
    expect(t).not.toContain("Receita realizada");
  });
});
