import { describe, it, expect } from "vitest";
import { aulasPerdidas, lerCalendario, custaAula, situacaoDaEscola, DIAS_LETIVOS_LDB } from "@/lib/ocorrencias-escola";
import { lerEscola, mencionaEscola, DIFERENCA_MATRICULA_RELEVANTE } from "@/lib/leitura-escola";

const HOJE = new Date("2026-09-22T12:00:00Z");
const diasAtras = (n: number) => new Date(HOJE.getTime() - n * 86_400_000).toISOString();

const escolaBase = {
  nome: "Escola Municipal José Alves",
  situacao: "ativa" as const,
  dependencia: "municipal",
  origem: "censo",
  censoAno: 2025,
  matriculasCenso: 180,
  matriculasAtuais: 180,
  diasPrevistos: 200,
};

const entradaBase = {
  escola: escolaBase,
  ocorrenciasAbertas: [],
  ocorrenciasDoAno: [],
  mencoesOuvidoria: [],
};

describe("calendário letivo", () => {
  it("só conta dia perdido de ocorrência que custa aula", () => {
    expect(custaAula("sem_professor")).toBe(true);
    expect(custaAula("falta_merenda")).toBe(false);
    expect(
      aulasPerdidas([
        { tipo: "sem_professor", aulasPerdidas: 2 },
        { tipo: "falta_merenda", aulasPerdidas: 3 },
        { tipo: "transporte", aulasPerdidas: 1 },
      ])
    ).toBe(3);
  });

  it("sem folga no calendário, qualquer dia perdido já estoura o mínimo da LDB", () => {
    expect(lerCalendario(0, DIAS_LETIVOS_LDB).situacao).toBe("atencao");
    expect(lerCalendario(1, DIAS_LETIVOS_LDB).situacao).toBe("estourado");
    expect(lerCalendario(1, DIAS_LETIVOS_LDB).folga).toBe(-1);
  });

  it("calendário com folga absorve os primeiros dias", () => {
    expect(lerCalendario(3, 210).situacao).toBe("normal");
    expect(lerCalendario(9, 210).situacao).toBe("atencao");
    expect(lerCalendario(12, 210).situacao).toBe("estourado");
  });
});

describe("situação da escola pelas ocorrências", () => {
  it("urgente parada há dois dias é urgente; recém-aberta é atenção", () => {
    expect(situacaoDaEscola([{ gravidade: "urgente", createdAt: diasAtras(3) }], HOJE)).toBe("urgente");
    expect(situacaoDaEscola([{ gravidade: "urgente", createdAt: diasAtras(0) }], HOJE)).toBe("atencao");
    expect(situacaoDaEscola([], HOJE)).toBe("normal");
  });
});

