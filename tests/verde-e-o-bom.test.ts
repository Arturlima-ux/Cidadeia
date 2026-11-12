import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// ── META ATINGIDA É VERDE, SEMPRE (nov/2026) ──
// Pedido do fundador. Com o tema brasa, --accent virou laranja, e "Meta
// atingida", "Sem pendência", "cumprido" e "subiu" passaram a sair na mesma
// cor da marca: o bom não se distinguia do destaque. O bom é --info (verde),
// como a variação boa da Visão do prefeito; o ruim é --urgente.

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? arquivos(p) : p.endsWith(".tsx") ? [p] : [];
  });
}

describe("o que está bom aparece em verde no painel", () => {
  const telas = [...arquivos("src/app/dashboard"), "src/components/MarcadorSituacao.tsx"];

  it("nenhum estado bom usa a cor laranja de destaque", () => {
    const culpados = telas.filter((f) =>
      /\b(atingido|cumprido|ok|normal): (\{ cor: )?"var\(--accent\)"/.test(readFileSync(f, "utf8"))
    );
    expect(culpados).toEqual([]);
  });

  it("mensagem de sucesso também é verde", () => {
    const culpados = telas.filter((f) => /"erro" \? "var\(--urgente\)" : "var\(--accent\)"/.test(readFileSync(f, "utf8")));
    expect(culpados).toEqual([]);
  });
});
