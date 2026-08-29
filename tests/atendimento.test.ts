import { describe, it, expect } from "vitest";
import {
  gerarProtocolo,
  gerarChaveConsulta,
  chaveConfere,
  permiteAnonimo,
  linkWhatsApp,
  gerarSlug,
  TIPOS,
} from "@/lib/atendimento";

describe("gerarProtocolo", () => {
  it("usa o formato AAAAMM-XXXXXX", () => {
    const p = gerarProtocolo(new Date("2026-03-15T12:00:00Z"));
    expect(p).toMatch(/^202603-[A-Z2-9]{6}$/);
  });

  it("não é sequencial nem previsível (100 sorteios, nenhum repetido)", () => {
    const vistos = new Set(Array.from({ length: 100 }, () => gerarProtocolo()));
    expect(vistos.size).toBe(100);
  });

  it("evita caracteres que confundem quem anota à mão (I, O, 0, 1)", () => {
    const amostra = Array.from({ length: 60 }, () => gerarProtocolo()).join("");
    const sufixos = amostra.replace(/\d{6}-/g, "");
    expect(sufixos).not.toMatch(/[IO01]/);
  });
});

describe("chave de consulta", () => {
  it("tem 8 caracteres", () => {
    expect(gerarChaveConsulta()).toHaveLength(8);
  });

  it("confere corretamente, ignorando caixa e espaços", () => {
    const chave = "ABCD2345";
    expect(chaveConfere("abcd2345", chave)).toBe(true);
    expect(chaveConfere("  ABCD2345  ", chave)).toBe(true);
  });

  it("rejeita chave errada ou de tamanho diferente", () => {
    expect(chaveConfere("ABCD2346", "ABCD2345")).toBe(false);
    expect(chaveConfere("ABC", "ABCD2345")).toBe(false);
    expect(chaveConfere("", "ABCD2345")).toBe(false);
  });
});

describe("permiteAnonimo", () => {
  it("ouvidoria aceita anônimo (Lei 13.460/2017)", () => {
    expect(permiteAnonimo("denuncia")).toBe(true);
    expect(permiteAnonimo("reclamacao")).toBe(true);
    expect(permiteAnonimo("sugestao")).toBe(true);
    expect(permiteAnonimo("elogio")).toBe(true);
  });

  it("exige identificação onde a resposta é obrigatória", () => {
    // Sem identificação não há como executar o serviço nem entregar a resposta.
    expect(permiteAnonimo("protocolo")).toBe(false);
    expect(permiteAnonimo("informacao")).toBe(false);
  });

  it("todo tipo declarado tem regra definida", () => {
    for (const t of TIPOS) expect(typeof permiteAnonimo(t.chave)).toBe("boolean");
  });
});

describe("linkWhatsApp", () => {
  it("monta o link com a mensagem já preenchida", () => {
    const l = linkWhatsApp("5585999998888", "202603-ABC123", "Poda de árvore");
    expect(l).toContain("https://wa.me/5585999998888");
    expect(l).toContain(encodeURIComponent("202603-ABC123"));
  });

  it("limpa máscara do número", () => {
    const l = linkWhatsApp("+55 (85) 99999-8888", "202603-ABC123", "x");
    expect(l).toContain("wa.me/5585999998888");
  });

  it("devolve null sem número configurado", () => {
    expect(linkWhatsApp(null, "202603-ABC123", "x")).toBeNull();
    expect(linkWhatsApp("", "202603-ABC123", "x")).toBeNull();
  });

  it("rejeita número curto demais para ter DDI+DDD", () => {
    expect(linkWhatsApp("99998888", "202603-ABC123", "x")).toBeNull();
  });
});

describe("gerarSlug", () => {
  it("remove acento e monta municipio-uf", () => {
    expect(gerarSlug("São João do Piauí", "PI")).toBe("sao-joao-do-piaui-pi");
    expect(gerarSlug("Fortaleza", "CE")).toBe("fortaleza-ce");
  });

  it("não deixa hífen sobrando nas pontas", () => {
    expect(gerarSlug("  Açu  ", "RN")).toBe("acu-rn");
  });

  it("nunca devolve string vazia", () => {
    expect(gerarSlug("", "")).toBe("municipio");
  });
});
