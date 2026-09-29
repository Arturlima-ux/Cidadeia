import { describe, it, expect } from "vitest";
import {
  montarPlano,
  itensDeContratosVencendo,
  itensDeComprasRecorrentes,
  itensDeDispensasAgrupadas,
  recuarDiasUteis,
  comecarAte,
  planoParaCsv,
  BASE_LEGAL_PCA,
  PUBLICIDADE_PCA,
} from "@/lib/pca";

const contrato = (o: Partial<Parameters<typeof itensDeContratosVencendo>[0][number]> = {}) => ({
  id: "c1",
  objeto: "Prestação de serviço de transporte escolar",
  vigenciaFim: "2027-03-31",
  valorGlobal: 480_000,
  fornecedorNome: "Transportes Silva Ltda",
  ...o,
});

const processo = (o: Partial<Parameters<typeof itensDeComprasRecorrentes>[0][number]> = {}) => ({
  numero: "DL 1/2025",
  objeto: "Aquisição de material de expediente",
  modalidade: "Dispensa",
  valorEstimado: 20_000,
  status: "homologada",
  data: "2025-03-10",
  ...o,
});

describe("o que a lei diz sobre o PCA", () => {
  it("cita o inciso certo", () => {
    expect(BASE_LEGAL_PCA).toContain("Art. 12, VII");
    expect(BASE_LEGAL_PCA).toContain("14.133");
  });

  it("não chama o plano de obrigatório", () => {
    // O inciso diz que os órgãos "PODERÃO elaborar". No texto literal é
    // faculdade. Há doutrina defendendo a obrigatoriedade pelo princípio do
    // planejamento, mas doutrina em disputa não vira afirmação de tela.
    expect(PUBLICIDADE_PCA).not.toMatch(/obrigatóri/i);
  });

  it("afirma o que de fato é obrigatório: divulgar o plano feito", () => {
    expect(PUBLICIDADE_PCA).toMatch(/divulgado/);
    expect(PUBLICIDADE_PCA).toMatch(/sítio eletrônico oficial/);
  });
});

describe("recuo em dias úteis", () => {
  it("pula o fim de semana ao recuar", () => {
    // 2026-10-05 é segunda. Recuando 1 dia útil chega na sexta 02/10.
    expect(recuarDiasUteis(new Date("2026-10-05T12:00:00Z"), 1).toISOString().slice(0, 10)).toBe(
      "2026-10-02"
    );
    // Recuando 5, chega na segunda anterior.
    expect(recuarDiasUteis(new Date("2026-10-05T12:00:00Z"), 5).toISOString().slice(0, 10)).toBe(
      "2026-09-28"
    );
  });

  it("recuar zero não move a data", () => {
    expect(recuarDiasUteis(new Date("2026-10-05T12:00:00Z"), 0).toISOString().slice(0, 10)).toBe(
      "2026-10-05"
    );
  });

  it("a data de começar usa o prazo do objeto, não um prazo fixo", () => {
    // Serviço exige 10 dias úteis (art. 55, II, a); bem exige 8 (I, a). O
    // serviço precisa começar antes.
    const servico = comecarAte("2026-12-31", "Prestação de serviço de limpeza");
    const bem = comecarAte("2026-12-31", "Aquisição de papel A4");
    expect(servico < bem).toBe(true);
  });
});

describe("contratos que vencem no ano do plano", () => {
  it("vira item com data de necessidade e data de começar", () => {
    const [item] = itensDeContratosVencendo([contrato()], 2027);
    expect(item!.origem).toBe("contrato_vencendo");
    expect(item!.precisaEstarPronta).toBe("2027-03-31");
    expect(item!.comecarAte).not.toBeNull();
    expect(item!.comecarAte! < "2027-03-31").toBe(true);
  });

  it("contrato de outro ano não entra", () => {
    expect(itensDeContratosVencendo([contrato({ vigenciaFim: "2029-03-31" })], 2027)).toHaveLength(0);
    expect(itensDeContratosVencendo([contrato({ vigenciaFim: null })], 2027)).toHaveLength(0);
  });

  it("o valor de referência diz de onde veio", () => {
    // Nunca um número inventado: o gestor precisa poder conferir e cortar.
    const [item] = itensDeContratosVencendo([contrato()], 2027);
    expect(item!.valorReferencia).toBe(480_000);
    expect(item!.fundamentoDoValor).toContain("Transportes Silva Ltda");
  });

  it("sem valor global, admite que não sabe em vez de estimar", () => {
    const [item] = itensDeContratosVencendo([contrato({ valorGlobal: null })], 2027);
    expect(item!.valorReferencia).toBeNull();
    expect(item!.fundamentoDoValor).toMatch(/não informado/);
  });

  it("a justificativa cita o prazo legal do edital", () => {
    const [item] = itensDeContratosVencendo([contrato()], 2027);
    expect(item!.justificativa).toMatch(/art\. 55/);
    expect(item!.justificativa).toMatch(/10 dias úteis/);
  });
});

