import { describe, it, expect } from "vitest";
import {
  analisarModulo,
  listarAchados,
  pontosDeDado,
  textoAnalise,
  type DadosAnalise,
  type IndicadorEducacao,
  type IndicadorSaude,
  type Licitacao,
  type Obra,
  type SnapshotFinanceiro,
} from "@/lib/analise-local";

function diasAtras(dias: number): string {
  return new Date(Date.now() - dias * 86400000).toISOString();
}

function diasNoFuturo(dias: number): string {
  return new Date(Date.now() + dias * 86400000).toISOString();
}

const AGORA = new Date().toISOString();

// Fábricas com tudo nulo por padrão: cada teste preenche SÓ o campo que a
// regra sob teste lê. Assim um achado inesperado é sempre culpa da regra
// testada, nunca de um dado de fundo que alguém deixou preenchido.
function indicadorSaude(p: Partial<IndicadorSaude> = {}): IndicadorSaude {
  return {
    tempoMedioAtendimentoMin: null,
    medicosAtivos: null,
    faltasPercentual: null,
    estoqueMedicamentosPercentual: null,
    atualizadoEm: AGORA,
    ...p,
  };
}

function indicadorEducacao(p: Partial<IndicadorEducacao> = {}): IndicadorEducacao {
  return {
    frequenciaPercentual: null,
    notaMedia: null,
    alunosTransporte: null,
    professoresAtivos: null,
    atualizadoEm: AGORA,
    ...p,
  };
}

function obra(p: Partial<Obra> = {}): Obra {
  return {
    nome: "Creche do Centro",
    bairro: null,
    progressoAtual: 50,
    progressoEsperado: 50,
    valorContrato: null,
    status: "em_andamento",
    atualizadoEm: AGORA,
    ...p,
  };
}

function licitacao(p: Partial<Licitacao> = {}): Licitacao {
  return {
    numero: "001/2026",
    objeto: "Merenda escolar",
    modalidade: null,
    valorEstimado: null,
    fornecedor: null,
    status: "publicada",
    observacaoRisco: null,
    prazoFinal: null,
    ...p,
  };
}

function snapshot(p: Partial<SnapshotFinanceiro> = {}): SnapshotFinanceiro {
  return {
    receita: null,
    despesas: null,
    saldo: null,
    indiceTransparencia: null,
    atualizadoEm: AGORA,
    ...p,
  };
}

const UNIDADE = { nome: "UBS Centro", tipo: "ubs", bairro: "Centro" };

describe("quando não há dado", () => {
  it("distingue módulo não carregado de módulo carregado e vazio", () => {
    // As duas situações mandam recados diferentes: no primeiro caso o
    // problema é nosso (não trouxemos o dado), no segundo é do cadastro. Só
    // o segundo pode virar tarefa para o gestor.
    const naoCarregado = analisarModulo("saude", {});
    expect(naoCarregado.situacao).toBe("sem_dados");
    expect(naoCarregado.acao).toBeNull();

    const vazio = analisarModulo("saude", { saude: { indicador: null, unidades: [] } });
    expect(vazio.situacao).toBe("sem_dados");
    expect(vazio.acao).toContain("Registre");
  });

  it("não conclui nada quando o indicador existe mas está todo em branco", () => {
    // Campo nulo é ausência de informação, nunca zero — inventar leitura em
    // cima de formulário vazio é exatamente o que a versão com IA proíbe.
    const r = analisarModulo("saude", { saude: { indicador: indicadorSaude(), unidades: [] } });
    expect(r.situacao).toBe("sem_dados");
    expect(r.principal).toBeNull();
  });

  it("não força insight na visão geral sem nenhum módulo carregado", () => {
    const r = analisarModulo("geral", {});
    expect(r.situacao).toBe("sem_dados");
    expect(r.secundarios).toHaveLength(0);
  });

  it("diz o que foi conferido quando nenhuma regra dispara", () => {
    // "Está tudo bem" sem a lista do que foi olhado não é verificável.
    const r = analisarModulo("saude", {
      saude: {
        indicador: indicadorSaude({ estoqueMedicamentosPercentual: 90, faltasPercentual: 3 }),
        unidades: [UNIDADE],
      },
    });
    expect(r.situacao).toBe("sem_achado");
    expect(r.texto).toContain("estoque de medicamentos em 90%");
    expect(r.acao).toBeNull();
  });
});

