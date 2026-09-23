import { describe, it, expect } from "vitest";
import {
  situacaoDoResultado,
  distanciaDaMeta,
  tendencia,
  rotuloTendencia,
  montarResultados,
  apurarFundebPorAluno,
  explicarResultado,
  indicadorPorChave,
  rotuloEtapa,
  anosDeResultado,
  DIFERENCA_RELEVANTE,
  INDICADORES_RESULTADO,
} from "@/lib/resultado-educacao";

describe("indicadores: subir nem sempre é melhorar", () => {
  it("IDEB e aprovação sobem para melhorar; distorção e abandono descem", () => {
    expect(indicadorPorChave("ideb")!.sentido).toBe("maior");
    expect(indicadorPorChave("aprovacao")!.sentido).toBe("maior");
    expect(indicadorPorChave("distorcao")!.sentido).toBe("menor");
    expect(indicadorPorChave("abandono")!.sentido).toBe("menor");
  });

  it("a meta de um indicador 'menor é melhor' é atingida ficando abaixo dela", () => {
    expect(situacaoDoResultado(4.2, 4.0, "maior")).toBe("atingido");
    expect(situacaoDoResultado(3.8, 4.0, "maior")).toBe("perto");
    expect(situacaoDoResultado(2.0, 4.0, "maior")).toBe("abaixo");

    expect(situacaoDoResultado(8, 10, "menor")).toBe("atingido");
    expect(situacaoDoResultado(10.4, 10, "menor")).toBe("perto");
    expect(situacaoDoResultado(25, 10, "menor")).toBe("abaixo");
  });

  it("sem meta informada, não inventa meta", () => {
    expect(situacaoDoResultado(4.2, null, "maior")).toBe("sem_meta");
    expect(distanciaDaMeta(4.2, null, "maior")).toBeNull();
  });

  it("a distância da meta é sempre positiva, nos dois sentidos", () => {
    expect(distanciaDaMeta(3.5, 4.0, "maior")).toBe(0.5);
    expect(distanciaDaMeta(25, 10, "menor")).toBe(15);
    expect(distanciaDaMeta(4.5, 4.0, "maior")).toBeNull();
  });

  it("a tendência respeita o sentido do indicador", () => {
    expect(tendencia(4.5, 4.0, "maior")).toBe("subiu");
    expect(tendencia(3.5, 4.0, "maior")).toBe("caiu");
    // Distorção caindo é melhora — e a função chama isso de "subiu".
    expect(tendencia(8, 12, "menor")).toBe("subiu");
    expect(tendencia(15, 12, "menor")).toBe("caiu");
    expect(tendencia(4.0, 4.0, "maior")).toBe("estavel");
    expect(tendencia(4.0, null, "maior")).toBe("sem_serie");
  });

  it("o rótulo diz melhorou/piorou, porque a seta sozinha engana", () => {
    expect(rotuloTendencia(tendencia(8, 12, "menor"), "menor")).toBe("melhorou (caiu)");
    expect(rotuloTendencia(tendencia(15, 12, "menor"), "menor")).toBe("piorou (subiu)");
    expect(rotuloTendencia(tendencia(4.5, 4.0, "maior"), "maior")).toBe("melhorou");
  });

  it("todo indicador tem escala declarada — é ela que barra um IDEB 62", () => {
    for (const i of INDICADORES_RESULTADO) {
      expect(i.maximo).toBeGreaterThan(0);
    }
    expect(indicadorPorChave("ideb")!.maximo).toBe(10);
    expect(indicadorPorChave("distorcao")!.maximo).toBe(100);
  });
});

describe("série contra o ano da divulgação anterior", () => {
  const r = (indicador: string, valor: number, meta: number | null, escolaId: string | null = "e1") => ({
    escolaId,
    etapa: "anos_iniciais",
    indicador,
    valor,
    meta,
  });

  it("casa cada linha com a do ano anterior pela escola, etapa e indicador", () => {
    const linhas = montarResultados([r("ideb", 4.6, 5.0)], [r("ideb", 4.1, 4.8)]);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]!.anterior).toBe(4.1);
    expect(linhas[0]!.tendencia).toBe("subiu");
    expect(linhas[0]!.situacao).toBe("abaixo");
  });

  it("não mistura escola com rede inteira", () => {
    const linhas = montarResultados([r("ideb", 4.6, null, null)], [r("ideb", 4.1, null, "e1")]);
    expect(linhas[0]!.anterior).toBeNull();
  });

  it("ignora indicador desconhecido em vez de quebrar a tela", () => {
    expect(montarResultados([r("inventado", 9, null)], [])).toHaveLength(0);
  });

  it("os anos oferecidos incluem o corrente e os quatro anteriores", () => {
    expect(anosDeResultado(new Date("2026-09-23T12:00:00Z"))).toEqual([2026, 2025, 2024, 2023, 2022]);
  });

  it("as etapas têm rótulo legível", () => {
    expect(rotuloEtapa("anos_iniciais")).toMatch(/1º ao 5º/);
    expect(rotuloEtapa("xpto")).toBe("xpto");
  });
});

