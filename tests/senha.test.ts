import { describe, it, expect } from "vitest";
import { gerarHashSenha, verificarSenha, senhaForte } from "@/lib/senha";

describe("senhaForte", () => {
  it("rejeita senha curta", () => {
    expect(senhaForte("abc123").ok).toBe(false);
  });

  it("rejeita senha só com letras", () => {
    expect(senhaForte("apenasletras").ok).toBe(false);
  });

  it("rejeita senha só com números", () => {
    expect(senhaForte("12345678").ok).toBe(false);
  });

  it("aceita senha com letras e números e 8+ caracteres", () => {
    expect(senhaForte("senha1234").ok).toBe(true);
  });
});

describe("hash de senha", () => {
  it("verifica corretamente a senha certa e rejeita a errada", async () => {
    const hash = await gerarHashSenha("minhaSenha123");
    expect(await verificarSenha("minhaSenha123", hash)).toBe(true);
    expect(await verificarSenha("outraSenha123", hash)).toBe(false);
  });

  it("nunca guarda a senha em texto puro no hash", async () => {
    const hash = await gerarHashSenha("senhaSecreta123");
    expect(hash).not.toContain("senhaSecreta123");
  });
});
