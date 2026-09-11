import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// ── A TABELA DE MUNICÍPIOS NÃO VAI PARA O NAVEGADOR ──
// 200 KB de JSON foram parar num chunk do cliente porque um formulário
// importava uma função pura de um módulo que, três importações adiante,
// carregava a tabela. Nenhum arquivo "use client" pode importar, direta ou
// indiretamente, os módulos que a carregam.

const MODULOS_DE_SERVIDOR = ["@/lib/municipios", "@/lib/siconfi", "@/lib/populacao-ibge", "@/lib/raio-x", "@/dados/municipios.json"];

function varrer(dir: string, saida: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) varrer(caminho, saida);
    else if (/\.(ts|tsx)$/.test(nome)) saida.push(caminho);
  }
  return saida;
}

describe("tabela de municípios", () => {
  it("nenhum componente cliente importa módulo que carrega a tabela", () => {
    const clientes = varrer("src").filter((f) => /^\s*"use client";/m.test(readFileSync(f, "utf8")));
    const culpados: string[] = [];
    for (const f of clientes) {
      const codigo = readFileSync(f, "utf8");
      // `import type` não vai para o bundle — só o import de valor conta.
      const imports = [...codigo.matchAll(/^import\s+(?!type\s)[^;]*?from\s+"([^"]+)"/gm)].map((m) => m[1]);
      for (const m of imports) if (MODULOS_DE_SERVIDOR.includes(m)) culpados.push(`${f} → ${m}`);
    }
    expect(culpados).toEqual([]);
  });
});
