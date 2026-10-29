import { describe, expect, it } from "vitest";
import { PANORAMA, diaDaConferencia, faixasDoPanorama, variacaoDesde } from "@/lib/panorama";

describe("variação do panorama desde a conferência anterior", () => {
  it("diz quanto subiu, desceu ou se ficou igual, com a data sem o ano", () => {
    expect(variacaoDesde(790, 787, "2026-10-19")).toBe("3 a mais que em 19 de outubro");
    expect(variacaoDesde(514, 520, "2026-10-19")).toBe("6 a menos que em 19 de outubro");
    expect(variacaoDesde(522, 522, "2026-10-19")).toBe("igual a 19 de outubro");
    expect(variacaoDesde(2400, 1200, "2026-03-02")).toBe("1.200 a mais que em 2 de março");
  });

  it("sem conferência anterior, não inventa variação", () => {
    expect(variacaoDesde(790, undefined, "2026-10-19")).toBeNull();
    expect(variacaoDesde(790, 787, undefined)).toBeNull();
    expect(faixasDoPanorama(PANORAMA.brasil).every((f) => f.variacao === null)).toBe(true);
  });

  it("as faixas comparam cada uma com o seu próprio número anterior", () => {
    const agora = { ...PANORAMA.brasil, acimaDoLimite: 10, prudencial: 20, alerta: 30 };
    const antes = { ...PANORAMA.brasil, acimaDoLimite: 12, prudencial: 20, alerta: 25 };
    const v = Object.fromEntries(faixasDoPanorama(agora, antes, "2026-10-19").map((f) => [f.chave, f.variacao]));
    expect(v).toEqual({
      acima: "2 a menos que em 19 de outubro",
      prudencial: "igual a 19 de outubro",
      alerta: "5 a mais que em 19 de outubro",
    });
  });

  it("o panorama publicado guarda a conferência anterior, mais antiga que a atual", () => {
    expect(PANORAMA.anterior).toBeTruthy();
    expect(PANORAMA.anterior!.geradoEm < PANORAMA.geradoEm).toBe(true);
    expect(diaDaConferencia(PANORAMA.anterior!.geradoEm)).toMatch(/^\d{1,2} de [a-zç]+$/);
    expect(Object.keys(PANORAMA.anterior!.porUf).length).toBe(Object.keys(PANORAMA.porUf).length);
  });
});
