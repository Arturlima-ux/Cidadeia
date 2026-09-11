import { describe, it, expect } from "vitest";
import { extrairPopulacao } from "@/lib/populacao-ibge";

// Resposta real do IBGE para Teresina, capturada em 11/09/2026.
const TERESINA = [
  {
    id: "9324",
    variavel: "População residente estimada",
    unidade: "Pessoas",
    resultados: [
      {
        classificacoes: [],
        series: [
          {
            localidade: { id: "2211001", nivel: { id: "N6", nome: "Município" }, nome: "Teresina (PI)" },
            serie: { "2026": "908012" },
          },
        ],
      },
    ],
  },
];

describe("extrairPopulacao", () => {
  it("lê a estimativa mais recente", () => {
    expect(extrairPopulacao(TERESINA)).toBe(908012);
  });

  it("com mais de um ano, pega o último", () => {
    const j = structuredClone(TERESINA) as unknown as { [k: string]: unknown }[] & { 0: { resultados: { series: { serie: Record<string, string> }[] }[] } };
    j[0].resultados[0].series[0].serie = { "2024": "900000", "2026": "908012", "2025": "904000" };
    expect(extrairPopulacao(j)).toBe(908012);
  });

  it("resposta vazia ou torta vira null, nunca zero", () => {
    expect(extrairPopulacao([])).toBeNull();
    expect(extrairPopulacao(null)).toBeNull();
    const semSerie = structuredClone(TERESINA) as unknown as { 0: { resultados: { series: { serie: Record<string, string> }[] }[] } };
    semSerie[0].resultados[0].series[0].serie = { "2026": "-" };
    expect(extrairPopulacao(semSerie)).toBeNull();
  });
});
