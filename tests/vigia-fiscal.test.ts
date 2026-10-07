import { describe, it, expect, vi, afterEach } from "vitest";
import { ESPERAS_TESOURO_MS } from "@/lib/tesouro-http";
import { chavesEntregues, conferirSituacaoFiscal, periodicidadeEntregue, type SituacaoFiscal } from "@/lib/vigia-fiscal";
import { alertasDaSituacao, conferenciaCompleta } from "@/lib/vigia-fiscal-alertas";
import { avaliarObrigacoes, periodosDoExercicio } from "@/lib/obrigacoes-fiscais";
import type { EntregaRegistrada } from "@/lib/siconfi-entregas";

ESPERAS_TESOURO_MS.fill(0);
afterEach(() => vi.unstubAllGlobals());

const HOJE = new Date("2026-10-07T12:00:00Z");
const rreo = (n: number): EntregaRegistrada => ({ relatorio: "rreo", periodicidade: "B", periodo: n, simplificado: false });
const rgf = (p: "Q" | "S", n: number): EntregaRegistrada => ({ relatorio: "rgf", periodicidade: p, periodo: n, simplificado: p === "S" });

function situacao(entregues: string[], extra: Partial<SituacaoFiscal> = {}): SituacaoFiscal {
  return {
    exercicio: 2026,
    periodicidadeRgf: "quadrimestral",
    periodicidadeDoExtrato: true,
    avaliadas: avaliarObrigacoes(periodosDoExercicio(2026), new Set(entregues), HOJE),
    inconclusivos: [],
    pessoal: null,
    ...extra,
  };
}

describe("periodicidade do RGF pelo que a prefeitura entregou", () => {
  it("quem entrega semestral é cobrado por semestre, mesmo sem marcar nada no cadastro", () => {
    expect(periodicidadeEntregue([rgf("S", 1)], null)).toBe("semestral");
    expect(periodicidadeEntregue([], [rgf("Q", 3)])).toBe("quadrimestral");
    expect(periodicidadeEntregue([], [])).toBeNull();
  });

  it("monta as chaves do calendário", () => {
    expect([...chavesEntregues([rreo(1), rreo(2), rgf("Q", 1), rgf("S", 1)], "quadrimestral")].sort()).toEqual(["rgf:1", "rreo:1", "rreo:2"]);
  });
});

describe("alertas da vigia fiscal", () => {
  it("RGF do 2º quadrimestre vencido em 30/09 e não entregue vira alerta urgente", () => {
    const a = alertasDaSituacao("p1", situacao(["rreo:1", "rreo:2", "rreo:3", "rreo:4", "rgf:1"]));
    const rgf2 = a.find((x) => x.id === "fiscal:p1:2026:rgf:2:vencida");
    expect(rgf2?.prioridade).toBe("urgente");
    expect(rgf2?.titulo).toContain("RGF do 2º quadrimestre de 2026");
    expect(rgf2?.descricao).toContain("30/09/2026");
  });

  it("entregue não gera alerta", () => {
    const a = alertasDaSituacao("p1", situacao(["rreo:1", "rreo:2", "rreo:3", "rreo:4", "rgf:1", "rgf:2"]));
    expect(a.filter((x) => x.id.endsWith(":vencida"))).toEqual([]);
  });

  it("período que o Tesouro não respondeu não acusa ninguém", () => {
    const a = alertasDaSituacao("p1", situacao(["rreo:1", "rreo:2", "rreo:3", "rreo:4", "rgf:1"], { inconclusivos: ["rgf:2"] }));
    expect(a.find((x) => x.id.includes("rgf:2"))).toBeUndefined();
    expect(conferenciaCompleta(situacao([], { inconclusivos: ["rgf:2"] }))).toBe(false);
  });

  it("avisa antes do prazo, inclusive SIOPS e SIOPE como lembrete", () => {
    const s = situacao(["rreo:1", "rreo:2", "rreo:3", "rreo:4", "rgf:1", "rgf:2"], {
      avaliadas: avaliarObrigacoes(periodosDoExercicio(2026), new Set(["rreo:1", "rreo:2", "rreo:3", "rreo:4", "rgf:1", "rgf:2"]), new Date("2026-11-20T12:00:00Z")),
    });
    const a = alertasDaSituacao("p1", s);
    const vence = a.filter((x) => x.id.endsWith(":vence"));
    expect(vence.map((x) => x.id)).toContain("fiscal:p1:2026:rreo:5:vence");
    expect(vence.every((x) => x.prioridade === "medio")).toBe(true);
    expect(a.find((x) => x.id.includes("siops:5:vence"))?.descricao).toMatch(/não tem consulta pública/);
    // SIOPS vencido nunca vira "não consta": não temos como saber.
    expect(a.find((x) => x.id.includes("siops") && x.id.endsWith(":vencida"))).toBeUndefined();
  });

  it("números do RGF que não fecham viram alerta com os números", () => {
    const a = alertasDaSituacao("p1", situacao(["rgf:1", "rgf:2"], {
      pessoal: {
        ok: false, erro: "", causa: "inconsistente", periodosProcurados: 1,
        numerosInconsistentes: { periodo: { exercicio: 2026, periodicidade: "Q", periodo: 1, mesReferencia: 4 }, despesa: 148848319.3, rcl: 32949960.72 },
      },
    }));
    const n = a.find((x) => x.id === "fiscal:p1:2026:rgf-numeros:Q1");
    expect(n?.prioridade).toBe("urgente");
    expect(n?.descricao).toContain("451,74%");
  });
});

