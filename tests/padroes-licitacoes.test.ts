import { describe, it, expect } from "vitest";
import {
  detectarConcentracaoDeFornecedor,
  detectarDispensaNoTeto,
  detectarPadroes,
  normalizarFornecedor,
  ehDispensa,
  type ProcessoParaPadrao,
} from "@/lib/padroes-licitacoes";
import { LIMITE_DISPENSA } from "@/lib/contratacao";

const HOJE = new Date(`${LIMITE_DISPENSA.ano}-06-15T12:00:00Z`);
const ANO_SEGUINTE = new Date(`${LIMITE_DISPENSA.ano + 1}-01-15T12:00:00Z`);
const L = LIMITE_DISPENSA.valor;

function proc(p: Partial<ProcessoParaPadrao> & { numero: string }): ProcessoParaPadrao {
  return {
    objeto: "Objeto genérico",
    modalidade: "Pregão Eletrônico",
    valorEstimado: null,
    fornecedor: null,
    status: "publicada",
    ...p,
  };
}

describe("normalização", () => {
  it("fornecedor com sufixo societário e caixa diferente é o mesmo", () => {
    expect(normalizarFornecedor("Alimentos Boa Mesa LTDA.")).toBe(normalizarFornecedor("alimentos boa mesa ltda"));
    expect(normalizarFornecedor("Distribuidora Vida S/A")).toBe("distribuidora vida");
  });

  it("dispensa é reconhecida por conteúdo, com ou sem acento", () => {
    expect(ehDispensa("Dispensa de licitação")).toBe(true);
    expect(ehDispensa("DISPENSA - art. 75 II")).toBe(true);
    expect(ehDispensa("Pregão Eletrônico")).toBe(false);
    expect(ehDispensa(null)).toBe(false);
  });
});

describe("concentração de fornecedor", () => {
  const base = [
    proc({ numero: "PE 1", status: "homologada", fornecedor: "Boa Mesa Ltda", valorEstimado: 100 }),
    proc({ numero: "PE 2", status: "homologada", fornecedor: "boa mesa LTDA.", valorEstimado: 100 }),
    proc({ numero: "PE 3", status: "homologada", fornecedor: "Boa Mesa", valorEstimado: 100 }),
    proc({ numero: "PE 4", status: "homologada", fornecedor: "Outra", valorEstimado: 100 }),
  ];

  it("três vitórias do mesmo fornecedor, mesmo grafado diferente, viram padrão", () => {
    const [p] = detectarConcentracaoDeFornecedor(base);
    expect(p).toBeDefined();
    expect(p.texto).toContain("venceu 3 dos 4 processos homologados");
    expect(p.texto).toContain("75% do valor homologado");
    expect(p.texto).toContain("PE 1, PE 2, PE 3");
  });

  it("duas vitórias bastam se concentram metade do valor", () => {
    const dois = [
      proc({ numero: "A", status: "homologada", fornecedor: "Grande", valorEstimado: 900_000 }),
      proc({ numero: "B", status: "homologada", fornecedor: "Grande", valorEstimado: 100_000 }),
      proc({ numero: "C", status: "homologada", fornecedor: "Pequena 1", valorEstimado: 50_000 }),
      proc({ numero: "D", status: "homologada", fornecedor: "Pequena 2", valorEstimado: 50_000 }),
    ];
    const padroes = detectarConcentracaoDeFornecedor(dois);
    expect(padroes.map((p) => p.chave)).toEqual(["licitacoes:fornecedor:grande"]);
  });

  it("processo em disputa não conta como vitória", () => {
    const emDisputa = base.map((p) => ({ ...p, status: "em_disputa" }));
    expect(detectarConcentracaoDeFornecedor(emDisputa)).toHaveLength(0);
  });

  it("não acusa: o texto conta, a ação manda conferir", () => {
    const [p] = detectarConcentracaoDeFornecedor(base);
    expect(p.texto).not.toMatch(/irregular|fraude|direcion/i);
    expect(p.acao).toContain("relação de licitantes habilitados");
  });
});

describe("dispensa colada no teto", () => {
  it("dispensa a 2% do limite é achado; a 30%, não", () => {
    const perto = proc({ numero: "D 1", modalidade: "Dispensa", objeto: "Material de limpeza", valorEstimado: L * 0.98 });
    const longe = proc({ numero: "D 2", modalidade: "Dispensa", objeto: "Material de limpeza", valorEstimado: L * 0.7 });
    const padroes = detectarDispensaNoTeto([perto, longe], HOJE);
    expect(padroes.map((p) => p.chave)).toEqual(["licitacao:D 1:teto"]);
    expect(padroes[0].texto).toContain("a 2% do limite de dispensa");
    expect(padroes[0].texto).toContain(LIMITE_DISPENSA.base);
  });

  it("acima do limite não é 'colada no teto' — é outro problema, de outra regra", () => {
    const acima = proc({ numero: "D 3", modalidade: "Dispensa", objeto: "Material", valorEstimado: L * 1.1 });
    expect(detectarDispensaNoTeto([acima], HOJE)).toHaveLength(0);
  });

  it("obra e engenharia têm limite próprio que o módulo não conhece — silêncio", () => {
    const obra = proc({ numero: "D 4", modalidade: "Dispensa", objeto: "Reforma da UBS Norte", valorEstimado: L * 0.98 });
    expect(detectarDispensaNoTeto([obra], HOJE)).toHaveLength(0);
  });

  it("com o limite fora de vigência, não julga — número velho acusaria errado", () => {
    const perto = proc({ numero: "D 1", modalidade: "Dispensa", objeto: "Material", valorEstimado: L * 0.98 });
    expect(detectarDispensaNoTeto([perto], ANO_SEGUINTE)).toHaveLength(0);
  });
});

describe("detectarPadroes", () => {
  it("ordena pelo dinheiro envolvido", () => {
    const processos = [
      proc({ numero: "D 1", modalidade: "Dispensa", objeto: "Material", valorEstimado: L * 0.95 }),
      proc({ numero: "PE 1", status: "homologada", fornecedor: "Grande", valorEstimado: 2_000_000 }),
      proc({ numero: "PE 2", status: "homologada", fornecedor: "Grande", valorEstimado: 2_000_000 }),
      proc({ numero: "PE 3", status: "homologada", fornecedor: "Grande", valorEstimado: 2_000_000 }),
    ];
    const tipos = detectarPadroes(processos, HOJE).map((p) => p.tipo);
    expect(tipos).toEqual(["fornecedor", "teto_dispensa"]);
  });
});
