import { describe, it, expect, vi, afterEach } from "vitest";
import { ESPERAS_TESOURO_MS } from "@/lib/tesouro-http";
import { buscarRgfMaisRecente, periodoSeguinte, vencimentoDoRgf } from "@/lib/siconfi-rgf";
import { fatoDoPessoal } from "@/lib/fatos-do-municipio";

ESPERAS_TESOURO_MS.fill(0);
afterEach(() => vi.unstubAllGlobals());
const HOJE = new Date("2026-10-07T12:00:00Z");

/** Anexo 01 com despesa e RCL dados. */
const anexo = (despesa: number, rcl: number) => [
  { cod_conta: "ReceitaCorrenteLiquidaAjustada", coluna: "Valor", valor: rcl },
  { cod_conta: "DespesaComPessoalTotal", coluna: "Valor", valor: despesa },
  { cod_conta: "LimiteDeAlertaDespesaComPessoalTotal", coluna: "Valor", valor: rcl * 0.486 },
];

/** fetch falso: extrato com os períodos dados (prefeitura), e anexo por período "2026Q1". */
function tesouro(extrato: { ano: number; p: string; n: number }[], porPeriodo: Record<string, unknown[]>) {
  return vi.fn(async (url: string) => {
    const u = new URL(url);
    const q = u.searchParams;
    if (u.pathname.endsWith("extrato_entregas")) {
      return Response.json({
        items: extrato
          .filter((e) => String(e.ano) === q.get("an_referencia"))
          .map((e) => ({ instituicao: "Prefeitura Municipal de X", entregavel: "Relatório de Gestão Fiscal", periodo: e.n, periodicidade: e.p })),
      });
    }
    if (q.get("co_tipo_demonstrativo") !== "RGF" || q.get("no_anexo") !== "RGF-Anexo 01") return Response.json({ items: [] });
    return Response.json({ items: porPeriodo[`${q.get("an_exercicio")}${q.get("in_periodicidade")}${q.get("nr_periodo")}`] ?? [] });
  });
}

describe("números declarados que não fecham", () => {
  it("Curralinho/PA: 451% não vira resultado; a tela diz os números e usa o período anterior", async () => {
    vi.stubGlobal("fetch", tesouro(
      [{ ano: 2026, p: "Q", n: 1 }, { ano: 2025, p: "Q", n: 3 }],
      { "2026Q1": anexo(148848319.3, 32949960.72), "2025Q3": anexo(70_000_000, 140_000_000) }
    ));
    const r = await buscarRgfMaisRecente("1502806", 2026, 10, 8, HOJE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados.periodo).toMatchObject({ exercicio: 2025, periodo: 3 });
    const f = fatoDoPessoal(r, HOJE.toISOString());
    expect(f.valor).toBe("50,00%");
    expect(f.leitura).toContain("451,74%");
    expect(f.leitura).toMatch(/não fecham entre si/);
  });

  it("sem período bom, a ausência traz os números e não um percentual como veredito", async () => {
    vi.stubGlobal("fetch", tesouro([{ ano: 2026, p: "Q", n: 1 }], { "2026Q1": anexo(148848319.3, 32949960.72) }));
    const r = await buscarRgfMaisRecente("1502806", 2026, 10, 8, HOJE);
    if (r.ok) throw new Error("não devia dar número");
    expect(r.causa).toBe("inconsistente");
    const f = fatoDoPessoal(r, HOJE.toISOString());
    expect(f.valor).toBeNull();
    expect(f.ausencia).toMatch(/R\$\s148\.848\.319/);
  });

  it("despesa praticamente zero (Paraná/RN: R$ 0,12) também não fecha", async () => {
    vi.stubGlobal("fetch", tesouro([{ ano: 2026, p: "S", n: 1 }], { "2026S1": anexo(0.12, 28069160.6) }));
    const r = await buscarRgfMaisRecente("2408607", 2026, 10, 8, HOJE);
    expect(r.ok).toBe(false);
  });
});