describe("compras que se repetem", () => {
  const doisAnos = [
    processo({ numero: "DL 1/2024", data: "2024-03-10", valorEstimado: 18_000 }),
    processo({ numero: "DL 7/2025", data: "2025-04-02", valorEstimado: 22_000 }),
  ];

  it("objeto de dois exercícios vira sugestão para o próximo", () => {
    const [item] = itensDeComprasRecorrentes(doisAnos, 2026);
    expect(item!.origem).toBe("compra_recorrente");
    expect(item!.justificativa).toContain("2024 e 2025");
  });

  it("um exercício só não é recorrência", () => {
    expect(itensDeComprasRecorrentes([processo()], 2026)).toHaveLength(0);
  });

  it("usa o MAIOR valor já praticado, não a média", () => {
    // Planejar pela média deixa o plano curto no ano em que o preço sobe, e
    // plano curto é o que manda o gestor para a dispensa emergencial.
    const [item] = itensDeComprasRecorrentes(doisAnos, 2026);
    expect(item!.valorReferencia).toBe(22_000);
    expect(item!.fundamentoDoValor).toMatch(/Maior valor/);
  });

  it("não tem data, e por isso vai para o fim da lista", () => {
    const [item] = itensDeComprasRecorrentes(doisAnos, 2026);
    expect(item!.precisaEstarPronta).toBeNull();
    expect(item!.comecarAte).toBeNull();
  });

  it("a justificativa convida a riscar o item", () => {
    // É a inferência mais fraca das três; o texto precisa assumir isso.
    const [item] = itensDeComprasRecorrentes(doisAnos, 2026);
    expect(item!.justificativa).toMatch(/riscar/);
  });

  it("processo cancelado não conta como histórico", () => {
    const comCancelado = [doisAnos[0]!, { ...doisAnos[1]!, status: "cancelada" }];
    expect(itensDeComprasRecorrentes(comCancelado, 2026)).toHaveLength(0);
  });
});

describe("dispensas agrupadas viram uma contratação só", () => {
  const grupo = {
    termos: ["combustivel"],
    total: 90_000,
    excedeLimite: true,
    processos: [
      { numero: "DL 1", objeto: "Aquisição de combustível", valor: 30_000 },
      { numero: "DL 2", objeto: "Aquisição de combustível", valor: 30_000 },
      { numero: "DL 3", objeto: "Aquisição de combustível", valor: 30_000 },
    ],
  };

  it("grupo que excedeu o limite vira item do plano", () => {
    const [item] = itensDeDispensasAgrupadas([grupo], 2027);
    expect(item!.origem).toBe("dispensas_agrupadas");
    expect(item!.valorReferencia).toBe(90_000);
    expect(item!.justificativa).toMatch(/3 dispensas separadas/);
  });

  it("grupo dentro do limite não entra — não há o que corrigir", () => {
    expect(itensDeDispensasAgrupadas([{ ...grupo, excedeLimite: false }], 2027)).toHaveLength(0);
  });

  it("é o remédio do diagnóstico que o fracionamento deu", () => {
    // Sem esta ligação, o gestor recebe o diagnóstico e nenhum remédio.
    const [item] = itensDeDispensasAgrupadas([grupo], 2027);
    expect(item!.justificativa).toMatch(/contratação\s+única em 2027/);
  });
});

