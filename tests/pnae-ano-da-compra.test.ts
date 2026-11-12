import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { anoDaCompra } from "@/lib/pnae";

describe("o ano da compra do PNAE é o da data da compra", () => {
  it("a nota de dezembro lançada em janeiro fica no ano dela", () => {
    expect(anoDaCompra("2026-12-28")).toBe(2026);
    expect(anoDaCompra("2027-01-03")).toBe(2027);
  });

  it("o lançamento não aceita mais o ano vindo da tela", () => {
    const acoes = readFileSync("src/app/dashboard/secretarias/educacao/merenda-actions.ts", "utf8");
    const trecho = acoes.slice(acoes.indexOf("export async function registrarCompraPnae"), acoes.indexOf("export async function removerCompraPnae"));
    expect(trecho).not.toMatch(/formData\.get\("ano"\)/);
    expect(trecho).toMatch(/anoDaCompra\(/);
  });

  it("lançar compra vem antes da lista de compras", () => {
    const tela = readFileSync("src/app/dashboard/secretarias/educacao/merenda/page.tsx", "utf8");
    expect(tela.indexOf("Lançar compra")).toBeLessThan(tela.indexOf("Compras de {ano}"));
  });
});
