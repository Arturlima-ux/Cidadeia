import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  montarNotificacao,
  motivoDaNotificacao,
  prazoNaMedicao,
  resumoDaAprovacaoNotificacao,
  ehAprovacaoDeNotificacao,
  situacaoDaNotificacao,
  carimboDaNotificacao,
  type ContratoDaObra,
  type ObraParaNotificacao,
} from "@/lib/notificacao-obra";
import { textoCorrido } from "@/lib/kit-contratacao";

const PREF = { municipio: "Exemplópolis", estado: "PI" };
const FUSO = "America/Fortaleza";

function obra(extra: Partial<ObraParaNotificacao> = {}): ObraParaNotificacao {
  return {
    id: "obra1",
    nome: "Construção da creche do bairro Esperança",
    bairro: "Esperança",
    progressoAtual: 40,
    atualizadoEm: "2026-07-01T15:00:00.000Z",
    vigenciaInicio: "2026-01-01",
    vigenciaFim: "2026-09-30",
    valorContrato: 1250000,
    fornecedorNome: "Construtora Exemplo Ltda",
    ...extra,
  };
}

const CONTRATO: ContratoDaObra = {
  numeroContrato: "31/2025",
  processo: "CC 4/2025",
  objeto: "Construção de creche municipal no bairro Esperança",
  fornecedorNome: "Construtora Exemplo Ltda",
  fornecedorDocumento: "11222333000181",
  fornecedorTipoPessoa: "PJ",
  valorGlobal: 1250000,
};

const texto = (p: ReturnType<typeof montarNotificacao>) => p.documentos.map(textoCorrido).join("\n");

describe("quando a obra pede notificação", () => {
  it("só prazo encerrado sem conclusão e atraso relevante", () => {
    expect(motivoDaNotificacao("contrato_encerrado_sem_conclusao")).toBe("prazo_encerrado");
    expect(motivoDaNotificacao("atras_do_prazo")).toBe("atraso");
    for (const s of ["sem_noticia", "em_dia", "nao_comecou", "sem_prazo"] as const) {
      expect(motivoDaNotificacao(s)).toBeNull();
    }
  });
});

describe("prazo transcorrido na data da medição", () => {
  it("é o da medição, não o de hoje", () => {
    // 1º/jan a 30/set: 272 dias; 1º/jul está no dia 181.
    expect(Math.round(prazoNaMedicao("2026-01-01", "2026-09-30", "2026-07-01")!)).toBe(67);
  });
  it("sem uma das datas não há número", () => {
    expect(prazoNaMedicao(null, "2026-09-30", "2026-07-01")).toBeNull();
    expect(prazoNaMedicao("2026-01-01", "2026-09-30", null)).toBeNull();
  });
  it("contrato de um dia não divide por zero", () => {
    expect(prazoNaMedicao("2026-07-11", "2026-07-11", "2026-07-11")).toBe(100);
  });
});

describe("a notificação de prazo encerrado", () => {
  const pacote = montarNotificacao("prazo_encerrado", obra(), CONTRATO, PREF, FUSO);
  const t = texto(pacote);

  it("traz os fatos do contrato e da medição", () => {
    expect(t).toContain("Contrato nº 31/2025");
    expect(t).toContain("processo CC 4/2025");
    expect(t).toContain("Construtora Exemplo Ltda, CNPJ 11.222.333/0001-81");
    expect(t).toContain("encerrou-se em 30/09/2026");
    expect(t).toContain("em 01/07/2026, a execução estava em 40%, quando já havia transcorrido 67% do prazo contratual");
  });

  it("cita o art. 111 sem concluir pela culpa", () => {
    expect(t).toContain("art. 111 da Lei nº 14.133/2021");
    expect(t).toContain("não aplica sanção nem conclui pela culpa");
    expect(t).not.toMatch(/fica constituída em mora|aplica-se a multa|está em mora/i);
  });

  it("deixa o prazo de resposta em branco, como pendência", () => {
    expect(pacote.pendencias).toContain("[prazo para resposta]");
    expect(t).not.toMatch(/prazo de \d+ dias/);
  });

  it("traz o registro de ocorrência do art. 117", () => {
    expect(pacote.documentos.map((d) => d.chave)).toEqual(["notificacao-contratada", "registro-ocorrencia"]);
    expect(t).toContain("art. 117, § 1º");
  });

  it("não depende de hoje: o mesmo texto em dias diferentes", () => {
    const outra = montarNotificacao("prazo_encerrado", obra(), CONTRATO, PREF, FUSO);
    expect(outra.impressao).toBe(pacote.impressao);
    expect(t).not.toMatch(/há \d+ dias|faltam \d+/);
  });

  it("muda a impressão quando a medição muda", () => {
    const depois = montarNotificacao("prazo_encerrado", obra({ progressoAtual: 55 }), CONTRATO, PREF, FUSO);
    expect(depois.impressao).not.toBe(pacote.impressao);
  });
});

