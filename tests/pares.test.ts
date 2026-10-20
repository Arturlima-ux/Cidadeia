import { describe, expect, it } from "vitest";
import { compararComPares, faixaDe, fraseDaComparacao, MINIMO_DE_PARES } from "@/lib/pares";
import type { LinhaReserva } from "@/lib/rgf-reserva";

const linha = (pct: number, exercicio = 2026): LinhaReserva => [exercicio, "S", 1, 6, 100, 100, pct, 48.6, 51.3, 54, 0, "Prefeitura"];

function cenario(n: number, uf = "PI") {
  const municipios: [string, string, string, number | null][] = [["2200000", "Minha Cidade", uf, 12_000]];
  const m: Record<string, LinhaReserva> = { "2200000": linha(50) };
  for (let i = 1; i <= n; i++) {
    const cod = String(2200000 + i);
    municipios.push([cod, `Cidade ${i}`, uf, 11_000 + i]);
    m[cod] = linha(40 + i);
  }
  return { municipios, dados: { geradoEm: "2026-10-19", m } };
}

describe("cidades parecidas", () => {
  it("faixas do IBGE", () => {
    expect(faixaDe(4_000)).toBe(0);
    expect(faixaDe(12_000)).toBe(2);
    expect(faixaDe(600_000)).toBe(6);
  });

  it("posição, mediana e as que menos gastam no mesmo estado e porte", () => {
    const { municipios, dados } = cenario(12);
    const c = compararComPares("2200000", 50, { municipios, dados, hoje: new Date("2026-10-20") })!;
    expect(c.recorte).toBe("uf");
    expect(c.pares).toBe(12);
    expect(c.de).toBe(13);
    // pares em 41..52: nove abaixo de 50
    expect(c.posicao).toBe(10);
    expect(c.mediana).toBeCloseTo(46.5);
    expect(c.acimaDoPrudencial).toBe(1);
    expect(c.melhores.map((m) => m.nome)).toEqual(["Cidade 1", "Cidade 2", "Cidade 3"]);
    expect(fraseDaComparacao(c)).toContain("10ª menor das 13 cidades do PI");
  });

  it("com poucas no estado, compara com o país; sem ninguém, não compara", () => {
    const { municipios, dados } = cenario(MINIMO_DE_PARES - 1);
    // mais cidades do mesmo porte em outro estado
    for (let i = 1; i <= 5; i++) {
      municipios.push([`35${i}0000`, `Paulista ${i}`, "SP", 15_000]);
      dados.m[`35${i}0000`] = linha(45);
    }
    expect(compararComPares("2200000", 50, { municipios, dados, hoje: new Date("2026-10-20") })!.recorte).toBe("brasil");
    const vazio = cenario(2);
    expect(compararComPares("2200000", 50, { ...vazio, hoje: new Date("2026-10-20") })).toBeNull();
  });

  it("RGF de anos atrás não entra na conta", () => {
    const { municipios, dados } = cenario(12);
    for (const k of Object.keys(dados.m)) if (k !== "2200000") dados.m[k] = linha(30, 2023);
    expect(compararComPares("2200000", 50, { municipios, dados, hoje: new Date("2026-10-20") })).toBeNull();
  });
});

import { emailDaSegunda } from "@/lib/segunda-do-prefeito";
describe("na segunda do prefeito", () => {
  it("a comparação vai para o prefeito, não para o secretário", () => {
    const dados = { municipio: "X", abertos: [], vencimentos: [], resolvidos: [], linkPainel: "https://x", comparacao: "Despesa com pessoal em 48,3%: 10ª menor." };
    expect(emailDaSegunda(dados, new Date("2026-10-19"), "prefeito")!.html).toContain("Entre as cidades parecidas");
    expect(emailDaSegunda({ ...dados, abertos: [{ id: "a", titulo: "t", descricao: "", prioridade: "urgente", secretaria: "saude" }] } as never, new Date("2026-10-19"), "secretario", "saude")?.html ?? "").not.toContain("Entre as cidades parecidas");
  });
});