describe("a matrícula vira reais", () => {
  const esc = (id: string, nome: string, censo: number | null, atual: number | null) => ({
    id,
    nome,
    matriculasCenso: censo,
    matriculasAtuais: atual,
  });

  it("sem valor aluno/ano, conta alunos e pede o número", () => {
    const a = apurarFundebPorAluno([esc("e1", "EM A", 100, 120)], null);
    expect(a.alunosForaDaConta).toBe(20);
    expect(a.reaisForaDaConta).toBeNull();
    expect(a.frase).toMatch(/Informe o valor aluno\/ano/);
  });

  it("com valor aluno/ano, diz quanto o município deixa na mesa", () => {
    const a = apurarFundebPorAluno([esc("e1", "EM A", 100, 120)], 7_000);
    expect(a.alunosForaDaConta).toBe(20);
    expect(a.reaisForaDaConta).toBe(140_000);
    expect(a.frase).toMatch(/sem entrar na conta do FUNDEB/);
  });

  it("declarar mais do que existe vira risco de glosa, não receita", () => {
    const a = apurarFundebPorAluno([esc("e1", "EM A", 120, 100)], 7_000);
    expect(a.alunosForaDaConta).toBe(0);
    expect(a.alunosDeclaradosAMais).toBe(20);
    expect(a.reaisEmRiscoDeGlosa).toBe(140_000);
    expect(a.frase).toMatch(/glosar/);
  });

  it("diferença pequena não conta — é rotatividade normal", () => {
    const a = apurarFundebPorAluno([esc("e1", "EM A", 100, 100 + DIFERENCA_RELEVANTE - 1)], 7_000);
    expect(a.porEscola).toHaveLength(0);
    expect(a.alunosForaDaConta).toBe(0);
  });

  it("escola sem matrícula informada fica fora da comparação", () => {
    const a = apurarFundebPorAluno([esc("e1", "EM A", 100, null), esc("e2", "EM B", 50, 70)], 7_000);
    expect(a.comparaveis).toBe(1);
    expect(a.declarados).toBe(50);
  });

  it("sem nenhuma escola comparável, diz isso em vez de mostrar zero", () => {
    const a = apurarFundebPorAluno([esc("e1", "EM A", 100, null)], 7_000);
    expect(a.frase).toMatch(/Nenhuma escola informou/);
  });

  it("ordena as escolas pela diferença, maior primeiro", () => {
    const a = apurarFundebPorAluno([esc("e1", "EM A", 100, 110), esc("e2", "EM B", 100, 140)], 7_000);
    expect(a.porEscola.map((g) => g.escolaNome)).toEqual(["EM B", "EM A"]);
  });
});

describe("o cruzamento com o dia a dia", () => {
  const linha = montarResultados(
    [{ escolaId: "e1", etapa: "anos_iniciais", indicador: "ideb", valor: 3.2, meta: 5.0 }],
    []
  )[0]!;

  it("liga a nota baixa ao que aconteceu na escola", () => {
    const f = explicarResultado(linha, {
      diasPerdidos: 12,
      casosBuscaAtiva: 5,
      alunosAbaixoDaFrequencia: 3,
      itensDeMerendaEmFalta: 2,
    });
    expect(f).toMatch(/12 dia\(s\) de aula perdidos/);
    expect(f).toMatch(/3 aluno\(s\) abaixo do mínimo/);
    expect(f).toMatch(/nada disso é pedagógico/);
  });

  it("não inventa causa quando o operacional está limpo", () => {
    expect(
      explicarResultado(linha, { diasPerdidos: 0, casosBuscaAtiva: 0, alunosAbaixoDaFrequencia: 0, itensDeMerendaEmFalta: 0 })
    ).toBeNull();
  });

  it("não explica o que não precisa de explicação: meta atingida fica quieta", () => {
    const boa = montarResultados([{ escolaId: "e1", etapa: "anos_iniciais", indicador: "ideb", valor: 5.5, meta: 5.0 }], [])[0]!;
    expect(explicarResultado(boa, { diasPerdidos: 12, casosBuscaAtiva: 5, alunosAbaixoDaFrequencia: 3, itensDeMerendaEmFalta: 2 })).toBeNull();
  });

  it("sem meta informada também fica quieta — não há do que estar abaixo", () => {
    const semMeta = montarResultados([{ escolaId: "e1", etapa: "anos_iniciais", indicador: "ideb", valor: 3.2, meta: null }], [])[0]!;
    expect(explicarResultado(semMeta, { diasPerdidos: 12, casosBuscaAtiva: 0, alunosAbaixoDaFrequencia: 0, itensDeMerendaEmFalta: 0 })).toBeNull();
  });
});
