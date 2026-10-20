import { describe, expect, it } from "vitest";
import { proximoVencimento } from "@/lib/obrigacoes-fiscais";

describe("próximo vencimento", () => {
  it("em 20 de outubro, o próximo RREO é o do 5º bimestre, em 30 de novembro", () => {
    const r = proximoVencimento("rreo", "2026-10-20")!;
    expect(r.periodo.rotulo).toBe("5º bimestre de 2026");
    expect(r.periodo.vencimento).toBe("2026-11-30");
    expect(r.dias).toBe(41);
  });

  it("no dia do vencimento ainda conta, com zero dias", () => {
    const r = proximoVencimento("rreo", "2026-11-30")!;
    expect(r.periodo.vencimento).toBe("2026-11-30");
    expect(r.dias).toBe(0);
  });

  it("em janeiro, o próximo RREO é o 6º bimestre do ano anterior", () => {
    const r = proximoVencimento("rreo", "2027-01-10")!;
    expect(r.periodo.rotulo).toBe("6º bimestre de 2026");
    expect(r.periodo.vencimento).toBe("2027-01-30");
  });
});
