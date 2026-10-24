import { describe, it, expect } from "vitest";
import {
  diagnosticar,
  historicoDoObjeto,
  montarPacote,
  mesesEntre,
  editalAte,
  limiteDecenal,
  pendenciasDe,
  resumoDaAprovacao,
  impressaoDoResumo,
  situacaoDaAprovacao,
  contratoSucessor,
  objetoNaFrase,
  estadoDaRenovacaoNaLista,
  type ContratoParaRenovacao,
  type PrefeituraParaRenovacao,
} from "@/lib/renovacao-contrato";
import { textoCorrido } from "@/lib/kit-contratacao";

const HOJE = new Date("2026-10-23T12:00:00Z");

const PREF: PrefeituraParaRenovacao = {
  municipio: "Exemplópolis",
  estado: "RS",
  cnpj: "12345678000195",
  prefeito: null,
};

function contrato(extra: Partial<ContratoParaRenovacao> = {}): ContratoParaRenovacao {
  return {
    id: "c1",
    objeto: "Prestação de serviço de transporte escolar rural",
    numeroContrato: "12/2025",
    processo: "PE 8/2025",
    fornecedorNome: "Viação Exemplo Ltda",
    fornecedorDocumento: "11222333000181",
    fornecedorTipoPessoa: "PJ",
    valorInicial: 480000,
    valorGlobal: 480000,
    dataAssinatura: "2025-12-01",
    vigenciaInicio: "2025-12-01",
    vigenciaFim: "2026-11-30",
    categoria: "Serviços",
    frutoAdesao: false,
    ...extra,
  };
}

const todoTexto = (docs: { clausulas: unknown }[]) =>
  docs.map((d) => textoCorrido(d as Parameters<typeof textoCorrido>[0])).join("\n");

describe("datas da renovação", () => {
  it("conta o último dia da vigência: 01/12 a 30/11 são doze meses", () => {
    expect(mesesEntre("2025-12-01", "2026-11-30")).toBe(12);
    expect(mesesEntre("2026-01-15", "2026-07-14")).toBe(6);
    expect(mesesEntre("2026-01-15", "2026-07-13")).toBe(5);
  });

  it("a data-limite do edital recua só o prazo do art. 55, em dias úteis", () => {
    // Serviço comum: 10 dias úteis antes de 30/11/2026 (segunda) → 16/11/2026.
    expect(editalAte(contrato())).toBe("2026-11-16");
    expect(editalAte(contrato({ vigenciaFim: null }))).toBeNull();
  });

  it("o teto decenal do art. 107 conta da data de início registrada", () => {
    expect(limiteDecenal(contrato())).toBe("2035-11-30");
    expect(limiteDecenal(contrato({ vigenciaInicio: null }))).toBeNull();
  });
});

describe("diagnóstico: o que cada caminho ainda permite", () => {
  it("contrato vigente com folga oferece os dois caminhos", () => {
    const d = diagnosticar(contrato({ vigenciaFim: "2027-03-31" }), HOJE);
    expect(d.opcoes.every((o) => o.disponivel)).toBe(true);
    expect(d.editalAtrasado).toBe(false);
  });

  it("contrato vencido não oferece prorrogação: não há contrato para aditar", () => {
    const d = diagnosticar(contrato({ vigenciaFim: "2026-10-01" }), HOJE);
    const prorrogar = d.opcoes.find((o) => o.caminho === "prorrogar")!;
    expect(prorrogar.disponivel).toBe(false);
    expect(prorrogar.observacao).toMatch(/não prorroga/);
    expect(d.opcoes.find((o) => o.caminho === "licitar")!.disponivel).toBe(true);
    expect(d.prioridade).toBe("alta");
  });

  it("obra fica de fora dos dois caminhos e cita o art. 111", () => {
    const d = diagnosticar(contrato({ categoria: "Obras", objeto: "Pavimentação da rua A" }), HOJE);
    expect(d.ehObra).toBe(true);
    expect(d.opcoes.every((o) => !o.disponivel)).toBe(true);
    expect(d.opcoes[0].observacao).toMatch(/art\. 111/);
  });

  it("vigência que já chega a dez anos bloqueia a prorrogação", () => {
    const d = diagnosticar(contrato({ vigenciaInicio: "2016-12-01", vigenciaFim: "2026-11-30" }), HOJE);
    expect(d.opcoes.find((o) => o.caminho === "prorrogar")!.disponivel).toBe(false);
  });

  it("edital que já não cabe continua oferecendo licitar, dizendo do período descoberto", () => {
    const d = diagnosticar(contrato({ vigenciaFim: "2026-10-30" }), HOJE);
    expect(d.editalAtrasado).toBe(true);
    const licitar = d.opcoes.find((o) => o.caminho === "licitar")!;
    expect(licitar.disponivel).toBe(true);
    expect(licitar.observacao).toMatch(/descoberto/);
  });
});

