import { describe, expect, it } from "vitest";
import { obrasParadasParaPublicar, textosDoAviso } from "@/lib/obra-parada-publica";
import type { ObraFederal } from "@/lib/obras-federais";

const hoje = new Date("2026-10-22T12:00:00Z");

const federal = (o: Partial<ObraFederal>): ObraFederal => ({
  id: "1",
  nome: "Creche Proinfância",
  situacao: "Paralisada",
  area: "educacao",
  responsavel: "Prefeitura Municipal",
  inicioPrevisto: null,
  fimPrevisto: null,
  percentual: 30,
  execucaoAtualizadaEm: null,
  empenhado: 1_000_000,
  pago: 700_000,
  paralisadaEm: "2025-03-01",
  justificativa: "Abandono pela construtora",
  ...o,
});

const municipal = (o: Record<string, unknown> = {}) => ({
  id: "m1",
  nome: "Quadra da escola",
  bairro: "Centro",
  status: "paralisada",
  progressoAtual: 40,
  valorContrato: 500_000,
  fornecedorNome: "Construtora X",
  atualizadoEm: "2026-08-01T10:00:00",
  ...o,
});

describe("obra parada publicada sozinha (art. 115, § 6º, Lei 14.133)", () => {
  it("publica a federal paralisada com motivo, responsável e o pago ao lado do executado", () => {
    const [o] = obrasParadasParaPublicar([], [], [federal({})], hoje);
    expect(o.origem).toBe("federal");
    expect(o.motivo).toBe("Abandono pela construtora");
    expect(o.executado).toBe(30);
    expect(o.pagoPct).toBe(70);
    expect(o.pagamentoAFrente).toBe(true);
    expect(o.diasParada).toBeGreaterThan(500);
  });

  it("não marca pagamento à frente quando pago e executado andam juntos", () => {
    const [o] = obrasParadasParaPublicar([], [], [federal({ percentual: 60, pago: 650_000 })], hoje);
    expect(o.pagamentoAFrente).toBe(false);
  });

  it("deixa de fora obra federal em execução ou concluída", () => {
    const l = obrasParadasParaPublicar([], [], [federal({ situacao: "Em execução" }), federal({ id: "2", situacao: "Concluída" })], hoje);
    expect(l).toHaveLength(0);
  });

  it("usa a justificativa e a nova previsão da decisão da prefeitura", () => {
    const [o] = obrasParadasParaPublicar(
      [municipal()],
      [
        { obraId: "m1", tipo: "prorrogacao_automatica", justificativa: "antiga", novaPrevisao: null, decididoEm: "2026-08-02" },
        { obraId: "m1", tipo: "mora_do_contratado", justificativa: "Construtora parou sem aviso", novaPrevisao: "2027-02-01", decididoEm: "2026-09-01" },
      ],
      [],
      hoje
    );
    expect(o.motivo).toBe("Construtora parou sem aviso");
    expect(o.retomadaPrevista).toBe("2027-02-01");
    expect(o.responsavel).toBe("Construtora X");
  });

  it("espera um mês de paralisação, como manda a lei", () => {
    expect(obrasParadasParaPublicar([municipal({ atualizadoEm: "2026-10-10T00:00:00" })], [], [], hoje)).toHaveLength(0);
    expect(obrasParadasParaPublicar([municipal({ status: "em_andamento" })], [], [], hoje)).toHaveLength(0);
  });

  it("publica mesmo sem data de paralisação e diz o que falta", () => {
    const [o] = obrasParadasParaPublicar([], [], [federal({ paralisadaEm: null, justificativa: null, responsavel: null })], hoje);
    const t = textosDoAviso(o);
    expect(t.desde).toMatch(/não registrada/);
    expect(t.motivo).toMatch(/não informado/);
    expect(t.retomada).toMatch(/Sem data/);
  });

  it("põe primeiro a que está parada há mais tempo", () => {
    const l = obrasParadasParaPublicar([municipal()], [], [federal({})], hoje);
    expect(l.map((o) => o.origem)).toEqual(["federal", "municipal"]);
  });
});
