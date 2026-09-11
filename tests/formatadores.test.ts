import { describe, it, expect } from "vitest";
import { formatarNumero, formatarPercentual } from "@/lib/formatadores";

// Os cartões de indicador mostravam "6.5%" e "7.2" — número cru, com ponto —
// no mesmo painel em que a moeda sai "R$ 1.234,56". Para quem lê em
// português, "6.5" lê como seis mil e quinhentos.
describe("formatarNumero / formatarPercentual", () => {
  it("decimal com vírgula", () => {
    expect(formatarNumero(6.5)).toBe("6,5");
    expect(formatarNumero(7.2)).toBe("7,2");
  });

  it("inteiro sem casa decimal fantasma", () => {
    expect(formatarNumero(20)).toBe("20");
    expect(formatarPercentual(100)).toBe("100%");
  });

  it("milhar com ponto", () => {
    expect(formatarNumero(1284)).toBe("1.284");
  });

  it("arredonda a uma casa por padrão", () => {
    expect(formatarPercentual(71.456)).toBe("71,5%");
  });
});
