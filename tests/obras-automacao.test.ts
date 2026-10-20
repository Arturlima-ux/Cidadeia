import { afterEach, describe, expect, it, vi } from "vitest";
import { achadosDasObrasFederais, montarObrasFederais } from "@/lib/obras-federais";
import { buscarObrasFederais } from "@/lib/obras-federais-servidor";
import { achadosDosAditivos } from "@/lib/vigia-dos-modulos";

const hoje = new Date("2026-10-20T12:00:00Z");

describe("obras federais do ObrasGov", () => {
  const obras = montarObrasFederais(
    [
      { id_projeto_investimento: "1", desc_nome: "Construção de creche Proinfância", situacao: "Paralisada", organizacao_resp: "FNDE", dt_final_prevista: "2025-06-30" },
      { id_projeto_investimento: "2", desc_nome: "Construção de UBS porte I", situacao: "Em execução", dt_final_prevista: "2026-03-01" },
      { id_projeto_investimento: "3", desc_nome: "Pavimentação de vias urbanas", situacao: "Em execução", dt_final_prevista: "2027-12-31" },
      { id_projeto_investimento: "4", desc_nome: "Quadra coberta", situacao: "Concluída" },
    ],
    [
      { id_projeto_investimento: "1", percentual_execucao_fisica: 42.5, dt_atualizacao_execucao: "2025-01-10" },
      { id_projeto_investimento: "2", percentual_execucao_fisica: "70", dt_atualizacao_execucao: "2026-09-01" },
      { id_projeto_investimento: "3", percentual_execucao_fisica: 10, dt_atualizacao_execucao: "2026-01-02" },
    ],
    [{ id_projeto_investimento: "1", descricao_historico_situacao_investimento: "Paralisada", data_historico_situacao_investimento: "2025-02-01", justificativa_cancelada_paralisada: "Abandono da empresa" }],
    [{ id_projeto_investimento: "1", valor_empenho: 1_000_000, pago: 400_000, rppago: 20_000 }]
  );

  it("monta com área, percentual, paralisação e valores", () => {
    const creche = obras.find((o) => o.id === "1")!;
    expect(creche).toMatchObject({ area: "educacao", percentual: 42.5, paralisadaEm: "2025-02-01", justificativa: "Abandono da empresa", pago: 420_000 });
    expect(obras.find((o) => o.id === "2")!.area).toBe("saude");
    expect(obras.find((o) => o.id === "3")!.area).toBe("obras");
    expect(obras.at(-1)!.id).toBe("4"); // encerradas por último
  });

  it("avisa paralisada, atrasada e sem medição; ignora concluída", () => {
    const a = achadosDasObrasFederais(obras, hoje);
    const porChave = Object.fromEntries(a.map((x) => [x.chave, x]));
    expect(porChave["obrafed:1:paralisada"].prioridade).toBe("urgente");
    expect(porChave["obrafed:1:paralisada"].secretaria).toBe("educacao");
    expect(porChave["obrafed:2:atrasada:2026-03-01"].prioridade).toBe("medio");
    expect(porChave["obrafed:3:sem-medicao"].prioridade).toBe("info");
    expect(a.some((x) => x.chave?.startsWith("obrafed:4"))).toBe(false);
  });
});

describe("consulta ao ObrasGov", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("acha os projetos pela geometria do município e detalha só os ativos", async () => {
    const pedidos: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (u: URL) => {
        const url = new URL(String(u));
        pedidos.push(`${url.pathname}?${url.searchParams}`);
        const env = (d: unknown[]) => new Response(JSON.stringify({ data: d, total_items: d.length, total_pages: 1, page_number: 1, page_size: 200 }));
        if (url.pathname.endsWith("/geometria")) return env([{ id_projeto_investimento: "A" }, { id_projeto_investimento: "B" }, { id_projeto_investimento: "A" }]);
        if (url.pathname.endsWith("/projeto-investimento")) {
          const id = url.searchParams.get("id_projeto_investimento");
          return env([{ id_projeto_investimento: id, desc_nome: `Obra ${id}`, situacao: id === "A" ? "Em execução" : "Concluída" }]);
        }
        return env([]);
      })
    );
    const obras = await buscarObrasFederais("2205300");
    expect(pedidos[0]).toContain("/obras/geometria?cod_ibge=2205300");
    expect(obras.map((o) => o.id).sort()).toEqual(["A", "B"]);
    // detalhes só da A, que não acabou
    expect(pedidos.some((p) => p.includes("execucao-fisica") && p.includes("id_projeto_investimento=A"))).toBe(true);
    expect(pedidos.some((p) => p.includes("execucao-fisica") && p.includes("id_projeto_investimento=B"))).toBe(false);
  });
});

describe("aditivos na vigia", () => {
  it("avisa só o que passou do limite se for acréscimo", () => {
    const base = { fornecedorNome: "Construtora X", numeroRetificacao: 2 };
    const a = achadosDosAditivos([
      { ...base, id: "c1", numeroContrato: "10/2025", objeto: "Pavimentação de ruas", categoria: "Obras", valorInicial: 1_000_000, valorGlobal: 1_400_000 },
      { ...base, id: "c2", numeroContrato: "11/2025", objeto: "Reforma do mercado", categoria: "Obras", valorInicial: 1_000_000, valorGlobal: 1_400_000 },
      { ...base, id: "c3", numeroContrato: "12/2025", objeto: "Merenda", categoria: "Compras", valorInicial: 100_000, valorGlobal: 110_000 },
    ]);
    expect(a.map((x) => x.chave)).toEqual(["aditivo:c1:25"]);
    expect(a[0].secretaria).toBe("obras");
    expect(a[0].descricao).toContain("Art. 125");
  });
});

describe("com o formato real dos serviços (conferido em out/2026)", () => {
  it("projeto só cadastrado, com data antiga, não vira atraso; escola pela meta", () => {
    const [dnit, escola] = montarObrasFederais(
      [
        { id_projeto_investimento: "428.22-51", desc_nome: "Manutenção rodoviária na malha federal sob administração do DNIT no estado do PI.", situacao: "Cadastrada", dt_final_prevista: "2021-12-31" },
        { id_projeto_investimento: "83048.22-38", desc_nome: "U.E. JOSE TEIXEIRA FILHO - Miguel Alves - PI", desc_meta_global: "Escola 4 Salas", situacao: "Paralisada", especie_intervencao: "Reforma", natureza_intervencao: "Obra" },
      ],
      [],
      [],
      []
    ).sort((a, b) => a.id.localeCompare(b.id));
    expect(achadosDasObrasFederais([dnit], hoje)).toEqual([]);
    expect(escola.area).toBe("educacao");
  });
});
