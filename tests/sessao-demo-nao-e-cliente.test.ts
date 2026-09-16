import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// ── A DEMONSTRAÇÃO NÃO PODE SE PASSAR POR CONTA ──
//
// Com a sessão da demo aberta, a home tratava o visitante como cliente: o
// topo mostrava "Ir para o painel" e o clique caía no painel fictício de
// Vila Nova. Quem apertou achou que estava entrando na conta da própria
// prefeitura.
//
// Qualquer página que informe a sessão ao cabeçalho precisa descontar a
// demo. O teste lê o código porque é ali que o descuido volta.

describe("sessão de demonstração não vale como cliente no site público", () => {
  it("a home não passa a sessão da demo como sessão ativa", () => {
    const home = readFileSync("src/app/page.tsx", "utf8");
    const uso = home.match(/<SiteHeader[^>]*sessaoAtiva=\{([^}]*)\}/);
    expect(uso, "a home precisa informar sessaoAtiva ao SiteHeader").not.toBeNull();
    expect(uso![1]).toMatch(/demo/);
  });

  it("nenhuma página passa Boolean(sessao) cru para o cabeçalho", () => {
    const arquivos = ["src/app/page.tsx"];
    for (const a of arquivos) {
      const fonte = readFileSync(a, "utf8");
      expect(fonte).not.toMatch(/sessaoAtiva=\{Boolean\(sessao\)\}/);
    }
  });
});
