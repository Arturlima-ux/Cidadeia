import { describe, it, expect } from "vitest";
import {
  calcularTendencia,
  descreverVariacao,
  descreverDesvio,
  nomeDoMes,
} from "@/lib/tendencia";

const AGORA = new Date("2026-09-11T12:00:00Z");

// Série na ordem do banco: mais recente primeiro.
const FREQUENCIA = [
  { valor: 71, em: "2026-09-01T12:00:00Z" },
  { valor: 78, em: "2026-06-15T12:00:00Z" },
  { valor: 86, em: "2026-04-10T12:00:00Z" },
  { valor: 88, em: "2026-02-05T12:00:00Z" },
  { valor: 87, em: "2025-12-01T12:00:00Z" },
];

describe("calcularTendencia", () => {
  it("com uma leitura só, não há tendência — e não se inventa uma", () => {
    expect(calcularTendencia([FREQUENCIA[0]])).toBeNull();
    expect(calcularTendencia([])).toBeNull();
  });

  it("ignora leituras sem valor em vez de tratá-las como zero", () => {
    // Um zero inventado viraria "caiu 71 pontos" — acusação falsa.
    const t = calcularTendencia([FREQUENCIA[0], { valor: null, em: "2026-08-01T12:00:00Z" }, FREQUENCIA[1]]);
    expect(t?.anterior).toBe(78);
    expect(t?.n).toBe(2);
  });

  it("variação é atual menos anterior, na unidade do indicador", () => {
    const t = calcularTendencia(FREQUENCIA)!;
    expect(t.atual).toBe(71);
    expect(t.anterior).toBe(78);
    expect(t.variacao).toBe(-7);
    expect(t.anteriorEm).toBe("2026-06-15T12:00:00Z");
  });

  it("padrão histórico só com três ou mais leituras anteriores", () => {
    expect(calcularTendencia(FREQUENCIA.slice(0, 3))!.mediaAnterior).toBeNull();
    const t = calcularTendencia(FREQUENCIA)!;
    // média de 78, 86, 88, 87
    expect(t.mediaAnterior).toBeCloseTo(84.75, 2);
    expect(t.desvioDaMedia).toBeCloseTo(-13.75, 2);
  });
});

describe("descreverVariacao", () => {
  it("percentual em pontos, com o mês da leitura anterior", () => {
    const t = calcularTendencia(FREQUENCIA)!;
    expect(descreverVariacao(t, "pp", "America/Sao_Paulo", AGORA)).toBe("caiu 7 pontos desde junho (era 78%)");
  });

  it("'ponto' no singular quando é um", () => {
    const t = calcularTendencia([
      { valor: 74, em: "2026-09-01T12:00:00Z" },
      { valor: 75, em: "2026-08-01T12:00:00Z" },
    ])!;
    expect(descreverVariacao(t, "pp", "America/Sao_Paulo", AGORA)).toBe("caiu 1 ponto desde agosto (era 75%)");
  });

  it("número absoluto usa o sufixo do indicador", () => {
    const t = calcularTendencia([
      { valor: 52, em: "2026-09-01T12:00:00Z" },
      { valor: 38, em: "2026-07-01T12:00:00Z" },
    ])!;
    expect(descreverVariacao(t, { sufixo: "min", casas: 0 }, "America/Sao_Paulo", AGORA)).toBe(
      "subiu 14 min desde julho (era 38 min)"
    );
  });

  it("cita o ano quando a leitura anterior é de outro ano", () => {
    expect(nomeDoMes("2025-12-01T12:00:00Z", "America/Sao_Paulo", AGORA)).toBe("dezembro de 2025");
    expect(nomeDoMes("2026-06-15T12:00:00Z", "America/Sao_Paulo", AGORA)).toBe("junho");
  });
});

describe("descreverDesvio", () => {
  it("silencia quando não há padrão ou o desvio é pequeno", () => {
    expect(descreverDesvio(calcularTendencia(FREQUENCIA.slice(0, 3))!, "pp", 5)).toBeNull();
    const estavel = calcularTendencia([
      { valor: 85, em: "2026-09-01T12:00:00Z" },
      { valor: 86, em: "2026-08-01T12:00:00Z" },
      { valor: 84, em: "2026-07-01T12:00:00Z" },
      { valor: 85, em: "2026-06-01T12:00:00Z" },
    ])!;
    expect(descreverDesvio(estavel, "pp", 5)).toBeNull();
  });

  it("fala quando o desvio passa do relevante", () => {
    const t = calcularTendencia(FREQUENCIA)!;
    expect(descreverDesvio(t, "pp", 5)).toBe("13,8 pontos abaixo da média das 4 leituras anteriores");
  });
});
