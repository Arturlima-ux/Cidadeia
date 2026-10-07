import { describe, it, expect, vi, afterEach } from "vitest";
import { ESPERAS_TESOURO_MS, itensDoTesouro } from "@/lib/tesouro-http";
import { buscarRgfMaisRecente } from "@/lib/siconfi-rgf";

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