describe("o número antigo diz que é antigo", () => {
  it("2º quadrimestre vencido e não entregue: a tela diz o prazo", async () => {
    vi.stubGlobal("fetch", tesouro([{ ano: 2026, p: "Q", n: 1 }], { "2026Q1": anexo(50, 100) }));
    const r = await buscarRgfMaisRecente("1100015", 2026, 10, 8, HOJE);
    if (!r.ok) throw new Error("devia achar");
    expect(fatoDoPessoal(r, HOJE.toISOString()).leitura).toContain("2º quadrimestre de 2026, com prazo de publicação até 30/09/2026, ainda não consta");
  });

  it("período seguinte ainda no prazo: nada a avisar", async () => {
    vi.stubGlobal("fetch", tesouro([{ ano: 2026, p: "Q", n: 1 }], { "2026Q1": anexo(50, 100) }));
    const r = await buscarRgfMaisRecente("1100015", 2026, 10, 8, new Date("2026-09-20T12:00:00Z"));
    if (!r.ok) throw new Error("devia achar");
    expect(r.contexto).toBeUndefined();
  });

  it("calendário do RGF", () => {
    expect(periodoSeguinte({ exercicio: 2025, periodicidade: "S", periodo: 2, mesReferencia: 12 })).toMatchObject({ exercicio: 2026, periodo: 1 });
    expect(vencimentoDoRgf({ exercicio: 2026, periodicidade: "S", periodo: 1, mesReferencia: 6 })).toBe("2026-07-30");
  });
});

describe("lugares que não são prefeitura comum", () => {
  it("Brasília é consultada como Distrito Federal (código 53, esfera estadual)", async () => {
    const f = vi.fn(async (url: string) => {
      const q = new URL(url).searchParams;
      const df = q.get("id_ente") === "53" && (q.get("co_esfera") ?? "E") === "E";
      return Response.json({ items: df && q.get("co_tipo_demonstrativo") === "RGF" && q.get("nr_periodo") === "2" && q.get("in_periodicidade") === "Q" ? anexo(16987811890.99, 41899183021.71) : [] });
    });
    vi.stubGlobal("fetch", f);
    const r = await buscarRgfMaisRecente("5300108", 2026, 10, 8, HOJE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(((r.dados.despesaTotal / r.dados.rclAjustada) * 100).toFixed(2)).toBe("40.54");
  });

  it("Fernando de Noronha não é cobrada e nem consulta o Tesouro", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const r = await buscarRgfMaisRecente("2605459", 2026, 10, 8, HOJE);
    if (r.ok) throw new Error("não tem RGF");
    expect(r.causa).toBe("sem_prefeitura");
    expect(f).not.toHaveBeenCalled();
    expect(fatoDoPessoal(r, HOJE.toISOString()).ausencia).toMatch(/distrito estadual/);
  });

  it("RGF de consórcio no extrato não conta como entrega da prefeitura", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const u = new URL(url);
      if (u.pathname.endsWith("extrato_entregas")) {
        return Response.json({ items: [{ instituicao: "CONSORCIO MUNICIPAL PARA ATERRO", entregavel: "Relatório de Gestão Fiscal", periodo: 1, periodicidade: "Q" }] });
      }
      return Response.json({ items: [] });
    }));
    const r = await buscarRgfMaisRecente("2312106", 2026, 10, 8, HOJE);
    if (r.ok) throw new Error("não tem RGF");
    expect(r.causa).toBe("nao_publicado");
  });
});

describe("quem declarou", () => {
  it("no DF é o Governo do Distrito Federal, não a prefeitura", () => {
    const f = fatoDoPessoal(
      {
        ok: true,
        dados: {
          periodo: { exercicio: 2026, periodicidade: "Q", periodo: 2, mesReferencia: 8 },
          instituicao: "Governo do Distrito Federal",
          rclAjustada: 41899183021.71, rcl: 41899183021.71, despesaTotal: 16987811890.99,
          limiteMaximo: null, limitePrudencial: null, limiteAlerta: 18477539712.57, rclVeioDeReserva: false,
        },
      },
      "2026-10-07T12:00:00Z"
    );
    expect(f.leitura).toContain("o próprio Governo do Distrito Federal declarou");
    expect(f.leitura).not.toMatch(/prefeitura/);
  });
});
