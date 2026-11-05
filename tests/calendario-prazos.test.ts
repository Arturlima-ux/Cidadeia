import { describe, expect, it } from "vitest";
import { montarCalendario, nomeDoCalendario, prazosDosProximos12Meses } from "@/lib/calendario-prazos";

const base = {
  codigoIbge: "2211001",
  municipio: "Teresina",
  uf: "PI",
  hoje: "2026-11-05",
  link: "https://cidadeia.vercel.app/raio-x/pi/teresina",
  agora: new Date("2026-11-05T12:00:00Z"),
};

describe("os prazos dos próximos 12 meses", () => {
  it("RREO a cada bimestre e RGF a cada quadrimestre, 30 dias depois do período, em ordem", () => {
    const p = prazosDosProximos12Meses("2026-11-05").map((x) => `${x.vencimento} ${x.obrigacao.sigla} ${x.rotulo}`);
    expect(p[0]).toBe("2026-11-30 RREO 5º bimestre de 2026"); // 31/10 + 30 dias
    expect(p).toContain("2027-01-30 RGF 3º quadrimestre de 2026");
    expect(p).toContain("2027-01-30 RREO 6º bimestre de 2026");
    expect(p.filter((x) => x.includes("RREO"))).toHaveLength(6);
    expect(p.filter((x) => x.includes("RGF"))).toHaveLength(3);
    expect(p.every((x) => x.slice(0, 10) >= "2026-11-05" && x.slice(0, 10) <= "2027-11-05")).toBe(true);
  });
  it("só RREO e RGF entram (SIOPS e SIOPE ficam fora)", () => {
    expect(prazosDosProximos12Meses("2026-11-05").every((x) => ["RREO", "RGF"].includes(x.obrigacao.sigla))).toBe(true);
  });
});

describe("o arquivo .ics", () => {
  const ics = montarCalendario(base);
  it("é um calendário válido, com CRLF e um evento de dia inteiro por prazo", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(9);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261130\r\nDTEND;VALUE=DATE:20261201");
    expect(ics).toContain("UID:2211001-rreo-20261031@cidadeia");
    expect(ics).toContain("TRIGGER:-P7D");
  });
  it("nenhuma linha passa de 75 bytes e o texto vem escapado", () => {
    const enc = new TextEncoder();
    expect(ics.split("\r\n").every((l) => enc.encode(l).length <= 75)).toBe(true);
    const desdobrado = ics.replace(/\r\n /g, "");
    expect(desdobrado).toContain("SUMMARY:Prazo do RGF (3º quadrimestre de 2026) · Teresina/PI");
    expect(desdobrado).toMatch(/DESCRIPTION:Último dia para a prefeitura de Teresina\/PI publicar o RREO do 5º bimestre de 2026 \(Lei Complementar 101\/2000 \(LRF\)\\, arts\. 52 e 53\)\.\\n/);
    expect(desdobrado).toContain("optou pelo semestral");
  });
  it("o mesmo pedido gera o mesmo arquivo (UID estável, sem duplicar na agenda)", () => {
    expect(montarCalendario(base)).toBe(ics);
  });
  it("nome do arquivo", () => {
    expect(nomeDoCalendario("teresina", "PI")).toBe("prazos-lrf-teresina-pi.ics");
  });
});
