import { describe, expect, it } from "vitest";
import { classificarArea } from "@/lib/classificar-manifestacao";
import { rascunhoDeResposta } from "@/lib/rascunho-resposta";
import { achadosDoRadar, radarDaTransparencia, type EntradaRadar } from "@/lib/radar-transparencia";
import type { ItemDaCidade } from "@/lib/pergunte-a-cidade";

describe("a manifestação vai sozinha para a secretaria certa", () => {
  it("lê o texto", () => {
    expect(classificarArea("Buraco enorme na rua", "Tem uma cratera na frente da minha casa")).toBe("obras");
    expect(classificarArea("Falta remédio no posto", "A UBS do bairro está sem dipirona")).toBe("saude");
    expect(classificarArea("Merenda da escola", "Meu filho disse que não teve merenda")).toBe("educacao");
    expect(classificarArea("Pregão suspeito", "A mesma empresa vencedora de sempre")).toBe("licitacoes");
  });
  it("na dúvida e na denúncia, gabinete", () => {
    expect(classificarArea("Quero falar com o prefeito", "Assunto pessoal")).toBeNull();
    expect(classificarArea("Problemas no bairro", "Buraco e cratera na rua, e falta remédio na UBS")).toBeNull();
    expect(classificarArea("Buraco na rua", "Cratera", "denuncia")).toBeNull();
    // "upa" não casa dentro de "ocupação"
    expect(classificarArea("Ocupação irregular", "Ocupação de calçada")).not.toBe("saude");
  });
});

describe("o rascunho da resposta", () => {
  const ubs: ItemDaCidade = {
    id: "u:1", tipo: "saude" as ItemDaCidade["tipo"], titulo: "UBS Centro", resposta: "Atende de segunda a sexta",
    detalhes: ["Rua A, 10", "Telefone (86) 3333-0000"], link: null, termos: "", peso: 1,
  };
  it("usa o que o portal sabe e deixa colchete no que não sabe", () => {
    const t = rascunhoDeResposta({ tipo: "protocolo", nome: "Maria Silva", assunto: "Vacina da gripe", municipio: "Jerumenha", area: "saude", encontrados: [ubs] });
    expect(t).toContain("Olá, Maria.");
    expect(t).toContain("Secretaria de Saúde");
    expect(t).toContain("UBS Centro: Atende de segunda a sexta");
    expect(t).toContain("Telefone (86) 3333-0000");
    expect(t).toMatch(/\[.+\]/);
  });
  it("pedido de informação cita a LAI e o recurso", () => {
    const t = rascunhoDeResposta({ tipo: "informacao", nome: null, assunto: "Gastos com festa", municipio: "X", area: null, encontrados: [] });
    expect(t).toContain("Lei 12.527/2011");
    expect(t).toContain("art. 15");
    expect(t.startsWith("Olá.")).toBe(true);
  });
});

describe("o radar da transparência", () => {
  const base: EntradaRadar = {
    portalAtivo: true, publicadas: [], financeiro: { atualizadoEm: "2026-10-10 10:00:00-03", automatico: true },
    compras: 3, contratos: 2, obras: 1, emendas: 2, importaLicitacoes: true, importaObras: true,
  };
  const hoje = new Date("2026-10-20T12:00:00Z");
  it("separa o que o portal cumpre sozinho do que falta publicar", () => {
    const r = radarDaTransparencia(base, hoje);
    const falta = r.filter((i) => i.situacao !== "ok").map((i) => i.chave);
    expect(falta).toEqual(["estrutura", "servicos", "faq"]);
    expect(r.find((i) => i.chave === "repasses")!.sozinho).toBe(true);
    const a = achadosDoRadar(r);
    expect(a.map((x) => x.chave)).toEqual(["radar:estrutura:falta", "radar:servicos:falta", "radar:faq:falta"]);
    expect(a.find((x) => x.chave === "radar:estrutura:falta")!.prioridade).toBe("medio");
  });
  it("financeiro velho e portal desligado", () => {
    const r = radarDaTransparencia({ ...base, financeiro: { atualizadoEm: "2026-06-01 10:00:00-03", automatico: false }, portalAtivo: false, publicadas: [{ tipo: "estrutura" }, { tipo: "servico" }, { tipo: "faq" }] }, hoje);
    expect(r.find((i) => i.chave === "financeiro")!.situacao).toBe("velho");
    expect(r.find((i) => i.chave === "sic")!.situacao).toBe("falta");
    expect(achadosDoRadar(r).map((x) => x.chave)).toEqual(["radar:financeiro:velho"]);
  });
});