describe("o plano montado", () => {
  const contratos = [contrato({ id: "a", vigenciaFim: "2027-06-30" }), contrato({ id: "b", objeto: "Aquisição de merenda", vigenciaFim: "2027-02-15" })];
  const processos = [
    processo({ numero: "DL 1/2024", objeto: "Aquisição de material de expediente", data: "2024-03-10" }),
    processo({ numero: "DL 7/2025", objeto: "Aquisição de material de expediente", data: "2025-04-02" }),
  ];

  it("o que tem data vem antes do que é sugestão", () => {
    const plano = montarPlano(2027, contratos, processos, []);
    const comData = plano.itens.filter((i) => i.precisaEstarPronta !== null);
    const semData = plano.itens.filter((i) => i.precisaEstarPronta === null);
    expect(comData.length).toBe(2);
    expect(semData.length).toBe(1);
    // O primeiro da lista é o que vence mais cedo.
    expect(plano.itens[0]!.precisaEstarPronta).toBe("2027-02-15");
    // E toda sugestão fica depois de todo compromisso.
    const ultimoComData = plano.itens.findLastIndex((i) => i.precisaEstarPronta !== null);
    const primeiroSemData = plano.itens.findIndex((i) => i.precisaEstarPronta === null);
    expect(ultimoComData).toBeLessThan(primeiroSemData);
  });

  it("não lista a mesma necessidade duas vezes", () => {
    // Um objeto já coberto por contrato vencendo não volta como "recorrente".
    // Plano que se repete é plano que o gestor para de ler.
    const mesmoObjeto = [
      processo({ numero: "PE 1/2024", objeto: "Prestação de serviço de transporte escolar", data: "2024-01-10" }),
      processo({ numero: "PE 5/2025", objeto: "Prestação de serviço de transporte escolar", data: "2025-01-10" }),
    ];
    const plano = montarPlano(2027, [contrato()], mesmoObjeto, []);
    expect(plano.itens).toHaveLength(1);
    expect(plano.itens[0]!.origem).toBe("contrato_vencendo");
  });

  it("conta quantos itens entraram sem valor, em vez de fingir um total completo", () => {
    const plano = montarPlano(2027, [contrato({ valorGlobal: null })], [], []);
    expect(plano.semValor).toBe(1);
    expect(plano.totalReferencia).toBe(0);
  });

  it("plano vazio não é erro — é município sem histórico ainda", () => {
    const plano = montarPlano(2027, [], [], []);
    expect(plano.itens).toEqual([]);
    expect(plano.totalReferencia).toBe(0);
  });
});

/** Conta colunas de uma linha de CSV respeitando as aspas. */
function colunasDe(linha: string): number {
  let colunas = 1;
  let dentroDeAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (ch === '"') {
      // Aspas dobradas são uma aspa literal, não o fim do campo.
      if (dentroDeAspas && linha[i + 1] === '"') i++;
      else dentroDeAspas = !dentroDeAspas;
    } else if (ch === ";" && !dentroDeAspas) {
      colunas++;
    }
  }
  return colunas;
}

describe("o CSV que vai para o setor de compras", () => {
  it("traz a origem e o fundamento de cada linha", () => {
    // Um plano em que o gestor não sabe de onde saiu cada item é um plano que
    // ele assina sem ler — e é ele quem responde por ele.
    const csv = planoParaCsv(montarPlano(2027, [contrato()], [], []));
    const linhas = csv.split("\r\n");
    expect(linhas[0]).toContain("Origem");
    expect(linhas[0]).toContain("Fundamento do valor");
    expect(linhas[1]).toContain("Contrato vencendo");
    expect(linhas[1]).toContain("Transportes Silva Ltda");
  });

  it("usa vírgula decimal e ponto e vírgula, que é o que o Excel brasileiro lê", () => {
    const csv = planoParaCsv(montarPlano(2027, [contrato({ valorGlobal: 1234.5 })], [], []));
    expect(csv.split("\r\n")[1]).toContain("1234,50");
  });

  it("objeto com aspas não quebra a coluna", () => {
    const csv = planoParaCsv(
      montarPlano(2027, [contrato({ objeto: 'Aquisição de cadeiras "tipo diretor"' })], [], [])
    );
    expect(csv).toContain('""tipo diretor""');
  });

  it("objeto com quebra de linha não parte a planilha em duas", () => {
    // Os objetos do PNCP são texto livre e longo — um dos reais tem 700
    // caracteres descrevendo um veículo item por item — e vêm com quebras de
    // linha dentro. Cada linha do CSV precisa ter o mesmo número de colunas,
    // ou a conferência item a item fica impossível.
    const csv = planoParaCsv(
      montarPlano(2027, [contrato({ objeto: "Aquisição de veículo;\nmotor 1.0;\r\ncor branca" })], [], [])
    );
    const linhas = csv.split("\r\n");
    expect(linhas).toHaveLength(2);
    // Contar colunas dividindo por ";" seria ingênuo: ponto e vírgula DENTRO
    // de campo entre aspas é CSV válido e não separa nada. Foi o que a
    // primeira versão deste teste errou, acusando um defeito que não existia.
    expect(new Set(linhas.map(colunasDe)).size).toBe(1);
  });

  it("item sem valor sai com célula vazia, não com zero", () => {
    // Zero seria lido como "custa nada", que é diferente de "não sabemos".
    const csv = planoParaCsv(montarPlano(2027, [contrato({ valorGlobal: null })], [], []));
    expect(csv.split("\r\n")[1]).toContain(';"";');
  });
});
