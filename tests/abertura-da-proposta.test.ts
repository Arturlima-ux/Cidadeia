import { describe, it, expect, vi } from "vitest";
vi.mock("@/db", () => ({ db: {} }));
import { chaveDaProposta, pedidoDaChave, pareceRobo, cedoDemais, linkRastreavel } from "@/lib/abertura-da-proposta";

const SEGREDO = "segredo-de-teste-com-mais-de-32-caracteres";

describe("abertura da proposta", () => {
  it("a chave abre só o próprio pedido", () => {
    const chave = chaveDaProposta("prop_abc12345", SEGREDO)!;
    expect(pedidoDaChave(chave, SEGREDO)).toBe("prop_abc12345");
    // Trocar o id mantendo a assinatura não abre outro pedido.
    expect(pedidoDaChave(chave.replace("prop_abc12345", "prop_abc12346"), SEGREDO)).toBeNull();
    // Outro segredo, outra assinatura.
    expect(pedidoDaChave(chave, SEGREDO + "x")).toBeNull();
    expect(pedidoDaChave("lixo", SEGREDO)).toBeNull();
  });

  it("sem segredo não há chave nem link rastreável", () => {
    expect(chaveDaProposta("prop_abc12345", null)).toBeNull();
    expect(pedidoDaChave("prop_abc12345.xxxxxxxxxxxxxxxxxxxxxx", null)).toBeNull();
  });

  it("robôs de segurança do e-mail não contam como abertura", () => {
    expect(pareceRobo("Mozilla/5.0 (compatible; Microsoft SafeLinks)")).toBe(true);
    expect(pareceRobo("python-requests/2.31")).toBe(true);
    expect(pareceRobo(null)).toBe(true);
    expect(pareceRobo("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36")).toBe(false);
  });

  it("abertura nos dois primeiros minutos depois do envio é o filtro do e-mail", () => {
    const envio = "2026-10-13T12:00:00.000Z";
    expect(cedoDemais(envio, Date.parse(envio) + 30_000)).toBe(true);
    expect(cedoDemais(envio, Date.parse(envio) + 5 * 60_000)).toBe(false);
    expect(cedoDemais(null, Date.now())).toBe(false);
  });

  it("os três links passam pela rota rastreável quando há segredo", () => {
    const antes = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = SEGREDO;
    try {
      expect(linkRastreavel("https://x.br", "prop_abc12345", "proposta", "ABC12345")).toMatch(/^https:\/\/x\.br\/proposta\/ver\/prop_abc12345\.[A-Za-z0-9_-]{22}$/);
      expect(linkRastreavel("https://x.br", "prop_abc12345", "kit", "ABC12345")).toMatch(/\?ir=kit$/);
    } finally {
      process.env.AUTH_SECRET = antes;
    }
  });
});
