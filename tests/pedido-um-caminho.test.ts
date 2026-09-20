import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// ── UM SÓ CAMINHO PARA REGISTRAR PEDIDO ──
// O formulário público e o botão do painel gravam, avisam e confirmam
// pela mesma função. Se um dos dois voltar a ter a própria cópia, os
// e-mails e o registro divergem sem ninguém notar.
describe("pedido de proposta tem um caminho só", () => {
  const publico = readFileSync("src/app/proposta/actions.ts", "utf8");
  const painel = readFileSync("src/app/dashboard/modulos/marketplace/actions.ts", "utf8");

  it("as duas ações chamam registrarPedidoProposta", () => {
    expect(publico).toContain("registrarPedidoProposta(");
    expect(painel).toContain("registrarPedidoProposta(");
  });

  it("nenhuma das duas grava na tabela por conta própria", () => {
    expect(publico).not.toMatch(/db\.insert\(pedidosProposta\)/);
    expect(painel).not.toMatch(/db\.insert\(pedidosProposta\)/);
  });

  it("o painel recusa demo, secretário e módulo já ativo", () => {
    expect(painel).toContain("sessao.demo");
    expect(painel).toContain('sessao.cargo === "secretario"');
    expect(painel).toContain("já está ativo");
  });
});