describe("a notificação de atraso", () => {
  it("pede cronograma de recuperação até o fim do contrato", () => {
    const t = texto(montarNotificacao("atraso", obra(), CONTRATO, PREF, FUSO));
    expect(t).toContain("cronograma de recuperação que assegure a conclusão até 30/09/2026");
    expect(t).not.toContain("encerrou-se");
  });
});

describe("o que o sistema não sabe vira colchete", () => {
  it("obra sem contrato vinculado e sem medição", () => {
    const pacote = montarNotificacao("prazo_encerrado", obra({ progressoAtual: null, fornecedorNome: null }), null, PREF, FUSO);
    const t = texto(pacote);
    expect(t).toContain("Contrato nº [número do contrato]");
    expect(t).toContain("[razão social da contratada]");
    expect(t).toContain("Não há, no registro da fiscalização, medição que ateste a conclusão do objeto.");
    expect(t).not.toContain("0%");
  });

  it("CPF de pessoa física nunca sai inteiro", () => {
    const t = texto(
      montarNotificacao("prazo_encerrado", obra(), { ...CONTRATO, fornecedorDocumento: "12345678909", fornecedorTipoPessoa: "PF" }, PREF, FUSO)
    );
    expect(t).not.toContain("12345678909");
    expect(t).toContain("CPF [CPF do contratado]");
  });
});

describe("a aprovação", () => {
  const pacote = montarNotificacao("prazo_encerrado", obra(), CONTRATO, PREF, FUSO);
  const resumo = resumoDaAprovacaoNotificacao("Construção da creche", "31/2025", pacote.impressao);
  const aprovacao = { usuarioNome: "Maria", usuarioCargo: "secretario", createdAt: "2026-10-20T13:00:00Z", resumo };

  it("é reconhecida entre as outras linhas de auditoria da obra", () => {
    expect(ehAprovacaoDeNotificacao(resumo)).toBe(true);
    expect(ehAprovacaoDeNotificacao("decisão: mora_do_contratado")).toBe(false);
    expect(resumo.length).toBeLessThanOrEqual(400);
  });

  it("vale para o texto aprovado, e só para ele", () => {
    expect(situacaoDaNotificacao([aprovacao], pacote).tipo).toBe("aprovado");
    const mudou = montarNotificacao("prazo_encerrado", obra({ progressoAtual: 70 }), CONTRATO, PREF, FUSO);
    expect(situacaoDaNotificacao([aprovacao], mudou).tipo).toBe("desatualizado");
    expect(situacaoDaNotificacao([], pacote).tipo).toBe("rascunho");
  });

  it("ignora linhas de auditoria que não são desta aprovação", () => {
    const outra = { ...aprovacao, resumo: `progresso 50%, status em_andamento Ref. ${pacote.impressao}`, createdAt: "2026-10-21T00:00:00Z" };
    expect(situacaoDaNotificacao([aprovacao, outra], pacote).tipo).toBe("aprovado");
  });

  it("o arquivo diz que é rascunho até alguém aprovar", () => {
    expect(carimboDaNotificacao({ tipo: "rascunho" }, pacote)).toMatch(/^RASCUNHO/);
    expect(carimboDaNotificacao({ tipo: "aprovado", aprovacao }, pacote)).toContain("Aprovar não é assinar nem enviar");
  });
});

describe("a guarda", () => {
  it("a aprovação lê pela porta que confere cargo, plano e prefeitura", () => {
    const acao = readFileSync("src/app/dashboard/secretarias/obras/notificacao-actions.ts", "utf8");
    expect(acao).toContain("lerNotificacao(sessao, obraId)");
    expect(acao).toContain("sessao.demo");
    const servidor = readFileSync("src/lib/notificacao-servidor.ts", "utf8");
    expect(servidor).toContain('exigirPlano(sessao.prefeituraId, "obras")');
    expect(servidor).toMatch(/eq\(obras\.prefeituraId, sessao\.prefeituraId\)/);
    expect(servidor).toContain('sessao.cargo === "unidade" || sessao.cargo === "escola"');
  });

  it("aprovar a notificação não registra mora", () => {
    const acao = readFileSync("src/app/dashboard/secretarias/obras/notificacao-actions.ts", "utf8");
    expect(acao).not.toContain("decisoesObra");
  });
});
