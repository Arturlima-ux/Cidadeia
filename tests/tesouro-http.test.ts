import { describe, it, expect, vi, afterEach } from "vitest";
import { ESPERAS_TESOURO_MS, itensDoTesouro } from "@/lib/tesouro-http";
import { buscarRgfMaisRecente } from "@/lib/siconfi-rgf";
import { fatoDoPessoal } from "@/lib/fatos-do-municipio";

ESPERAS_TESOURO_MS.fill(0);
afterEach(() => vi.unstubAllGlobals());

const html = () => new Response("<!DOCTYPE html><html>erro</html>", { status: 200, headers: { "content-type": "text/html" } });

describe("perguntar ao Tesouro sem desistir na primeira", () => {
  it("página de erro no lugar do JSON é repetida, e a repetição sai sem cache", async () => {
    const chamadas: RequestInit[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_: string, init: RequestInit) => {
      chamadas.push(init);
      return chamadas.length === 1 ? html() : Response.json({ items: [{ a: 1 }] });
    }));
    expect(await itensDoTesouro("https://x/y", 60)).toEqual([{ a: 1 }]);
    expect(chamadas[1].cache).toBe("no-store");
  });

  it("depois de três respostas ruins, é 'não consegui perguntar', nunca 'não tem'", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => html()));
    expect(await itensDoTesouro("https://x/y", 60)).toBeNull();
  });

  it("status de erro também é repetido", async () => {
    let n = 0;
    vi.stubGlobal("fetch", vi.fn(async () => (n++ === 0 ? new Response("", { status: 503 }) : Response.json({ items: [] }))));
    expect(await itensDoTesouro("https://x/y", 60)).toEqual([]);
  });

  it("tempo esgotado não é repetido", async () => {
    const f = vi.fn(async () => { throw Object.assign(new Error("t"), { name: "TimeoutError" }); });
    vi.stubGlobal("fetch", f);
    expect(await itensDoTesouro("https://x/y", 60)).toBeNull();
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe("o extrato de entregas como atalho", () => {
  const anexo = [
    { cod_conta: "ReceitaCorrenteLiquidaAjustada", coluna: "Valor", valor: 100 },
    { cod_conta: "DespesaComPessoalTotal", coluna: "Valor", valor: 47 },
  ];

  it("vai direto ao RGF que a prefeitura entregou, sem varrer períodos", async () => {
    const f = vi.fn(async (url: string) => {
      const u = new URL(url);
      if (u.pathname.endsWith("extrato_entregas")) {
        return Response.json({ items: u.searchParams.get("an_referencia") === "2026" ? [
          { instituicao: "Câmara Municipal de X", entregavel: "Relatório de Gestão Fiscal Simplificado", periodo: 1, periodicidade: "S" },
          { instituicao: "Prefeitura Municipal de X", entregavel: "Relatório de Gestão Fiscal Simplificado", periodo: 1, periodicidade: "S" },
          { instituicao: "Prefeitura Municipal de X", entregavel: "MSC Agregada", periodo: 8, periodicidade: "M" },
        ] : [] });
      }
      const q = u.searchParams;
      const tem = q.get("co_tipo_demonstrativo") === "RGF Simplificado" && q.get("in_periodicidade") === "S" && q.get("nr_periodo") === "1";
      return Response.json({ items: tem ? anexo : [] });
    });
    vi.stubGlobal("fetch", f);
    const r = await buscarRgfMaisRecente("3201001", 2026, 10);
    expect(r.ok).toBe(true);
    // 2 do extrato (dois anos) + 2 do período (dois tipos). A varredura cega eram até 16.
    expect(f).toHaveBeenCalledTimes(4);
  });

  it("extrato sem RGF não conclui nada sozinho: a busca completa ainda roda", async () => {
    const f = vi.fn(async () => Response.json({ items: [] }));
    vi.stubGlobal("fetch", f);
    const r = await buscarRgfMaisRecente("3201001", 2026, 10);
    expect(r.ok).toBe(false);
    expect(f.mock.calls.length).toBeGreaterThan(10);
  });
});

describe("RGF entregue nunca vira 'não publicado'", () => {
  // Caseiros/RS, auditoria de outubro de 2026: o extrato registrava o RGF
  // Simplificado do 1º semestre de 2026 homologado, a consulta do anexo não
  // trazia nada, e o site dizia que nenhum RGF constava publicado.
  const extratoComRgf = (url: string) =>
    new URL(url).searchParams.get("an_referencia") === "2026"
      ? [{ instituicao: "Prefeitura Municipal de Caseiros", entregavel: "Relatório de Gestão Fiscal Simplificado", periodo: 1, periodicidade: "S" }]
      : [];

  it("anexo vazio com entrega registrada é 'entregue sem dados', com o período", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      Response.json({ items: new URL(url).pathname.endsWith("extrato_entregas") ? extratoComRgf(url) : [] })));
    const r = await buscarRgfMaisRecente("4304952", 2026, 10);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.causa).toBe("entregue_sem_dados");
    const f = fatoDoPessoal(r, "2026-10-06T12:00:00Z");
    expect(f.ausencia).toContain("entregou o RGF do 1º semestre de 2026");
    expect(f.ausencia).not.toMatch(/não consta|nenhum consta/i);
  });

  it("sem o extrato, ausência não é afirmada", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      new URL(url).pathname.endsWith("extrato_entregas") ? html() : Response.json({ items: [] })));
    const r = await buscarRgfMaisRecente("4304952", 2026, 10);
    if (r.ok) throw new Error("não devia achar");
    expect(r.causa).toBe("consulta_falhou");
  });

  it("lê o Anexo 06 do simplificado quando o Anexo 01 não vem", async () => {
    const anexo06 = [
      { cod_conta: "ReceitaCorrenteLiquidaAjustada", coluna: "VALOR ATÉ O SEMESTRE DE REFERÊNCIA", valor: 107608007.7 },
      { cod_conta: "ReceitaCorrenteLiquida", coluna: "VALOR ATÉ O SEMESTRE DE REFERÊNCIA", valor: 114064203.2 },
      { cod_conta: "DespesaTotalComPessoalDemonstrativoSimplificado", coluna: "VALOR", valor: 51198424.56 },
      { cod_conta: "DespesaTotalComPessoalDemonstrativoSimplificado", coluna: "% SOBRE A RCL AJUSTADA", valor: 47.58 },
      { cod_conta: "LimiteDeAlertaDespesaComPessoalDemonstrativoSimplificado", coluna: "VALOR", valor: 52297491.74 },
    ];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const u = new URL(url);
      if (u.pathname.endsWith("extrato_entregas")) return Response.json({ items: extratoComRgf(url) });
      return Response.json({ items: u.searchParams.get("no_anexo") === "RGF-Anexo 06" && u.searchParams.get("nr_periodo") === "1" ? anexo06 : [] });
    }));
    const r = await buscarRgfMaisRecente("4304952", 2026, 10);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(((r.dados.despesaTotal / r.dados.rclAjustada) * 100).toFixed(2)).toBe("47.58");
    expect(r.dados.limiteAlerta).toBe(52297491.74);
  });
});