describe("dado parcial", () => {
  it("conclui a partir do único campo preenchido e cita o número", () => {
    const r = analisarModulo("saude", {
      saude: { indicador: indicadorSaude({ estoqueMedicamentosPercentual: 32 }), unidades: [] },
    });
    expect(r.situacao).toBe("achado");
    expect(r.texto).toContain("32%");
    expect(r.principal?.severidade).toBe("medio");
  });

  it("trata 0 médicos ativos como registro duvidoso, não como cidade sem médico", () => {
    // O dado não distingue "rede sem médico" de "campo preenchido errado".
    // Afirmar a primeira hipótese e estar errado queima o produto dentro da
    // prefeitura — então o achado é sobre o registro.
    const r = listarAchados("saude", {
      saude: { indicador: indicadorSaude({ medicosAtivos: 0 }), unidades: [UNIDADE] },
    });
    expect(r).toHaveLength(1);
    expect(r[0].eixo).toBe("qualidade_do_dado");
    expect(r[0].severidade).toBe("medio");
  });

  it("ignora a nota média quando ela não cabe na escala de 0 a 10", () => {
    // Rede que lança nota de 0 a 100 teria "nota 75" acusada de crítica.
    const r = listarAchados("educacao", {
      educacao: {
        indicador: indicadorEducacao({ notaMedia: 75, frequenciaPercentual: 95 }),
        escolas: [{ nome: "EM Rui Barbosa", bairro: null, evasaoPercentual: 2 }],
      },
    });
    expect(r).toHaveLength(0);
  });

  it("julga a nota média quando ela está na escala conhecida", () => {
    const r = listarAchados("educacao", {
      educacao: {
        indicador: indicadorEducacao({ notaMedia: 3.5 }),
        escolas: [{ nome: "EM Rui Barbosa", bairro: null, evasaoPercentual: 2 }],
      },
    });
    expect(r).toHaveLength(1);
    expect(r[0].severidade).toBe("urgente");
    expect(r[0].texto).toContain("3,5");
  });

  it("aponta só a escola com a pior evasão, nomeada", () => {
    const r = listarAchados("educacao", {
      educacao: {
        indicador: null,
        escolas: [
          { nome: "EM Rui Barbosa", bairro: "Centro", evasaoPercentual: 4 },
          { nome: "EM Castro Alves", bairro: "Alto", evasaoPercentual: 18 },
        ],
      },
    });
    expect(r).toHaveLength(1);
    expect(r[0].texto).toContain("EM Castro Alves");
    expect(r[0].texto).toContain("18%");
    expect(r[0].acao).toContain("EM Castro Alves");
  });
});

