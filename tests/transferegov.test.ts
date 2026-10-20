import { afterEach, describe, expect, it, vi } from "vitest";
import { buscarEmendasPix } from "@/lib/emendas-pix-servidor";

const env = (data: unknown[]) => ({ data, total_items: data.length, total_pages: 1, page_number: 1, page_size: 200 });

afterEach(() => vi.unstubAllGlobals());

describe("consulta ao Transferegov", () => {
  it("acha o beneficiário pelo CNPJ e detalha cada plano de ação", async () => {
    const pedidos: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: URL) => {
        const url = new URL(String(u));
        pedidos.push(`${url.pathname}?${url.searchParams.toString()}`);
        const p = url.pathname;
        const json = (d: unknown[]) => new Response(JSON.stringify(env(d)), { status: 200 });
        if (p.endsWith("/beneficiarios-especiais")) {
          return url.searchParams.get("cnpj_beneficiario") === "06.553.978/0001-37"
            ? json([{ id_beneficiario: 77, cnpj_beneficiario: "06.553.978/0001-37", nome_beneficiario: "MUNICIPIO" }])
            : json([]);
        }
        if (p.endsWith("/planos-acao-especiais")) {
          return json([
            { id_plano_acao: 1, ano_plano_acao: 2026, valor_custeio_plano_acao: 10, valor_investimento_plano_acao: 5, nome_objeto: "Praça" },
            { id_plano_acao: 2, ano_plano_acao: 2019, valor_custeio_plano_acao: 1, valor_investimento_plano_acao: 0, nome_objeto: "Velha" },
          ]);
        }
        if (p.endsWith("/planos-trabalho-especiais")) return json([{ id_plano_trabalho: 5, id_plano_acao: 1, data_fim_execucao_plano_trabalho: "2026-12-01" }]);
        return json([]);
      })
    );
    const emendas = await buscarEmendasPix("06553978000137", new Date("2026-10-20"));
    // tenta só números, depois o formato com pontos
    expect(pedidos[0]).toContain("cnpj_beneficiario=06553978000137");
    expect(pedidos[1]).toContain("cnpj_beneficiario=06.553.978%2F0001-37");
    expect(pedidos.some((x) => x.startsWith("/especiais/planos-acao-especiais") && x.includes("id_beneficiario=77") && x.includes("pagina=1") && x.includes("tamanho_da_pagina=200"))).toBe(true);
    // a de 2019 fica de fora (mais de quatro anos)
    expect(emendas.map((e) => e.id)).toEqual([1]);
    expect(emendas[0]).toMatchObject({ valor: 15, planoTrabalho: { fim: "2026-12-01" } });
  });

  it("CNPJ sem emenda devolve lista vazia; serviço fora do ar lança", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(env([])), { status: 200 })));
    expect(await buscarEmendasPix("06553978000137")).toEqual([]);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>erro</html>", { status: 503 })));
    await expect(buscarEmendasPix("06553978000137")).rejects.toThrow(/Transferegov/);
  });
});
