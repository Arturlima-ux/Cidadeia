import { describe, expect, it } from "vitest";
import { edicaoDaCidade, edicaoDoBrasil, faixaDaDespesa, oQueMudou, prazosDaEdicao, type EdicaoDaCidade } from "@/lib/boletim-da-cidade";

// A edição de hoje da landing nova (/nova): prazos, faixa da despesa com
// pessoal e a frase do que mudou desde a última visita.

describe("faixaDaDespesa", () => {
  it("separa os três limites da LRF (48,6%, 51,3% e 54%)", () => {
    expect(faixaDaDespesa(45)).toBe("abaixo");
    expect(faixaDaDespesa(48.6)).toBe("alerta");
    expect(faixaDaDespesa(51.3)).toBe("prudencial");
    expect(faixaDaDespesa(54)).toBe("prudencial");
    expect(faixaDaDespesa(54.1)).toBe("acima");
  });
});

describe("prazosDaEdicao", () => {
  it("põe o prazo mais próximo primeiro e nunca conta dias negativos", () => {
    const p = prazosDaEdicao("2026-11-05");
    expect(p.length).toBeGreaterThan(0);
    for (let i = 1; i < p.length; i++) expect(p[i].dias).toBeGreaterThanOrEqual(p[i - 1].dias);
    for (const x of p) expect(x.dias).toBeGreaterThanOrEqual(0);
  });
});

describe("edicaoDaCidade", () => {
  it("abre a edição de uma capital com o porte e a sede no mapa", () => {
    const e = edicaoDaCidade("2211001", "2026-11-05"); // Teresina
    expect(e).not.toBeNull();
    expect(e!.municipio.nome).toBe("Teresina");
    expect(e!.sede).toBeDefined();
  });

  it("devolve nulo para um código que não é município", () => {
    expect(edicaoDaCidade("9999999", "2026-11-05")).toBeNull();
  });

  it("a edição do Brasil soma mais prefeituras do que as que passaram do alerta", () => {
    const b = edicaoDoBrasil("2026-11-05");
    expect(b.brasil.comNumero).toBeGreaterThan(b.brasil.passaramDoAlerta);
  });
});

describe("oQueMudou", () => {
  const agora = (pct: number, periodo: string): EdicaoDaCidade =>
    ({
      hoje: "2026-11-05",
      municipio: { codigo: "2201200", nome: "Barras", uf: "PI" },
      pessoal: { situacao: "lida", pct, periodo, faixa: faixaDaDespesa(pct), folgaAtePrudencial: 0 },
    }) as unknown as EdicaoDaCidade;

  it("fica calado na primeira visita e na mesma data", () => {
    expect(oQueMudou(null, agora(60.5, "2º quadrimestre de 2026"))).toBeNull();
    expect(oQueMudou({ codigo: "2201200", visto: "2026-11-05", pct: 60.5, periodo: "x" }, agora(60.5, "x"))).toBeNull();
  });

  it("conta a mudança do número desde o dia da semana da última visita", () => {
    const f = oQueMudou({ codigo: "2201200", visto: "2026-11-03", pct: 58.2, periodo: "x" }, agora(60.5, "x"));
    expect(f).toBe("Desde terça, a despesa com pessoal foi de 58,2% para 60,5%.");
  });

  it("avisa quando saiu um RGF novo", () => {
    const f = oQueMudou({ codigo: "2201200", visto: "2026-11-04", pct: 58.2, periodo: "1º quadrimestre de 2026" }, agora(60.5, "2º quadrimestre de 2026"));
    expect(f).toContain("ontem, saiu o 2º quadrimestre de 2026");
  });

  it("sem número novo, diz que nada mudou", () => {
    const f = oQueMudou({ codigo: "2201200", visto: "2026-10-20", pct: 60.5, periodo: "x" }, agora(60.5, "x"));
    expect(f).toBe("Desde 20 de outubro, nenhum número novo no Tesouro. O próximo prazo chegou mais perto.");
  });
});
