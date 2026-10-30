import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { quadrosLentos } from "@/lib/modo-leve";

describe("modo leve: decidir pelos quadros medidos", () => {
  it("com poucos quadros, não decide", () => {
    expect(quadrosLentos(Array(39).fill(100))).toBe(false);
  });
  it("12% dos quadros acima de 34 ms liga o modo leve", () => {
    expect(quadrosLentos([...Array(88).fill(16.7), ...Array(12).fill(50)])).toBe(true);
    expect(quadrosLentos([...Array(89).fill(16.7), ...Array(11).fill(50)])).toBe(false);
  });
  it("34 ms ainda é quadro bom; 35 já é lento", () => {
    expect(quadrosLentos(Array(40).fill(34))).toBe(false);
    expect(quadrosLentos(Array(40).fill(35))).toBe(true);
  });
});

describe("modo leve: o palpite antes da primeira pintura", () => {
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  const css = readFileSync("src/app/globals.css", "utf8");
  it("o <head> marca data-leve com poucos núcleos ou pouca memória, e respeita a escolha guardada", () => {
    expect(layout).toMatch(/hardwareConcurrency<=2/);
    expect(layout).toMatch(/deviceMemory<=2/);
    expect(layout).toMatch(/cidadeia-leve-2/);
    expect(layout).toMatch(/setAttribute\("data-leve"/);
  });
  it("o CSS do modo leve leva tudo ao estado final e tira o desfoque do vidro", () => {
    const bloco = css.slice(css.indexOf("── MODO LEVE"));
    expect(bloco).toMatch(/animation: none !important/);
    expect(bloco).toMatch(/transition: none !important/);
    expect(bloco).toMatch(/backdrop-filter: none/);
  });
});