describe("leitura automática da escola", () => {
  it("escola em dia não vira alarme falso", () => {
    const r = lerEscola({ ...entradaBase, escola: { ...escolaBase, diasPrevistos: 210 } }, HOJE);
    expect(r.situacao).toBe("normal");
    expect(r.achados).toHaveLength(0);
    expect(r.resumo).toMatch(/Sem pendência/);
  });

  it("escola paralisada no Censo é o achado mais grave", () => {
    const r = lerEscola({ ...entradaBase, escola: { ...escolaBase, situacao: "paralisada" } }, HOJE);
    expect(r.situacao).toBe("urgente");
    expect(r.achados[0]!.fonte).toBe("censo");
  });

  it("aluno a mais do que o Censo declara vira aviso de FUNDEB", () => {
    const r = lerEscola(
      { ...entradaBase, escola: { ...escolaBase, matriculasAtuais: 180 + DIFERENCA_MATRICULA_RELEVANTE, diasPrevistos: 210 } },
      HOJE
    );
    const achado = r.achados.find((a) => a.fonte === "matricula");
    expect(achado?.titulo).toMatch(/a mais do que o Censo/);
    expect(achado?.detalhe).toMatch(/FUNDEB/);
  });

  it("aluno a menos vira busca ativa e risco de glosa", () => {
    const r = lerEscola({ ...entradaBase, escola: { ...escolaBase, matriculasAtuais: 170, diasPrevistos: 210 } }, HOJE);
    const achado = r.achados.find((a) => a.fonte === "matricula");
    expect(achado?.titulo).toMatch(/a menos do que o Censo/);
  });

  it("diferença pequena de matrícula não vira achado — é rotatividade normal", () => {
    const r = lerEscola({ ...entradaBase, escola: { ...escolaBase, matriculasAtuais: 182, diasPrevistos: 210 } }, HOJE);
    expect(r.achados.some((a) => a.fonte === "matricula")).toBe(false);
  });

  it("dias de aula perdidos acima da folga viram urgência de reposição", () => {
    const r = lerEscola(
      {
        ...entradaBase,
        ocorrenciasDoAno: [
          { tipo: "transporte", aulasPerdidas: 3 },
          { tipo: "estrutura", aulasPerdidas: 2 },
        ],
      },
      HOJE
    );
    const achado = r.achados.find((a) => a.fonte === "calendario");
    expect(achado?.gravidade).toBe("urgente");
    expect(achado?.titulo).toMatch(new RegExp(`${DIAS_LETIVOS_LDB} dias letivos`));
  });

  it("ordena por gravidade: a escola sem professor há dias vem antes do cadastro velho", () => {
    const r = lerEscola(
      {
        ...entradaBase,
        escola: { ...escolaBase, censoAno: 2020, diasPrevistos: 210 },
        ocorrenciasAbertas: [{ tipo: "sem_professor", gravidade: "urgente", descricao: "3º ano sem professora", aulasPerdidas: 2, createdAt: diasAtras(4) }],
      },
      HOJE
    );
    expect(r.achados[0]!.fonte).toBe("ocorrencia");
    expect(r.situacao).toBe("urgente");
    expect(r.resumo).toMatch(/Sem professor/);
  });

  it("escola cadastrada à mão avisa que não cruza com Censo, FUNDEB e IDEB", () => {
    const r = lerEscola(
      { ...entradaBase, escola: { ...escolaBase, origem: "manual", censoAno: null, matriculasCenso: null, diasPrevistos: 210 } },
      HOJE
    );
    expect(r.achados.some((a) => a.fonte === "cadastro")).toBe(true);
    expect(r.situacao).toBe("normal");
  });

  it("três manifestações do cidadão em 30 dias puxam a escola para cima", () => {
    const mencoes = [1, 2, 3].map((i) => ({ tipo: "reclamacao", assunto: `assunto ${i}`, createdAt: diasAtras(i) }));
    const r = lerEscola({ ...entradaBase, escola: { ...escolaBase, diasPrevistos: 210 }, mencoesOuvidoria: mencoes }, HOJE);
    expect(r.situacao).toBe("atencao");
    expect(r.achados[0]!.fonte).toBe("ouvidoria");
  });

  it("nenhuma meta nem valor de repasse vem escrito no código", () => {
    // Mesma disciplina da APS: número que a lei não fixa, o sistema não inventa.
    const fonte = lerEscola(entradaBase, HOJE);
    for (const a of fonte.achados) {
      expect(a.detalhe).not.toMatch(/R\$\s*\d/);
    }
  });
});

describe("a manifestação cita a escola", () => {
  it("acha pelo nome inteiro e pelo apelido sem o prefixo", () => {
    expect(mencionaEscola("A Escola Municipal José Alves está sem água", "Escola Municipal José Alves")).toBe(true);
    expect(mencionaEscola("o ônibus da jose alves não passou", "Escola Municipal José Alves")).toBe(true);
    expect(mencionaEscola("falta remédio no posto", "Escola Municipal José Alves")).toBe(false);
  });
});
