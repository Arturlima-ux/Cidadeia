import { describe, it, expect } from "vitest";
import {
  OPCOES_DECISAO,
  opcaoDe,
  validarDecisao,
  decisaoAindaVale,
  resumoDaDecisao,
  MINIMO_JUSTIFICATIVA,
  BASE_LEGAL_ESCOPO,
  type DecisaoObra,
} from "@/lib/decisao-obra";

const HOJE = new Date("2026-10-02T12:00:00Z");
const JUSTIFICATIVA =
  "A frente de serviço parou por chuva prolongada em agosto e setembro, conforme boletins anexos.";

const decisao = (d: Partial<DecisaoObra> = {}): DecisaoObra => ({
  tipo: "prorrogacao_automatica",
  justificativa: JUSTIFICATIVA,
  novaPrevisao: "2026-12-20",
  documento: "Processo 1234/2026",
  decididoPor: "Maria da Silva",
  decididoEm: "2026-10-02T10:00:00.000Z",
  ...d,
});

describe("as opções saem da lei, não de um menu inventado", () => {
  it("as três hipóteses do art. 111 estão cobertas", () => {
    // caput: prorrogação automática.
    // § único, I: mora do contratado e sanções.
    // § único, II: extinção, com medidas para continuidade.
    const tipos = OPCOES_DECISAO.map((o) => o.tipo);
    expect(tipos).toContain("prorrogacao_automatica");
    expect(tipos).toContain("mora_do_contratado");
    expect(tipos).toContain("extincao");
  });

  it("cada opção fundada em lei cita o dispositivo", () => {
    for (const t of ["prorrogacao_automatica", "mora_do_contratado", "extincao"] as const) {
      expect(opcaoDe(t).base).toContain(BASE_LEGAL_ESCOPO);
    }
    expect(opcaoDe("prorrogacao_automatica").base).toContain("caput");
    expect(opcaoDe("mora_do_contratado").base).toContain("I");
    expect(opcaoDe("extincao").base).toContain("II");
  });

  it("as opções que não são da lei não fingem ser", () => {
    // "A obra acabou" e "a data está errada" são fatos administrativos, não
    // hipóteses legais. Citar artigo nelas daria falsa autoridade.
    expect(opcaoDe("concluida").base).toBeNull();
    expect(opcaoDe("correcao_de_cadastro").base).toBeNull();
  });

  it("só as duas que responsabilizam o contratado afirmam culpa", () => {
    const comCulpa = OPCOES_DECISAO.filter((o) => o.afirmaCulpa).map((o) => o.tipo);
    expect(comCulpa.sort()).toEqual(["extincao", "mora_do_contratado"]);
  });

  it("toda opção explica o que está sendo afirmado", () => {
    // Quem escolhe precisa saber o que assinou embaixo.
    for (const o of OPCOES_DECISAO) expect(o.significado.length).toBeGreaterThan(50);
  });
});

describe("a justificativa não pode ser um 'ok'", () => {
  // Campo livre que aceita "ok" vira campo preenchido com "ok", e um registro
  // de decisão com "ok" é pior que nenhum: dá aparência de processo a uma
  // decisão que não foi fundamentada, e é isso que o Tribunal aponta.

  it("texto curto é recusado", () => {
    const p = validarDecisao(
      { tipo: "prorrogacao_automatica", justificativa: "ok", novaPrevisao: "2026-12-20" },
      HOJE
    );
    expect(p.map((x) => x.campo)).toContain("justificativa");
  });

  it("espaço em branco não conta como texto", () => {
    const p = validarDecisao(
      {
        tipo: "prorrogacao_automatica",
        justificativa: " ".repeat(MINIMO_JUSTIFICATIVA + 10),
        novaPrevisao: "2026-12-20",
      },
      HOJE
    );
    expect(p.map((x) => x.campo)).toContain("justificativa");
  });

  it("a mensagem diz para quem o texto serve", () => {
    const p = validarDecisao(
      { tipo: "prorrogacao_automatica", justificativa: "ok", novaPrevisao: "2026-12-20" },
      HOJE
    );
    expect(p.find((x) => x.campo === "justificativa")!.mensagem).toMatch(/Tribunal de Contas/);
  });

  it("justificativa suficiente passa", () => {
    const p = validarDecisao(
      { tipo: "prorrogacao_automatica", justificativa: JUSTIFICATIVA, novaPrevisao: "2026-12-20" },
      HOJE
    );
    expect(p).toEqual([]);
  });
});