describe("prioridade entre achados concorrentes", () => {
  it("põe licitação vencendo amanhã na frente de obra parada há 60 dias", () => {
    // Passado o prazo da licitação o processo tem de ser refeito; a obra
    // parada continua recuperável amanhã. É o desempate por irreversibilidade.
    const r = analisarModulo("geral", {
      obras: [obra({ atualizadoEm: diasAtras(60), progressoAtual: 10, progressoEsperado: 10 })],
      licitacoes: [licitacao({ prazoFinal: diasNoFuturo(1) })],
    });
    expect(r.principal?.modulo).toBe("licitacoes");
    expect(r.principal?.eixo).toBe("prazo_legal");
    expect(r.secundarios[0].modulo).toBe("obras");
  });

  it("põe severidade acima do eixo: estoque em 5% ganha de prazo a 6 dias", () => {
    // O eixo só desempata entre iguais. Um prazo que ainda tem uma semana
    // (medio) não pode passar na frente de remédio acabando (urgente).
    const r = analisarModulo("geral", {
      saude: { indicador: indicadorSaude({ estoqueMedicamentosPercentual: 5 }), unidades: [UNIDADE] },
      licitacoes: [licitacao({ prazoFinal: diasNoFuturo(6) })],
    });
    expect(r.principal?.modulo).toBe("saude");
    expect(r.principal?.severidade).toBe("urgente");
    expect(r.secundarios[0].modulo).toBe("licitacoes");
  });

  it("desempata por dinheiro em risco entre achados idênticos", () => {
    const r = listarAchados("obras", {
      obras: [
        obra({ nome: "Praça", status: "paralisada", valorContrato: 100_000 }),
        obra({ nome: "Ponte", status: "paralisada", valorContrato: 1_000_000 }),
      ],
    });
    expect(r.map((a) => a.chave)).toEqual(["obra:Ponte", "obra:Praça"]);
  });

  it("deixa a qualidade do dado por último", () => {
    // Indicador velho é informação sobre o registro, não sobre a cidade;
    // promovê-lo faria o painel gritar sobre formulário enquanto a obra afunda.
    const r = listarAchados("geral", {
      saude: { indicador: indicadorSaude({ atualizadoEm: diasAtras(60), faltasPercentual: 20 }), unidades: [UNIDADE] },
    });
    expect(r[0].eixo).toBe("servico_essencial");
    expect(r[r.length - 1].eixo).toBe("qualidade_do_dado");
  });

  it("mostra um achado por objeto do mundo real, o mais grave", () => {
    // A mesma obra dispara três regras (paralisada, sem registro, atrasada).
    // Sem isso a lista secundária vira três linhas sobre a mesma obra.
    const r = listarAchados("obras", {
      obras: [
        obra({
          nome: "Creche do Centro",
          status: "paralisada",
          atualizadoEm: diasAtras(60),
          progressoAtual: 10,
          progressoEsperado: 50,
        }),
      ],
    });
    expect(r).toHaveLength(1);
    expect(r[0].texto).toContain("paralisada");
  });
});

describe("regras reutilizadas de deteccao-automatica", () => {
  it("herda o veredito do detector de obra parada e acrescenta o contrato", () => {
    const r = listarAchados("obras", {
      obras: [obra({ atualizadoEm: diasAtras(45), valorContrato: 250_000 })],
    });
    expect(r[0].severidade).toBe("urgente");
    expect(r[0].texto).toContain("250.000");
    expect(r[0].texto).toContain("45 dias");
  });

  it("não sinaliza licitação já homologada, nem pelo risco anotado", () => {
    const dados: DadosAnalise = {
      licitacoes: [
        licitacao({ status: "homologada", prazoFinal: diasAtras(10), observacaoRisco: "fornecedor único" }),
      ],
    };
    expect(listarAchados("licitacoes", dados)).toHaveLength(0);
    expect(analisarModulo("licitacoes", dados).situacao).toBe("sem_achado");
  });

  it("cita o risco anotado pelo servidor entre aspas, sem reinterpretar", () => {
    const r = listarAchados("licitacoes", {
      licitacoes: [licitacao({ observacaoRisco: "fornecedor único no município" })],
    });
    expect(r).toHaveLength(1);
    expect(r[0].texto).toContain('"fornecedor único no município"');
  });

  it("herda do detector o saldo negativo e diz de quanto", () => {
    const r = listarAchados("geral", { financeiro: { snapshot: snapshot({ saldo: -50_000 }) } });
    expect(r[0].severidade).toBe("urgente");
    expect(r[0].texto).toContain("50.000");
  });
});

