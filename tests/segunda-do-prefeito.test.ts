import { describe, expect, it } from "vitest";
import { emailDaSegunda, quando, recortar, type DadosDaSemana } from "@/lib/segunda-do-prefeito";

const SEGUNDA = new Date("2026-10-19T10:30:00Z");

const dados = (x: Partial<DadosDaSemana> = {}): DadosDaSemana => ({
  municipio: "Picos",
  abertos: [],
  vencimentos: [],
  resolvidos: [],
  linkPainel: "https://cidadeia.vercel.app/dashboard/alertas",
  ...x,
});

describe("quando", () => {
  it("diz hoje, amanhã ou o dia da semana", () => {
    expect(quando("2026-10-19", SEGUNDA)).toBe("hoje (19/10)");
    expect(quando("2026-10-20", SEGUNDA)).toBe("amanhã (20/10)");
    expect(quando("2026-10-22", SEGUNDA)).toBe("quinta (22/10)");
  });
});

describe("a segunda do prefeito", () => {
  it("sai mesmo numa semana tranquila, dizendo isso", () => {
    const m = emailDaSegunda(dados(), SEGUNDA, "prefeito")!;
    expect(m.assunto).toBe("Segunda do prefeito · Picos: semana sem pendência urgente");
    expect(m.html).toContain("Nenhum alerta urgente em aberto");
  });

  it("conta as decisões no assunto e lista os prazos em ordem", () => {
    const m = emailDaSegunda(
      dados({
        abertos: [
          { titulo: "Remédio em falta", descricao: "Insulina", prioridade: "urgente", secretaria: "saude" },
          { titulo: "Pessoal no prudencial", descricao: null, prioridade: "urgente", secretaria: null },
          { titulo: "Obra parada", descricao: null, prioridade: "medio", secretaria: "obras" },
        ],
        vencimentos: [
          { data: "2026-10-23", texto: "fim do contrato 3/2025", secretaria: "licitacoes" },
          { data: "2026-10-20", texto: "RREO do 4º bimestre", secretaria: null },
        ],
      }),
      SEGUNDA,
      "prefeito"
    )!;
    expect(m.assunto).toBe("Segunda do prefeito · Picos: 2 decisões para esta semana");
    expect(m.html.indexOf("RREO")).toBeLessThan(m.html.indexOf("contrato 3/2025"));
    expect(m.html).toContain("Obras 1");
  });

  it("separa o que fechou sozinho do que a equipe fechou", () => {
    const m = emailDaSegunda(
      dados({
        resolvidos: [
          { titulo: "Obra parada", secretaria: "obras", sozinho: true },
          { titulo: "RGF vence", secretaria: null, sozinho: true },
          { titulo: "Manual", secretaria: null, sozinho: false },
        ],
      }),
      SEGUNDA,
      "admin"
    )!;
    expect(m.html).toContain("2 problemas deixaram de existir e o alerta fechou sozinho; 1 alerta foi fechado pela equipe");
  });

  it("escapa o texto", () => {
    const m = emailDaSegunda(dados({ abertos: [{ titulo: "<b>x</b>", descricao: null, prioridade: "urgente", secretaria: null }] }), SEGUNDA, "prefeito")!;
    expect(m.html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});

describe("a segunda da secretaria", () => {
  const semana = dados({
    abertos: [
      { titulo: "Remédio em falta", descricao: null, prioridade: "urgente", secretaria: "saude" },
      { titulo: "Pessoal", descricao: null, prioridade: "urgente", secretaria: null },
    ],
    vencimentos: [{ data: "2026-10-20", texto: "SIOPS", secretaria: "saude" }],
  });

  it("recorta só a área do secretário", () => {
    const r = recortar(semana, "saude");
    expect(r.abertos.map((a) => a.titulo)).toEqual(["Remédio em falta"]);
    expect(r.vencimentos).toHaveLength(1);
  });

  it("não sai quando a área não tem nada", () => {
    expect(emailDaSegunda(semana, SEGUNDA, "secretario", "obras")).toBeNull();
  });

  it("sai com o nome da área no assunto", () => {
    const m = emailDaSegunda(semana, SEGUNDA, "secretario", "saude")!;
    expect(m.assunto).toBe("Segunda da secretaria · Saúde de Picos: 1 decisão para esta semana");
    expect(m.html).not.toContain("Pessoal");
  });
});
