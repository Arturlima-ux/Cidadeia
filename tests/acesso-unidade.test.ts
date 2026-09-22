import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ehGestor, podeVerUnidade, temAcessoSecretaria, caminhoDaUnidade, type SessaoPayload } from "@/lib/sessao";

// ── A GERÊNCIA DE UNIDADE SÓ VÊ A PRÓPRIA UNIDADE ──
// E nunca passa por "não é secretário, então é gestor".
const base = { usuarioId: "u", prefeituraId: "p", nome: "Carla" };
const unidade: SessaoPayload = { ...base, cargo: "unidade", unidadeId: "us_1" };
const secretario: SessaoPayload = { ...base, cargo: "secretario", secretaria: "saude" };
const prefeito: SessaoPayload = { ...base, cargo: "prefeito" };

describe("cargo unidade", () => {
  it("não é gestor; prefeito e admin são", () => {
    expect(ehGestor(unidade)).toBe(false);
    expect(ehGestor(secretario)).toBe(false);
    expect(ehGestor(prefeito)).toBe(true);
    expect(ehGestor({ cargo: "admin" })).toBe(true);
  });

  it("vê a própria unidade e nenhuma outra", () => {
    expect(podeVerUnidade(unidade, "us_1")).toBe(true);
    expect(podeVerUnidade(unidade, "us_2")).toBe(false);
    expect(podeVerUnidade(secretario, "us_2")).toBe(true);
    expect(podeVerUnidade({ ...base, cargo: "secretario", secretaria: "obras" }, "us_2")).toBe(false);
    expect(podeVerUnidade(prefeito, "us_2")).toBe(true);
  });

  it("tem acesso à saúde e a nenhuma outra secretaria", () => {
    expect(temAcessoSecretaria(unidade, "saude")).toBe(true);
    expect(temAcessoSecretaria(unidade, "obras")).toBe(false);
    expect(caminhoDaUnidade(unidade)).toBe("/dashboard/secretarias/saude/unidades/us_1");
    expect(caminhoDaUnidade(prefeito)).toBeNull();
  });

  it("nenhuma checagem no painel trata 'não é secretário' como gestor", () => {
    const { execSync } = require("node:child_process") as typeof import("node:child_process");
    const saida = execSync('grep -rln "cargo === \\"secretario\\"\|cargo !== \\"secretario\\"" src/app/dashboard src/app/api src/lib || true', { encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      // estes usam a comparação para rótulo ou para a própria secretaria, não como "é gestor"
      .filter((f) => !/conta\/page\.tsx|relatorios\/secretaria|layout\.tsx|rede-actions\.ts|unidades\/\[id\]\/page\.tsx/.test(f));
    expect(saida).toEqual([]);
  });

  it("as ações de ocorrência conferem a unidade; o proxy prende o cargo à ficha", () => {
    const acoes = readFileSync("src/app/dashboard/secretarias/saude/rede-actions.ts", "utf8");
    expect((acoes.match(/podeVerUnidade\(/g) ?? []).length).toBeGreaterThanOrEqual(2);
    const proxy = readFileSync("src/proxy.ts", "utf8");
    expect(proxy).toContain('sessao.cargo === "unidade"');
  });
});
