import { describe, expect, it } from "vitest";
import { dividirEmFalas, limparParaFala } from "@/lib/leitura-em-voz";

describe("o texto que se lê", () => {
  it("junta espaços e tira símbolos que a voz soletraria", () => {
    expect(limparParaFala("Como chegar →\n\n  UBS do Centro · 250 m")).toBe("Como chegar, UBS do Centro, 250 m");
  });

  it("divide em pedaços curtos no fim de frase", () => {
    const falas = dividirEmFalas("Primeira frase curta. Segunda frase curta. Terceira.", 25);
    expect(falas).toEqual(["Primeira frase curta.", "Segunda frase curta.", "Terceira."]);
  });

  it("frase gigante sem ponto é cortada no espaço, sem perder palavra", () => {
    const longa = Array.from({ length: 80 }, (_, i) => `palavra${i}`).join(" ");
    const falas = dividirEmFalas(longa, 100);
    expect(falas.every((f) => f.length <= 100)).toBe(true);
    expect(falas.join(" ")).toBe(longa);
  });

  it("nada para ler, nenhuma fala", () => {
    expect(dividirEmFalas("   \n ")).toEqual([]);
  });
});
