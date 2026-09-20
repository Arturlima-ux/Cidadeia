import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { modoDoPortal } from "@/lib/endereco-publico";

// ── O ENDEREÇO PÚBLICO EXISTE PARA TODA PREFEITURA ──
// Sem Essencial: portal mínimo (identificação, canais, dado do Tesouro).
// Com Essencial: o completo. Nunca 404 para um município cadastrado.
describe("endereço público", () => {
  it("decide o modo pelo Essencial", () => {
    expect(modoDoPortal("[]")).toBe("minimo");
    expect(modoDoPortal('["saude","obras"]')).toBe("minimo");
    expect(modoDoPortal('["essencial"]')).toBe("completo");
    expect(modoDoPortal(null)).toBe("minimo");
  });

  it("a página do portal não responde 404 por falta de Essencial", () => {
    const pagina = readFileSync("src/app/transparencia/[slug]/page.tsx", "utf8");
    expect(pagina).toContain("PortalMinimo");
    expect(pagina).not.toMatch(/includes\("essencial"\)\) notFound\(\)/);
  });

  it("o portal mínimo não tem formulário de protocolo — não promete canal que não responde", () => {
    const minimo = readFileSync("src/app/transparencia/PortalMinimo.tsx", "utf8");
    expect(minimo).not.toContain("FormularioCidadao");
    expect(minimo).toContain("Raio-X");
  });

  it("o endereço nasce com a conta", () => {
    const cadastro = readFileSync("src/app/cadastro/actions.ts", "utf8");
    expect(cadastro).toContain("garantirEnderecoPublico(");
  });
});
