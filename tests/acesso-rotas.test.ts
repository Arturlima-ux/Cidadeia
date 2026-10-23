import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { destinoDoSecretario, redirecionarSecretario } from "@/lib/acesso-rotas";

describe("o secretário só abre o que é dele (lib/acesso-rotas.ts)", () => {
  it("abre a própria secretaria e as telas que filtram por área", () => {
    for (const caminho of [
      "/dashboard/secretarias/saude",
      "/dashboard/secretarias/saude/aps",
      "/dashboard/secretarias/saude/unidades/us_1",
      "/dashboard/ia",
      "/dashboard/alertas",
      "/dashboard/atendimento",
      "/dashboard/conta",
      "/dashboard/dados",
    ]) {
      expect(redirecionarSecretario(caminho, "saude"), caminho).toBeNull();
    }
  });

  // As nove telas da prefeitura inteira que a lista negativa deixava abertas
  // em outubro de 2026, mais as que ela já barrava.
  it("volta para a secretaria em qualquer visão da prefeitura inteira", () => {
    for (const caminho of [
      "/dashboard",
      "/dashboard/financeiro",
      "/dashboard/pessoal",
      "/dashboard/emendas",
      "/dashboard/mapa",
      "/dashboard/apresentacao",
      "/dashboard/publicacoes",
      "/dashboard/implantacao",
      "/dashboard/dados/importar",
      "/dashboard/configuracoes",
      "/dashboard/historico",
      "/dashboard/valor",
      "/dashboard/auditoria",
      "/dashboard/planos",
      "/dashboard/modulos",
      "/dashboard/modulos/marketplace",
      "/dashboard/central",
      "/dashboard/eficacia",
      "/dashboard/prestacao",
      "/dashboard/uma-tela-que-ainda-vai-existir",
    ]) {
      expect(redirecionarSecretario(caminho, "obras"), caminho).toBe("/dashboard/secretarias/obras");
    }
  });

  it("não entra em outra secretaria, nem por prefixo parecido", () => {
    expect(redirecionarSecretario("/dashboard/secretarias/educacao", "saude")).toBe("/dashboard/secretarias/saude");
    expect(redirecionarSecretario("/dashboard/secretarias/saude-extra", "saude")).toBe("/dashboard/secretarias/saude");
    expect(redirecionarSecretario("/dashboard/iaextra", "saude")).toBe("/dashboard/secretarias/saude");
  });

  it("os mínimos são das áreas que têm mínimo (15% saúde, 25% e FUNDEB educação)", () => {
    expect(redirecionarSecretario("/dashboard/minimos", "saude")).toBeNull();
    expect(redirecionarSecretario("/dashboard/minimos", "educacao")).toBeNull();
    expect(redirecionarSecretario("/dashboard/minimos", "obras")).toBe("/dashboard/secretarias/obras");
    expect(redirecionarSecretario("/dashboard/minimos", "licitacoes")).toBe("/dashboard/secretarias/licitacoes");
  });

  it("sem secretaria válida não fica em laço de redirecionamento", () => {
    // Antes: destino "/dashboard", que o proxy barra para secretário.
    expect(destinoDoSecretario(null)).toBe("/dashboard/conta");
    expect(destinoDoSecretario("inventada")).toBe("/dashboard/conta");
    expect(redirecionarSecretario("/dashboard", null)).toBe("/dashboard/conta");
    expect(redirecionarSecretario("/dashboard/conta", null)).toBeNull();
    expect(redirecionarSecretario("/dashboard/secretarias/inventada", "inventada")).toBe("/dashboard/conta");
  });

  it("o proxy usa a lista positiva, não uma lista de rotas barradas", () => {
    const proxy = readFileSync("src/proxy.ts", "utf8");
    expect(proxy).toContain("redirecionarSecretario(pathname, sessao.secretaria)");
    expect(proxy).not.toContain("ROTAS_RESTRITAS_A_PREFEITO_ADMIN");
  });
});
