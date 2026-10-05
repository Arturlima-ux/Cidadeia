import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ehEquipe, codigoConfere, PREFEITURA_EQUIPE_ID } from "@/lib/equipe";

// ── QUEM É DA EQUIPE ──
//
// O furo que isto fecha: o e-mail do cadastro de prefeitura não é verificado.
// Bastava criar uma prefeitura com o e-mail que está em ADMIN_EMAILS para ver
// todos os pedidos e ligar módulos de graça. Ser da equipe agora exige as
// duas coisas: a conta interna E o e-mail na lista.

const LISTA = "equipe@cidadeia.com.br";

describe("ehEquipe", () => {
  it("conta interna com e-mail da lista: é da equipe", () => {
    expect(ehEquipe({ email: "equipe@cidadeia.com.br", prefeituraId: PREFEITURA_EQUIPE_ID }, LISTA)).toBe(true);
  });

  it("prefeitura qualquer com o e-mail da equipe: NÃO é da equipe", () => {
    expect(ehEquipe({ email: "equipe@cidadeia.com.br", prefeituraId: "pref_abc" }, LISTA)).toBe(false);
  });

  it("conta interna com e-mail fora da lista: não é", () => {
    expect(ehEquipe({ email: "outro@x.com", prefeituraId: PREFEITURA_EQUIPE_ID }, LISTA)).toBe(false);
  });

  it("sem usuário, sem lista: não é", () => {
    expect(ehEquipe(null, LISTA)).toBe(false);
    expect(ehEquipe({ email: "equipe@cidadeia.com.br", prefeituraId: PREFEITURA_EQUIPE_ID }, undefined)).toBe(false);
  });
});

describe("código de criação", () => {
  it("confere só o valor exato", () => {
    expect(codigoConfere("codigo-de-teste-123", "codigo-de-teste-123")).toBe(true);
    expect(codigoConfere(" codigo-de-teste-123 ", "codigo-de-teste-123")).toBe(true);
    expect(codigoConfere("codigo-de-teste-124", "codigo-de-teste-123")).toBe(false);
  });

  it("sem código configurado, ou código curto demais, ninguém cria conta", () => {
    expect(codigoConfere("qualquer", undefined)).toBe(false);
    expect(codigoConfere("curto", "curto")).toBe(false);
  });
});

describe("toda porta de /admin passa pela verificação da equipe", () => {
  function arquivos(dir: string, acc: string[] = []): string[] {
    for (const n of readdirSync(dir)) {
      const c = join(dir, n);
      if (statSync(c).isDirectory()) arquivos(c, acc);
      else if (/\.tsx?$/.test(n)) acc.push(c);
    }
    return acc;
  }

  it("nenhum arquivo de /admin confere ADMIN_EMAILS sozinho", () => {
    // ehAdmin() sozinho é exatamente o furo antigo. Em /admin, só emailDaEquipe().
    const culpados = arquivos("src/app/admin").filter((a) => /\behAdmin\(/.test(readFileSync(a, "utf8")));
    expect(culpados).toEqual([]);
  });

  it("páginas, ações e rotas de /admin chamam emailDaEquipe", () => {
    const portas = arquivos("src/app/admin").filter((a) => /(page|route|actions)\.tsx?$/.test(a));
    expect(portas.length).toBeGreaterThanOrEqual(6);
    const semGuarda = portas.filter((a) => !readFileSync(a, "utf8").includes("emailDaEquipe"));
    expect(semGuarda).toEqual([]);
  });
});
