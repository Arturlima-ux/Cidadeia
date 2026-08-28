import { describe, it, expect } from "vitest";
import {
  verificarBloqueio,
  registrarTentativaFalha,
  limparTentativas,
  limitarUso,
} from "@/lib/rate-limit";

describe("rate limiting de login", () => {
  it("documento sem tentativas não está bloqueado", async () => {
    expect(await verificarBloqueio("doc-fresh-1")).toBeNull();
  });

  it("não bloqueia antes de atingir o limite (5 tentativas)", async () => {
    const documento = "doc-abaixo-limite";
    for (let i = 0; i < 4; i++) {
      await registrarTentativaFalha(documento);
    }
    expect(await verificarBloqueio(documento)).toBeNull();
  });

  it("bloqueia ao atingir a 5ª tentativa falha seguida", async () => {
    const documento = "doc-no-limite";
    for (let i = 0; i < 5; i++) {
      await registrarTentativaFalha(documento);
    }
    const minutos = await verificarBloqueio(documento);
    expect(minutos).not.toBeNull();
    expect(minutos!).toBeGreaterThan(0);
    expect(minutos!).toBeLessThanOrEqual(15);
  });

  it("limparTentativas remove o bloqueio (login bem-sucedido reseta)", async () => {
    const documento = "doc-reset";
    for (let i = 0; i < 5; i++) {
      await registrarTentativaFalha(documento);
    }
    expect(await verificarBloqueio(documento)).not.toBeNull();

    await limparTentativas(documento);
    expect(await verificarBloqueio(documento)).toBeNull();
  });
});

describe("limitarUso (protege endpoints caros: IA, importação SICONFI)", () => {
  it("permite chamadas dentro do limite da janela", async () => {
    for (let i = 0; i < 3; i++) {
      expect(await limitarUso("ia:usuario-a", 3, 10)).toBe(true);
    }
  });

  it("bloqueia ao estourar o limite", async () => {
    for (let i = 0; i < 2; i++) await limitarUso("ia:usuario-b", 2, 10);
    expect(await limitarUso("ia:usuario-b", 2, 10)).toBe(false);
  });

  it("chaves diferentes não compartilham contador (um usuário não bloqueia outro)", async () => {
    await limitarUso("ia:usuario-c", 1, 10);
    expect(await limitarUso("ia:usuario-c", 1, 10)).toBe(false);
    // usuário diferente continua liberado
    expect(await limitarUso("ia:usuario-d", 1, 10)).toBe(true);
  });

  it("libera de novo quando a janela expira", async () => {
    // janela de 0 minutos = qualquer chamada seguinte já está fora da janela
    await limitarUso("ia:usuario-e", 1, 0);
    expect(await limitarUso("ia:usuario-e", 1, 0)).toBe(true);
  });
});