describe("histórico do mesmo objeto", () => {
  const atual = contrato();
  const outros: ContratoParaRenovacao[] = [
    atual,
    contrato({ id: "c2", numeroContrato: "5/2024", objeto: "Serviço de transporte escolar rural das linhas 1 a 4", vigenciaInicio: "2024-02-01", vigenciaFim: "2025-01-31", valorGlobal: 400000 }),
    contrato({ id: "c3", objeto: "Aquisição de merenda escolar", fornecedorDocumento: "99888777000166", fornecedorNome: "Alimentos SA" }),
    contrato({ id: "c4", objeto: "Locação de veículo para transporte de pacientes", fornecedorDocumento: "11222333000181" }),
  ];

  it("traz contrato de objeto parecido e deixa de fora o que só divide uma palavra", () => {
    const h = historicoDoObjeto(atual, outros);
    expect(h.map((x) => x.id)).toContain("c2");
    expect(h.map((x) => x.id)).not.toContain("c3");
    expect(h.map((x) => x.id)).not.toContain("c1");
  });

  it("a mesma contratada aparece marcada", () => {
    const h = historicoDoObjeto(atual, outros);
    expect(h.find((x) => x.id === "c2")!.mesmoFornecedor).toBe(true);
  });
});

describe("pacote de prorrogação", () => {
  const pacote = montarPacote("prorrogar", contrato(), PREF, []);
  const texto = todoTexto(pacote.documentos);

  it("traz ofício, checklist e minuta do aditivo", () => {
    expect(pacote.documentos.map((d) => d.chave)).toEqual(["oficio-contratada", "checklist-prorrogacao", "termo-aditivo"]);
  });

  it("preenche o que o sistema sabe e deixa em branco o que é juízo", () => {
    expect(texto).toContain("Contrato nº 12/2025");
    expect(texto).toContain("PE 8/2025");
    expect(texto).toContain("30/11/2026");
    expect(texto).toContain("01/12/2026"); // dia seguinte ao fim, no aditivo
    expect(texto).toContain("11.222.333/0001-81");
    expect(pacote.pendencias).toContain("[prazo da prorrogação]");
    expect(pacote.pendencias).toContain("[juntar a pesquisa de preços e o atestado]");
    // Sem prefeito cadastrado, o nome fica como pendência — nunca inventado.
    expect(pacote.pendencias).toContain("[nome do(a) Prefeito(a)]");
  });

  it("cita só os artigos conferidos", () => {
    expect(texto).toMatch(/art\. 107/i);
    expect(texto).toContain("Art. 91, § 4º");
    expect(texto).toContain("Art. 94");
  });
});

describe("pacote da nova contratação", () => {
  const historico = historicoDoObjeto(contrato(), [
    contrato({ id: "c2", numeroContrato: "5/2024", objeto: "Serviço de transporte escolar rural", vigenciaInicio: "2024-02-01", vigenciaFim: "2025-01-31", valorGlobal: 400000 }),
  ]);
  const pacote = montarPacote("licitar", contrato(), PREF, historico);
  const texto = todoTexto(pacote.documentos);

  it("traz o documento de formalização de demanda e o estudo técnico preliminar", () => {
    expect(pacote.documentos.map((d) => d.chave)).toEqual(["dfd", "etp"]);
  });

  it("o estudo tem os treze elementos e marca os cinco obrigatórios", () => {
    const etp = pacote.documentos[1];
    const itens = etp.clausulas.filter((c) => /^[IVX]+\. /.test(c.titulo));
    expect(itens).toHaveLength(13);
    const obrigatorios = itens.filter((c) => c.titulo.includes("obrigatório")).map((c) => c.titulo.split(".")[0]);
    expect(obrigatorios).toEqual(["I", "IV", "VI", "VIII", "XIII"]);
  });

  it("dá a data em que o novo contrato precisa valer e a data-limite do edital", () => {
    expect(texto).toContain("01/12/2026");
    expect(texto).toContain("16/11/2026");
  });

  it("usa o histórico como referência e diz que média não é estimativa", () => {
    expect(texto).toContain("5/2024");
    expect(texto).toContain("40.000,00");
    expect(texto).toMatch(/uma média, não uma estimativa/);
    expect(pacote.pendencias.some((x) => /pesquisa de preços/.test(x))).toBe(true);
  });

  it("sugere o setor pelo objeto, mas como pendência", () => {
    expect(pacote.pendencias.some((x) => x.includes("provavelmente Secretaria de Educação"))).toBe(true);
  });
});

