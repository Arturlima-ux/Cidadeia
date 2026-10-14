import { describe, expect, it } from "vitest";
import { areaDoAlerta, podeVerAlerta, repartirAvisos, type Pessoa } from "@/lib/alerta-por-area";

describe("a área do alerta", () => {
  it("reconhece a chave da vigia e o texto livre de quem cria à mão", () => {
    expect(areaDoAlerta("saude")).toBe("saude");
    expect(areaDoAlerta("Secretaria de Saúde")).toBe("saude");
    expect(areaDoAlerta("EDUCAÇÃO")).toBe("educacao");
    expect(areaDoAlerta("Obras e infraestrutura")).toBe("obras");
    expect(areaDoAlerta("Licitações e contratos")).toBe("licitacoes");
    expect(areaDoAlerta("Gabinete")).toBeNull();
    expect(areaDoAlerta(null)).toBeNull();
  });
});

describe("quem vê", () => {
  it("o secretário vê só a área dele; o gabinete vê tudo", () => {
    const saude = { cargo: "secretario", secretaria: "saude" };
    expect(podeVerAlerta(saude, { secretaria: "saude" })).toBe(true);
    expect(podeVerAlerta(saude, { secretaria: "Secretaria de Saúde" })).toBe(true);
    expect(podeVerAlerta(saude, { secretaria: "educacao" })).toBe(false);
    expect(podeVerAlerta(saude, { secretaria: null })).toBe(false);
    expect(podeVerAlerta({ cargo: "prefeito" }, { secretaria: "educacao" })).toBe(true);
    expect(podeVerAlerta({ cargo: "admin" }, { secretaria: null })).toBe(true);
  });

  it("unidade e escola não abrem a lista da prefeitura", () => {
    expect(podeVerAlerta({ cargo: "unidade", secretaria: null }, { secretaria: "saude" })).toBe(false);
    expect(podeVerAlerta({ cargo: "escola", secretaria: null }, { secretaria: "educacao" })).toBe(false);
  });
});

describe("quem recebe o e-mail", () => {
  const equipe: Pessoa[] = [
    { email: "prefeito@x", cargo: "prefeito", secretaria: null },
    { email: "adm@x", cargo: "admin", secretaria: null },
    { email: "saude@x", cargo: "secretario", secretaria: "saude" },
    { email: "edu@x", cargo: "secretario", secretaria: "educacao" },
    { email: null, cargo: "secretario", secretaria: "obras" },
  ];
  const a = (secretaria: string | null, prioridade: string) => ({ secretaria, prioridade });

  it("o médio da Saúde vai ao secretário de Saúde e ao administrador, não ao prefeito", () => {
    const r = repartirAvisos([a("saude", "medio")], equipe);
    expect([...r.keys()].sort()).toEqual(["adm@x", "saude@x"]);
    expect(r.get("saude@x")!.papel).toBe("secretario");
  });

  it("o urgente da área chega também ao prefeito", () => {
    const r = repartirAvisos([a("educacao", "urgente")], equipe);
    expect([...r.keys()].sort()).toEqual(["adm@x", "edu@x", "prefeito@x"]);
  });

  it("o do gabinete vai a prefeito e administrador", () => {
    const r = repartirAvisos([a(null, "medio")], equipe);
    expect([...r.keys()].sort()).toEqual(["adm@x", "prefeito@x"]);
  });

  it("área sem secretário com e-mail sobe ao prefeito, mesmo sem ser urgente", () => {
    const r = repartirAvisos([a("obras", "medio")], equipe);
    expect([...r.keys()].sort()).toEqual(["adm@x", "prefeito@x"]);
  });

  it("cada um recebe só a sua parte, num e-mail só", () => {
    const itens = [a("saude", "medio"), a("educacao", "medio"), a(null, "urgente")];
    const r = repartirAvisos(itens, equipe);
    expect(r.get("saude@x")!.alertas).toEqual([itens[0]]);
    expect(r.get("prefeito@x")!.alertas).toEqual([itens[2]]);
    expect(r.get("adm@x")!.alertas).toHaveLength(3);
  });
});