describe("as datas não podem trocar de lado", () => {
  it("conclusão no futuro é recusada", () => {
    // Conclusão é fato passado. É o erro de digitação mais comum num campo de
    // data, e aqui produziria uma obra "concluída daqui a seis meses".
    const p = validarDecisao(
      { tipo: "concluida", justificativa: JUSTIFICATIVA, novaPrevisao: "2027-03-01" },
      HOJE
    );
    expect(p.map((x) => x.campo)).toContain("novaPrevisao");
  });

  it("previsão no passado é recusada", () => {
    const p = validarDecisao(
      { tipo: "prorrogacao_automatica", justificativa: JUSTIFICATIVA, novaPrevisao: "2026-01-10" },
      HOJE
    );
    expect(p.map((x) => x.campo)).toContain("novaPrevisao");
  });

  it("conclusão no passado e previsão no futuro passam", () => {
    expect(
      validarDecisao(
        { tipo: "concluida", justificativa: JUSTIFICATIVA, novaPrevisao: "2026-09-15" },
        HOJE
      )
    ).toEqual([]);
    expect(
      validarDecisao(
        { tipo: "prorrogacao_automatica", justificativa: JUSTIFICATIVA, novaPrevisao: "2026-12-20" },
        HOJE
      )
    ).toEqual([]);
  });

  it("extinção não pede data, porque não promete conclusão", () => {
    const p = validarDecisao(
      { tipo: "extincao", justificativa: JUSTIFICATIVA, novaPrevisao: null },
      HOJE
    );
    expect(p).toEqual([]);
  });

  it("data em formato estranho é recusada", () => {
    const p = validarDecisao(
      { tipo: "prorrogacao_automatica", justificativa: JUSTIFICATIVA, novaPrevisao: "20/12/2026" },
      HOJE
    );
    expect(p.map((x) => x.campo)).toContain("novaPrevisao");
  });

  it("tipo fora da lista é recusado antes de tudo", () => {
    const p = validarDecisao(
      // @ts-expect-error — é justamente o caso de entrada inválida que o
      // formulário poderia mandar.
      { tipo: "qualquer_coisa", justificativa: JUSTIFICATIVA, novaPrevisao: null },
      HOJE
    );
    expect(p).toHaveLength(1);
    expect(p[0]!.campo).toBe("tipo");
  });
});

describe("decisão com prazo vence", () => {
  // "Prorrogado, previsão para 30/06" é compromisso, não encerramento de
  // assunto. Sem vencimento, bastaria registrar qualquer decisão para a obra
  // sumir da tela para sempre — e o registro viraria um jeito de calar o
  // sistema.

  it("a previsão ainda no futuro mantém a decisão válida", () => {
    expect(decisaoAindaVale(decisao({ novaPrevisao: "2026-12-20" }), HOJE)).toBe(true);
  });

  it("previsão vencida traz o alerta de volta", () => {
    expect(decisaoAindaVale(decisao({ novaPrevisao: "2026-09-01" }), HOJE)).toBe(false);
  });

  it("obra concluída não vence", () => {
    expect(
      decisaoAindaVale(decisao({ tipo: "concluida", novaPrevisao: "2026-09-01" }), HOJE)
    ).toBe(true);
  });

  it("extinção não vence: encerra o acompanhamento daquele contrato", () => {
    expect(decisaoAindaVale(decisao({ tipo: "extincao", novaPrevisao: null }), HOJE)).toBe(true);
  });

  it("a previsão vence no dia seguinte, não no próprio dia", () => {
    expect(decisaoAindaVale(decisao({ novaPrevisao: "2026-10-02" }), HOJE)).toBe(true);
    expect(decisaoAindaVale(decisao({ novaPrevisao: "2026-10-01" }), HOJE)).toBe(false);
  });
});

describe("o resumo que a tela mostra", () => {
  it("traz quem decidiu, quando e o documento", () => {
    const r = resumoDaDecisao(decisao(), HOJE);
    expect(r).toContain("Maria da Silva");
    expect(r).toContain("02/10/2026");
    expect(r).toContain("Processo 1234/2026");
  });

  it("mostra a previsão em formato brasileiro", () => {
    expect(resumoDaDecisao(decisao(), HOJE)).toContain("20/12/2026");
  });

  it("avisa quando a decisão venceu, em vez de só sumir", () => {
    const r = resumoDaDecisao(decisao({ novaPrevisao: "2026-09-01" }), HOJE);
    expect(r).toMatch(/venceu/);
    expect(r).toMatch(/decidir de novo/);
  });

  it("obra concluída fala em conclusão, não em previsão", () => {
    const r = resumoDaDecisao(decisao({ tipo: "concluida", novaPrevisao: "2026-09-15" }), HOJE);
    expect(r).toContain("Concluída em 15/09/2026");
    expect(r).not.toContain("Previsão");
  });

  it("sem documento, não inventa um", () => {
    expect(resumoDaDecisao(decisao({ documento: null }), HOJE)).not.toContain("Documento");
  });
});