describe("dado de pessoa física", () => {
  it("CPF do contratado nunca sai em documento", () => {
    const pf = contrato({ fornecedorDocumento: "12345678909", fornecedorTipoPessoa: "PF", fornecedorNome: "Fulano de Tal" });
    for (const caminho of ["prorrogar", "licitar"] as const) {
      const texto = todoTexto(montarPacote(caminho, pf, PREF, []).documentos);
      expect(texto).not.toContain("12345678909");
      expect(texto).not.toContain("456.789");
    }
    expect(pendenciasDe(montarPacote("prorrogar", pf, PREF, []).documentos)).toContain("[CPF do contratado]");
  });
});

describe("a impressão do texto aprovado", () => {
  it("não depende do dia em que a tela é aberta", () => {
    const a = montarPacote("licitar", contrato(), PREF, []);
    const b = montarPacote("licitar", contrato(), PREF, []);
    expect(a.impressao).toBe(b.impressao);
    expect(a.impressao).toMatch(/^[0-9a-f]{8}$/);
  });

  it("muda quando o contrato muda ou o caminho muda", () => {
    const a = montarPacote("licitar", contrato(), PREF, []);
    expect(montarPacote("licitar", contrato({ vigenciaFim: "2026-12-31" }), PREF, []).impressao).not.toBe(a.impressao);
    expect(montarPacote("prorrogar", contrato(), PREF, []).impressao).not.toBe(a.impressao);
  });

  it("o resumo da auditoria carrega a impressão e cabe no limite da trilha", () => {
    const pacote = montarPacote("prorrogar", contrato({ fornecedorNome: "X".repeat(300) }), PREF, []);
    const resumo = resumoDaAprovacao(contrato({ fornecedorNome: "X".repeat(300) }), pacote);
    expect(resumo.length).toBeLessThanOrEqual(400);
    expect(impressaoDoResumo(resumo)).toBe(pacote.impressao);
  });
});

describe("situação da aprovação", () => {
  const prorrogar = montarPacote("prorrogar", contrato(), PREF, []);
  const licitar = montarPacote("licitar", contrato(), PREF, []);
  const linha = (resumo: string, createdAt: string) => ({ usuarioNome: "Ana", usuarioCargo: "secretario", createdAt, resumo });

  it("sem aprovação é rascunho", () => {
    expect(situacaoDaAprovacao([], [prorrogar, licitar]).tipo).toBe("rascunho");
  });

  it("a aprovação vale para o caminho cujo texto bate", () => {
    const s = situacaoDaAprovacao([linha(resumoDaAprovacao(contrato(), licitar), "2026-10-20T10:00:00Z")], [prorrogar, licitar]);
    expect(s).toMatchObject({ tipo: "aprovado", caminho: "licitar" });
  });

  it("vale a última decisão, não a primeira", () => {
    const s = situacaoDaAprovacao(
      [
        linha(resumoDaAprovacao(contrato(), licitar), "2026-10-21T10:00:00Z"),
        linha(resumoDaAprovacao(contrato(), prorrogar), "2026-10-20T10:00:00Z"),
      ],
      [prorrogar, licitar]
    );
    expect(s).toMatchObject({ tipo: "aprovado", caminho: "licitar" });
  });

  it("aprovação de um texto que mudou depois fica desatualizada", () => {
    const antigo = montarPacote("licitar", contrato({ vigenciaFim: "2026-09-30" }), PREF, []);
    const s = situacaoDaAprovacao([linha(resumoDaAprovacao(contrato(), antigo), "2026-10-20T10:00:00Z")], [prorrogar, licitar]);
    expect(s.tipo).toBe("desatualizado");
  });
});

describe("contrato já substituído", () => {
  const antigo = contrato({ id: "c2", numeroContrato: "5/2024", vigenciaInicio: "2024-02-01", vigenciaFim: "2025-01-31" });
  const atual = contrato();

  it("o antigo aponta o contrato que veio depois e não oferece renovação", () => {
    expect(contratoSucessor(antigo, [antigo, atual])?.id).toBe("c1");
    const e = estadoDaRenovacaoNaLista(antigo, [antigo, atual], PREF, []);
    expect(e?.estado).toBe("substituido");
    expect(e?.texto).toContain("12/2025");
  });

  it("o atual não tem sucessor e fica como rascunho montado", () => {
    expect(contratoSucessor(atual, [antigo, atual])).toBeNull();
    expect(estadoDaRenovacaoNaLista(atual, [antigo, atual], PREF, [])?.estado).toBe("rascunho");
  });

  it("obra não entra na lista de renovação", () => {
    expect(estadoDaRenovacaoNaLista(contrato({ categoria: "Obras" }), [], PREF, [])).toBeNull();
  });
});

describe("o objeto dentro da frase", () => {
  it("baixa só a inicial de palavra comum e preserva sigla", () => {
    expect(objetoNaFrase("Locação de software.")).toBe("locação de software");
    expect(objetoNaFrase("UBS do Centro: reforma")).toBe("UBS do Centro: reforma");
  });
});
