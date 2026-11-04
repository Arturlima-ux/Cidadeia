import { describe, expect, it } from "vitest";
import {
  aberturasPorProspecto,
  funilPorOrigem,
  lerCampanha,
  linkMarcado,
  origemDaCampanha,
  rotuloDaOrigem,
} from "@/lib/links-de-campanha";

const BASE = "https://cidadeia.vercel.app";

describe("o link marcado", () => {
  it("o do prospecto leva o canal e o número dele", () => {
    const l = linkMarcado(BASE, "/raio-x/pi/barras", "whatsapp", "pros_3f2a9c1e-5b7d");
    expect(l).toBe("https://cidadeia.vercel.app/raio-x/pi/barras?utm_source=whatsapp&utm_medium=prospeccao&utm_content=pros_3f2a9c1e-5b7d");
  });
  it("o do perfil leva só o canal", () => {
    expect(linkMarcado(BASE, "/", "instagram")).toBe("https://cidadeia.vercel.app/?utm_source=instagram&utm_medium=perfil");
  });
  it("número que não é de prospecto não entra no link", () => {
    expect(linkMarcado(BASE, "/", "email", "x'; drop")).not.toContain("utm_content");
  });
});

describe("a leitura do link", () => {
  it("lê o canal e o prospecto, venha de URLSearchParams ou do searchParams do Next", () => {
    expect(lerCampanha(new URLSearchParams("utm_source=LinkedIn&utm_content=pros_abcd1234"))).toEqual({ canal: "linkedin", prospecto: "pros_abcd1234" });
    expect(lerCampanha({ utm_source: ["email", "outro"], utm_content: undefined })).toEqual({ canal: "email", prospecto: null });
  });
  it("utm de terceiro (anúncio, newsletter alheia) não vira canal", () => {
    expect(lerCampanha(new URLSearchParams("utm_source=google&utm_medium=cpc"))).toBeNull();
    expect(lerCampanha(new URLSearchParams("fbclid=abc"))).toBeNull();
  });
  it("conteúdo que não é número de prospecto é descartado", () => {
    expect(lerCampanha({ utm_source: "instagram", utm_content: "fulana@prefeitura.gov.br" })).toEqual({ canal: "instagram", prospecto: null });
  });
  it("a origem gravada e o rótulo da Medição", () => {
    expect(origemDaCampanha({ canal: "whatsapp", prospecto: null })).toBe("link:whatsapp");
    expect(rotuloDaOrigem("link:whatsapp")).toBe("WhatsApp, pelo link marcado");
    expect(rotuloDaOrigem("google.com")).toBe("google.com");
    expect(rotuloDaOrigem(null)).toMatch(/acesso direto/);
  });
});

describe("as aberturas do link na mesa", () => {
  it("conta visitantes distintos por prospecto e guarda a última", () => {
    const m = aberturasPorProspecto([
      { detalhe: "pros_aaaa", visitante: "v1", criadoEm: "2026-11-04T10:00:00Z" },
      { detalhe: "pros_aaaa", visitante: "v1", criadoEm: "2026-11-04T10:05:00Z" },
      { detalhe: "pros_aaaa", visitante: "v2", criadoEm: "2026-11-03T09:00:00Z" },
      { detalhe: "pros_bbbb", visitante: "v3", criadoEm: "2026-11-02T09:00:00Z" },
      { detalhe: "outra coisa", visitante: "v4", criadoEm: "2026-11-02T09:00:00Z" },
      { detalhe: null, visitante: "v5", criadoEm: "2026-11-02T09:00:00Z" },
    ]);
    expect(m.get("pros_aaaa")).toEqual({ pessoas: 2, ultima: "2026-11-04T10:05:00Z" });
    expect(m.get("pros_bbbb")?.pessoas).toBe(1);
    expect(m.size).toBe(2);
  });
});

describe("o funil por origem", () => {
  const SITE = "cidadeia.vercel.app";
  const e = (visitante: string, tipo: string, origem: string | null, criadoEm: string) => ({ visitante, tipo, origem, criadoEm });

  it("a origem é a da entrada; a navegação dentro do site não vira canal", () => {
    const l = funilPorOrigem(
      [
        e("v1", "visita", "link:whatsapp", "2026-11-04T10:00:00Z"),
        e("v1", "raio_x", "link:whatsapp", "2026-11-04T10:00:00Z"),
        e("v1", "proposta_aberta", SITE, "2026-11-04T10:03:00Z"),
        e("v1", "proposta_enviada", SITE, "2026-11-04T10:06:00Z"),
        e("v2", "visita", "google.com", "2026-11-04T11:00:00Z"),
        e("v2", "raio_x", SITE, "2026-11-04T11:01:00Z"),
        e("v3", "visita", null, "2026-11-04T12:00:00Z"),
        e("v4", "visita", "link:instagram", "2026-11-04T13:00:00Z"),
        e("v4", "contato_deixado", SITE, "2026-11-04T13:04:00Z"),
      ],
      SITE
    );
    expect(l).toEqual([
      { origem: "link:whatsapp", visitantes: 1, raioX: 1, leads: 1 },
      { origem: "link:instagram", visitantes: 1, raioX: 0, leads: 1 },
      { origem: "google.com", visitantes: 1, raioX: 1, leads: 0 },
      { origem: null, visitantes: 1, raioX: 0, leads: 0 },
    ]);
  });

  it("a visita da home gravada depois do Raio-X ainda dá a origem", () => {
    const l = funilPorOrigem(
      [
        e("v1", "raio_x", SITE, "2026-11-04T10:00:01Z"),
        e("v1", "visita", "link:instagram", "2026-11-04T10:00:03Z"),
      ],
      SITE
    );
    expect(l[0]).toEqual({ origem: "link:instagram", visitantes: 1, raioX: 1, leads: 0 });
  });
});
