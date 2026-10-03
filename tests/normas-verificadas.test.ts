import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  NORMAS_VERIFICADAS,
  TOTAL_ARTIGOS,
  TOTAL_NORMAS,
} from "@/lib/normas-verificadas";

// ── O NÚMERO DA FAIXA PRECISA SER VERDADE ──
//
// A faixa de números da home existe para dizer "não peça fé, confira". Um
// número grande e falso ali vale menos que nenhum número: o visitante
// desconta mentalmente para zero, e leva a desconfiança para o resto da
// página.
//
// Estes testes não medem estilo. Medem se a lista continua auditável.

describe("a lista é conferível", () => {
  it("todo arquivo citado existe", () => {
    // É o que separa esta lista de uma lista de marketing: quem duvida abre o
    // arquivo. Se um módulo for renomeado e ninguém atualizar aqui, a
    // promessa de conferência quebra em silêncio.
    const faltando = NORMAS_VERIFICADAS.filter(
      (n) => !existsSync(join(process.cwd(), "src", n.onde))
    ).map((n) => `${n.artigo} → ${n.onde}`);
    expect(faltando).toEqual([]);
  });

  it("nenhum artigo aparece duas vezes na mesma norma", () => {
    // Contar duplicata é a forma mais fácil de inflar a faixa sem mentir
    // explicitamente. Era o defeito do `grep` que esta lista substituiu.
    const chaves = NORMAS_VERIFICADAS.map((n) => `${n.norma}|${n.artigo}`);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("todo item diz o que a regra faz, não só que a norma existe", () => {
    for (const n of NORMAS_VERIFICADAS) {
      expect(n.oQueVerifica.length, n.artigo).toBeGreaterThan(30);
      expect(n.artigo.length, n.artigo).toBeGreaterThan(4);
      expect(n.norma.length, n.artigo).toBeGreaterThan(8);
    }
  });

  it("os totais são derivados, nunca escritos à mão", () => {
    expect(TOTAL_ARTIGOS).toBe(NORMAS_VERIFICADAS.length);
    expect(TOTAL_NORMAS).toBe(new Set(NORMAS_VERIFICADAS.map((n) => n.norma)).size);
  });

  it("a lista cobre mais de um módulo", () => {
    // Uma lista inteira de um módulo só significaria que a faixa está
    // vendendo a parte como se fosse o todo.
    expect(new Set(NORMAS_VERIFICADAS.map((n) => n.modulo)).size).toBeGreaterThanOrEqual(4);
  });

  it("é grande o bastante para valer a faixa, e pequena o bastante para ser lida", () => {
    expect(TOTAL_ARTIGOS).toBeGreaterThanOrEqual(20);
    expect(TOTAL_ARTIGOS).toBeLessThan(80);
  });
});
