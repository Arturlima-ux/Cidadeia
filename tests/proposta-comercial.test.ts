import { describe, it, expect } from "vitest";
import { montarPropostaComercial, pendenciasDaEmpresa, empresaDoAmbiente, type DadosEmpresa } from "@/lib/proposta-comercial";
import { LIMITE_DISPENSA } from "@/lib/contratacao";
import { PRECO_MENSAL } from "@/lib/precos";

const EMPRESA: DadosEmpresa = {
  razaoSocial: "CidadeIA Tecnologia Ltda",
  cnpj: "00.000.000/0001-00",
  endereco: "Teresina/PI",
  representante: "Artur",
  emailSuporte: "suporte@x",
  telefoneSuporte: "86 9",
};

function pedido(sobrescreve: Partial<Parameters<typeof montarPropostaComercial>[0]> = {}) {
  return {
    id: "prop_abcdef12-3456-7890-abcd-ef1234567890",
    municipio: "Barro Duro",
    uf: "PI",
    populacao: 6719,
    modulos: JSON.stringify(["essencial", "saude"]),
    nome: "Maria",
    cargo: "Prefeita",
    email: "m@x",
    createdAt: "2026-09-20T12:00:00.000Z",
    ...sobrescreve,
  };
}

describe("proposta comercial a partir do pedido", () => {
  it("usa a tabela interna pela faixa do IBGE e soma certo", () => {
    const p = montarPropostaComercial(pedido(), EMPRESA, new Date("2026-09-20"));
    expect(p.municipio.porte).toBe("ate10k");
    expect(p.itens.map((i) => i.modulo)).toEqual(["essencial", "saude"]);
    const esperado = PRECO_MENSAL.essencial.ate10k! + PRECO_MENSAL.saude.ate10k!;
    expect(p.totalMensal).toBe(esperado);
    expect(p.totalAnual).toBe(esperado * 12);
    expect(p.sobConsulta).toBe(false);
  });

  it("enquadra na dispensa e diz o percentual do limite", () => {
    const p = montarPropostaComercial(pedido(), EMPRESA, new Date("2026-09-20"));
    expect(p.enquadramento.cabeNaDispensa).toBe(true);
    expect(p.enquadramento.percentualDoLimite).toBe(Math.round((p.totalAnual / LIMITE_DISPENSA.valor) * 100));
    expect(p.enquadramento.texto).toContain("dispensa");
  });

  it("faixa grande sai como sob consulta, sem inventar número", () => {
    const p = montarPropostaComercial(pedido({ populacao: 908_012 }), EMPRESA, new Date("2026-09-20"));
    expect(p.sobConsulta).toBe(true);
    expect(p.itens.every((i) => i.mensal === null)).toBe(true);
    expect(p.enquadramento.cabeNaDispensa).toBe(false);
    expect(p.enquadramento.texto).toContain("sob consulta".slice(0, 0) + "proposta específica");
  });

  it("número, validade de 30 dias e capacidades da home", () => {
    const p = montarPropostaComercial(pedido(), EMPRESA, new Date("2026-09-20T00:00:00Z"));
    expect(p.numero).toBe("2026-34567890");
    expect(p.validaAte.slice(0, 10)).toBe("2026-10-20");
    expect(p.itens[0]!.capacidades.length).toBeGreaterThanOrEqual(4);
  });

  it("sem dados da empresa, lista o que falta em vez de esconder", () => {
    const vazia = empresaDoAmbiente({} as NodeJS.ProcessEnv);
    expect(pendenciasDaEmpresa(vazia)).toHaveLength(6);
    expect(pendenciasDaEmpresa(EMPRESA)).toEqual([]);
    const p = montarPropostaComercial(pedido(), vazia, new Date());
    expect(p.pendenciasDaEmpresa).toContain("EMPRESA_CNPJ");
  });
});
