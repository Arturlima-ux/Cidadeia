import { describe, expect, it } from "vitest";
import { rotuloDoMes, proximaFronteira, resumirObras, resumirProtocolos, seriePessoal, type ObraParaResumo } from "@/lib/visao-do-prefeito";

const hoje = new Date("2026-10-20T12:00:00.000Z");
const diasAtras = (n: number) => new Date(hoje.getTime() - n * 86_400_000).toISOString();

describe("protocolos abertos", () => {
  it("conta só os sem resposta, e separa vencidos dos que vencem em breve", () => {
    const r = resumirProtocolos(
      [
        { tipo: "informacao", status: "aberto", abertoEm: diasAtras(25) }, // 20 dias: vencido
        { tipo: "reclamacao", status: "em_analise", abertoEm: diasAtras(25) }, // 30 dias: faltam 5
        { tipo: "protocolo", status: "aberto", abertoEm: diasAtras(2) }, // folgado
        { tipo: "protocolo", status: "respondido", abertoEm: diasAtras(40), respondidoEm: diasAtras(1) },
      ],
      hoje
    );
    expect(r).toEqual({ abertos: 3, vencidos: 1, vencemEmBreve: 1 });
  });
});

const obra = (o: Partial<ObraParaResumo>): ObraParaResumo => ({
  id: "x",
  objeto: "Obra",
  fornecedorNome: null,
  valorInicial: null,
  valorGlobal: null,
  vigenciaInicio: "2026-01-01",
  vigenciaFim: "2026-12-31",
  progressoInformado: 80,
  progressoAtualizadoEm: diasAtras(3),
  status: "em_andamento",
  ...o,
});

describe("obras no prazo", () => {
  it("só entra no denominador o que dá para avaliar", () => {
    const r = resumirObras(
      [
        obra({}), // em dia
        obra({ progressoInformado: 30 }), // 80% do prazo, 30% feito: atrasada
        obra({ progressoInformado: null, progressoAtualizadoEm: null }), // sem medição
        obra({ vigenciaInicio: null, vigenciaFim: null }), // sem prazo: fora
        obra({ status: "concluida", progressoInformado: 10 }), // concluída: fora
      ],
      hoje
    );
    expect(r).toEqual({ noPrazo: 1, avaliadas: 2, atrasadas: 1, semMedicao: 1 });
  });

  it("obra sem datas usa o esperado digitado, e 'atrasada' marcada à mão conta como atrasada", () => {
    const sem = { vigenciaInicio: null, vigenciaFim: null };
    const r = resumirObras(
      [
        obra({ ...sem, progressoInformado: 72, progressoEsperado: 75 }), // dentro da folga
        obra({ ...sem, progressoInformado: 35, progressoEsperado: 60 }), // atrás
        obra({ status: "atrasada" }),
      ],
      hoje
    );
    expect(r).toEqual({ noPrazo: 1, avaliadas: 3, atrasadas: 2, semMedicao: 0 });
  });
});

describe("despesa com pessoal", () => {
  it("a próxima fronteira acima do percentual atual", () => {
    expect(proximaFronteira(46.1)?.nome).toBe("alerta");
    expect(proximaFronteira(49)?.nome).toBe("prudencial");
    expect(proximaFronteira(52)?.nome).toBe("teto");
    expect(proximaFronteira(55)).toBeNull();
  });

  it("série em ordem de data, sem RCL zerada", () => {
    const s = seriePessoal([
      { exercicio: 2026, mesReferencia: 8, rcl: 100, despesa: 46.1 },
      { exercicio: 2025, mesReferencia: 12, rcl: 100, despesa: 44 },
      { exercicio: 2026, mesReferencia: 4, rcl: 0, despesa: 10 },
    ]);
    expect(s.map((p) => p.rotulo)).toEqual(["dez/25", "ago/26"]);
    expect(s[1].percentual).toBeCloseTo(46.1);
  });

  it("o mês do eixo é o de Brasília, como no texto do aviso", () => {
    expect(rotuloDoMes("2026-11-01T01:00:00.000Z")).toBe("out/26");
  });
});