describe("conferência no Tesouro", () => {
  it("lê RREO e RGF simplificado do extrato, e a periodicidade vem da entrega", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const u = new URL(url);
      if (!u.pathname.endsWith("extrato_entregas")) return Response.json({ items: [] });
      const itens = u.searchParams.get("an_referencia") === "2026"
        ? [
            { instituicao: "Prefeitura Municipal de Boa Esperança - ES", entregavel: "Relatório Resumido de Execução Orçamentária Simplificado", periodo: 1, periodicidade: "B" },
            { instituicao: "Prefeitura Municipal de Boa Esperança - ES", entregavel: "Relatório Resumido de Execução Orçamentária Simplificado", periodo: 2, periodicidade: "B" },
            { instituicao: "Prefeitura Municipal de Boa Esperança - ES", entregavel: "Relatório Resumido de Execução Orçamentária Simplificado", periodo: 3, periodicidade: "B" },
            { instituicao: "Prefeitura Municipal de Boa Esperança - ES", entregavel: "Relatório de Gestão Fiscal Simplificado", periodo: 1, periodicidade: "S" },
            { instituicao: "Câmara de Vereadores de Boa Esperança - ES", entregavel: "Relatório Resumido de Execução Orçamentária", periodo: 4, periodicidade: "B" },
          ]
        : [];
      return Response.json({ items: itens });
    }));
    const s = await conferirSituacaoFiscal({ codigoIbge: "3201001", populacao: 14029, hoje: HOJE, conferirPessoal: false });
    expect(s.periodicidadeRgf).toBe("semestral");
    const sit = (k: string) => s.avaliadas.find((a) => `${a.obrigacao.chave}:${a.numero}` === k)?.situacao;
    expect(sit("rgf:1")).toBe("entregue");
    expect(sit("rreo:3")).toBe("entregue");
    // O RREO do 4º bimestre da CÂMARA não conta para a prefeitura.
    expect(sit("rreo:4")).toBe("vencida");
    const alertas = alertasDaSituacao("be", s);
    expect(alertas.map((a) => a.id)).toContain("fiscal:be:2026:rreo:4:vencida");
    expect(alertas.find((a) => a.id.includes("rgf"))).toBeUndefined();
  });

  it("extrato fora do ar: RGF fica sem resposta, nunca vira atraso", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      new URL(url).pathname.endsWith("extrato_entregas") ? new Response("<html>", { status: 200 }) : Response.json({ items: [{ x: 1 }] })));
    const s = await conferirSituacaoFiscal({ codigoIbge: "3201001", populacao: 14029, hoje: HOJE, conferirPessoal: false });
    expect(s.inconclusivos).toContain("rgf:2");
    expect(alertasDaSituacao("be", s).find((a) => a.id.includes("rgf"))).toBeUndefined();
    expect(conferenciaCompleta(s)).toBe(false);
  });
});
