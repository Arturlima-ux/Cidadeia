import { describe, it, expect } from "vitest";
import { PRIORIDADE, estiloPrioridade } from "@/components/BadgePrioridade";

describe("estiloPrioridade", () => {
  it("resolve as três prioridades conhecidas", () => {
    expect(estiloPrioridade("urgente")).toBe(PRIORIDADE.urgente);
    expect(estiloPrioridade("medio")).toBe(PRIORIDADE.medio);
    expect(estiloPrioridade("info")).toBe(PRIORIDADE.info);
  });

  it("cai em 'info' para valor desconhecido em vez de quebrar", () => {
    // O banco guarda prioridade como texto; se um dia entrar um valor fora
    // do enum (migração, seed manual), a tela não pode renderizar `undefined`.
    expect(estiloPrioridade("qualquer-coisa")).toBe(PRIORIDADE.info);
    expect(estiloPrioridade("")).toBe(PRIORIDADE.info);
  });

  it("toda prioridade tem cor, fundo e borda definidos", () => {
    for (const chave of ["urgente", "medio", "info"] as const) {
      const e = PRIORIDADE[chave];
      expect(e.label).toBeTruthy();
      expect(e.cor).toMatch(/^var\(--/);
      expect(e.fundo).toMatch(/^var\(--/);
      expect(e.borda).toMatch(/^var\(--/);
    }
  });
});
