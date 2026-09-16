import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PLANOS_ADDON } from "@/lib/planos";
import { detalheDoModulo } from "@/lib/modulos-detalhe";

// ── O QUE A HOME PROMETE É O QUE AS OUTRAS PÁGINAS DIZEM ──
//
// A home descrevia cada módulo com o resumo e as capacidades de
// lib/modulos-detalhe; /precos e o painel mostravam outra frase, vinda de
// lib/planos. Quem abria as duas telas via duas versões do mesmo produto e
// ficava sem saber qual valia — a pior dúvida possível para quem vai
// contratar.
//
// A frase é uma só. E a página que lista os módulos tem de mostrar as
// mesmas capacidades, não um resumo mais curto que a promessa.

describe("cada módulo é descrito por uma fonte só", () => {
  it("a descrição do plano é o resumo da home, palavra por palavra", () => {
    for (const plano of PLANOS_ADDON) {
      const detalhe = detalheDoModulo(plano.chave);
      expect(detalhe, `módulo ${plano.chave} sem detalhe`).toBeDefined();
      expect(plano.descricao, `módulo ${plano.chave}`).toBe(detalhe!.resumo);
    }
  });

  it("todo módulo tem capacidade e automação declaradas", () => {
    for (const plano of PLANOS_ADDON) {
      const detalhe = detalheDoModulo(plano.chave)!;
      expect(detalhe.capacidades.length, `módulo ${plano.chave}`).toBeGreaterThanOrEqual(4);
      for (const c of detalhe.capacidades) expect(c.length).toBeGreaterThan(15);
    }
  });

  it("a página de módulos lista as capacidades, em vez de resumir por conta própria", () => {
    const precos = readFileSync("src/app/precos/page.tsx", "utf8");
    expect(precos).toContain("detalheDoModulo");
    expect(precos).toContain("capacidades.map");
  });
});
