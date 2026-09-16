import { describe, it, expect } from "vitest";
import { ativarModulos, ehAdmin, modulosDoPedido, PROXIMO_STATUS, STATUS_PEDIDO } from "@/lib/pedidos";

describe("pedido de proposta → conta → acesso", () => {
  it("ativar une sem repetir e sem perder o que já estava", () => {
    expect(JSON.parse(ativarModulos("[]", ["saude"]))).toEqual(["saude"]);
    expect(JSON.parse(ativarModulos('["saude"]', ["saude", "obras"]))).toEqual(["saude", "obras"]);
    expect(JSON.parse(ativarModulos('["gestao"]', ["essencial"]))).toEqual(["essencial", "gestao"]);
    expect(JSON.parse(ativarModulos("lixo", ["saude"]))).toEqual(["saude"]);
  });

  it("módulos do pedido ignoram chave que não existe", () => {
    expect(modulosDoPedido('["saude","xpto"]')).toEqual(["saude"]);
    expect(modulosDoPedido(null)).toEqual([]);
  });

  it("o caminho é recebido → proposta_enviada → contratado, e para", () => {
    expect(PROXIMO_STATUS.recebido).toBe("proposta_enviada");
    expect(PROXIMO_STATUS.proposta_enviada).toBe("contratado");
    expect(PROXIMO_STATUS.contratado).toBeNull();
    for (const s of Object.values(STATUS_PEDIDO)) expect(s.paraOCliente.length).toBeGreaterThan(20);
  });

  it("admin é só quem está na lista — e sem lista, ninguém", () => {
    expect(ehAdmin("a@b.com", "a@b.com")).toBe(true);
    expect(ehAdmin("A@B.com ", " a@b.com, c@d.com")).toBe(true);
    expect(ehAdmin("x@y.com", "a@b.com")).toBe(false);
    expect(ehAdmin("a@b.com", undefined)).toBe(false);
    expect(ehAdmin("a@b.com", "")).toBe(false);
    expect(ehAdmin(null, "a@b.com")).toBe(false);
  });
});
