import { describe, expect, it } from "vitest";
import { cidadesComGancho, contarPorFaixa, fraseDoGancho } from "@/lib/ganchos-prospeccao";
import type { LinhaReserva } from "@/lib/rgf-reserva";

// [exercício, periodicidade, período, mês, RCL ajustada, RCL, despesa, alerta, prudencial, máximo, reserva, instituição]
const linha = (rclAj: number, despesa: number): LinhaReserva => [2026, "Q", 2, 8, rclAj, rclAj, despesa, null, null, null, 0, "Prefeitura"];
const dados = {
  geradoEm: "2026-11-02",
  m: {
    "2211001": linha(1000, 560), // Teresina/PI: 56% (acima)
    "1100015": linha(1000, 520), // Alta Floresta D'Oeste/RO: 52% (prudencial)
    "1100023": linha(1000, 490), // Ariquemes/RO: 49% (alerta)
    "1100031": linha(1000, 400), // Cabixi/RO: 40% (sem gancho)
    "1100049": linha(1000, 950), // Cacoal/RO: 95% (número que não fecha)
    "1100056": linha(0, 300), // sem RCL
    "5300108": linha(1000, 600), // Brasília: limites de estado
  } as Record<string, LinhaReserva>,
};

describe("quem abordar, e com qual número", () => {
  it("só entra quem está no alerta, no prudencial ou acima, na ordem da faixa", () => {
    const l = cidadesComGancho({}, dados);
    expect(l.map((x) => [x.municipio, x.faixa])).toEqual([
      ["Teresina", "acima"],
      ["Alta Floresta D'Oeste", "prudencial"],
      ["Ariquemes", "alerta"],
    ]);
  });

  it("filtra por estado e deixa de fora quem já está na mesa", () => {
    expect(cidadesComGancho({ uf: "RO" }, dados).map((x) => x.municipio)).toEqual(["Alta Floresta D'Oeste", "Ariquemes"]);
    expect(cidadesComGancho({ ignorar: new Set(["2211001"]) }, dados)[0].municipio).toBe("Alta Floresta D'Oeste");
  });

  it("o gancho diz o número, o período e a régua certa da LRF", () => {
    expect(fraseDoGancho(52.44, "prudencial", "RGF do 2º quadrimestre de 2026")).toBe(
      "Despesa com pessoal em 52,4% da receita corrente líquida no RGF do 2º quadrimestre de 2026, acima do limite prudencial da LRF (51,3%)"
    );
    expect(cidadesComGancho({}, dados)[0].gancho).toMatch(/acima do limite de 54,0% da LRF$/);
  });

  it("conta cada faixa", () => {
    expect(contarPorFaixa(cidadesComGancho({}, dados))).toEqual({ acima: 1, prudencial: 1, alerta: 1 });
  });

  it("dentro da faixa, a cidade maior vem antes; número alto demais pede conferência", () => {
    const d = { geradoEm: "2026-11-02", m: { "2211001": linha(1000, 560), "2207702": linha(1000, 750) } as Record<string, LinhaReserva> };
    const l = cidadesComGancho({}, d);
    expect(l[0].municipio).toBe("Teresina"); // 56%, mas muito maior que Parnaíba
    expect(l.find((x) => x.municipio === "Parnaíba")?.conferir).toBe(true);
    expect(l[0].conferir).toBe(false);
  });

  it("com os dados reais da vigia, a lista sai e respeita a régua", () => {
    const l = cidadesComGancho();
    expect(l.length).toBeGreaterThan(0);
    expect(l.every((x) => x.pct >= 48.6 && x.pct <= 90 && x.uf !== "DF")).toBe(true);
  });
});