describe("financeiro", () => {
  it("cobre o caso que o detector de saldo deixa de fora: saldo em branco", () => {
    // detectarSaldoNegativo exige saldo preenchido. Com receita e despesa
    // lançadas a conta é aritmética sobre dado real, não estimativa.
    const r = listarAchados("geral", {
      financeiro: { snapshot: snapshot({ saldo: null, receita: 100_000, despesas: 300_000 }) },
    });
    expect(r).toHaveLength(1);
    expect(r[0].severidade).toBe("medio");
    expect(r[0].texto).toContain("200.000");
  });

  it("não trata transparência baixa como emergência do dia", () => {
    // É exposição legal crônica (LAI). Como urgente, passaria na frente de
    // todo prazo que vence amanhã, todo dia, até virar ruído.
    const r = listarAchados("geral", {
      financeiro: { snapshot: snapshot({ saldo: 1_000, indiceTransparencia: 30 }) },
    });
    expect(r).toHaveLength(1);
    expect(r[0].severidade).toBe("medio");
    expect(r[0].texto).toContain("30%");
  });

  it("avisa quando o retrato financeiro está velho", () => {
    const r = listarAchados("geral", {
      financeiro: { snapshot: snapshot({ saldo: 1_000, atualizadoEm: diasAtras(45) }) },
    });
    expect(r).toHaveLength(1);
    expect(r[0].eixo).toBe("qualidade_do_dado");
    expect(r[0].texto).toContain("45 dias");
  });
});

describe("escopo e formato da saída", () => {
  it("análise de um módulo não puxa achado de outro", () => {
    const r = analisarModulo("saude", {
      obras: [obra({ status: "paralisada" })],
      saude: { indicador: indicadorSaude({ estoqueMedicamentosPercentual: 90 }), unidades: [UNIDADE] },
    });
    expect(r.situacao).toBe("sem_achado");
  });

  it("a visão geral cruza os módulos entregues", () => {
    const r = listarAchados("geral", {
      obras: [obra({ status: "paralisada" })],
      saude: { indicador: indicadorSaude({ estoqueMedicamentosPercentual: 10 }), unidades: [UNIDADE] },
      financeiro: { snapshot: snapshot({ saldo: -5_000 }) },
    });
    expect(new Set(r.map((a) => a.modulo))).toEqual(new Set(["obras", "saude", "financeiro"]));
  });

  it("toda afirmação carrega um número e toda ação tem destinatário", () => {
    // É o que separa esta camada de um texto genérico: o gestor precisa
    // conseguir conferir o número na fonte e saber a quem cobrar.
    const achados = listarAchados("geral", {
      saude: { indicador: indicadorSaude({ estoqueMedicamentosPercentual: 12, faltasPercentual: 40, tempoMedioAtendimentoMin: 120 }), unidades: [] },
      educacao: {
        indicador: indicadorEducacao({ frequenciaPercentual: 70, notaMedia: 3 }),
        escolas: [{ nome: "EM Castro Alves", bairro: "Alto", evasaoPercentual: 22 }],
      },
      obras: [obra({ status: "paralisada", valorContrato: 800_000 })],
      licitacoes: [licitacao({ prazoFinal: diasAtras(2), valorEstimado: 90_000 })],
      financeiro: { snapshot: snapshot({ saldo: -12_000, indiceTransparencia: 35 }) },
    });
    expect(achados.length).toBeGreaterThan(5);
    for (const a of achados) {
      expect(a.texto).toMatch(/\d/);
      expect(a.acao.length).toBeGreaterThan(0);
    }
  });

  it("textoAnalise junta o ponto e a ação, e omite a ação quando não há", () => {
    const comAcao = analisarModulo("obras", { obras: [obra({ status: "paralisada" })] });
    expect(textoAnalise(comAcao)).toContain("Ação sugerida:");

    const semAcao = analisarModulo("obras", { obras: [obra()] });
    expect(semAcao.situacao).toBe("sem_achado");
    expect(textoAnalise(semAcao)).toBe(semAcao.texto);
  });

  it("pontosDeDado lista só o que foi realmente informado", () => {
    const p = pontosDeDado("saude", {
      saude: { indicador: indicadorSaude({ medicosAtivos: 7 }), unidades: [UNIDADE] },
    });
    expect(p).toEqual(["7 médicos ativos", "1 unidade(s) cadastrada(s)"]);
  });
});
