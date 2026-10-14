import { describe, expect, it } from "vitest";
import {
  achadosDaBuscaAtiva,
  achadosDoEstoque,
  achadosDosContratos,
  achadosDosPadroes,
  chaveDoAchado,
  emailDaVigia,
  idDoAlerta,
  planejar,
  type AchadoComId,
  type AlertaExistente,
} from "@/lib/vigia-dos-modulos";
import { detectarObrasParadas, detectarLicitacoesVencendo, type DeteccaoAutomatica } from "@/lib/deteccao-automatica";

const HOJE = new Date("2026-10-14T12:00:00Z");
const diasAtras = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

describe("a chave do achado", () => {
  it("é a mesma de um dia para o outro, mesmo com o número do título mudando", () => {
    const obra = { nome: "Creche do Centro", status: "em_andamento", progressoAtual: 40, progressoEsperado: 60 };
    const [ontem] = detectarObrasParadas([{ ...obra, atualizadoEm: diasAtras(31) }]);
    const [hoje] = detectarObrasParadas([{ ...obra, atualizadoEm: diasAtras(32) }]);
    expect(ontem.titulo).not.toBe(hoje.titulo);
    expect(chaveDoAchado(ontem)).toBe(chaveDoAchado(hoje));
    expect(idDoAlerta("pref_1", chaveDoAchado(ontem))).toBe(idDoAlerta("pref_1", chaveDoAchado(hoje)));
  });

  it("muda quando o fato muda: licitação que venceu deixa de ser 'vence'", () => {
    const base = { numero: "12/2026", objeto: "Merenda", status: "aberta" };
    const [vence] = detectarLicitacoesVencendo([{ ...base, prazoFinal: new Date(Date.now() + 2 * 86_400_000).toISOString() }]);
    const [vencida] = detectarLicitacoesVencendo([{ ...base, prazoFinal: diasAtras(2) }]);
    expect(chaveDoAchado(vence)).not.toBe(chaveDoAchado(vencida));
  });

  it("separa prefeituras: o mesmo fato em duas cidades são dois alertas", () => {
    expect(idDoAlerta("pref_1", "estoque:falta")).not.toBe(idDoAlerta("pref_2", "estoque:falta"));
    expect(idDoAlerta("pref_1", "estoque:falta").startsWith("regra:pref_1:")).toBe(true);
  });

  it("sem chave declarada, usa o título sem números", () => {
    const d = (titulo: string): DeteccaoAutomatica => ({ categoria: "prazo", prioridade: "medio", secretaria: null, titulo, descricao: "" });
    expect(chaveDoAchado(d("3 itens vencendo"))).toBe(chaveDoAchado(d("4 itens vencendo")));
  });
});

describe("contratos", () => {
  const contrato = (id: string, dias: number) => ({
    id,
    numeroContrato: id,
    objeto: "Coleta de lixo",
    fornecedorNome: "Empresa X",
    vigenciaFim: new Date(HOJE.getTime() + dias * 86_400_000).toISOString().slice(0, 10),
  });

  it("avisa o contrato sem tempo de licitar, e não o que está longe", () => {
    const achados = achadosDosContratos([contrato("1/2026", 5), contrato("2/2026", 300)], HOJE);
    expect(achados).toHaveLength(1);
    expect(achados[0].prioridade).toBe("urgente");
    expect(achados[0].secretaria).toBe("licitacoes");
  });

  it("não avisa contrato já vencido: é crônico e mora na tela", () => {
    expect(achadosDosContratos([contrato("1/2026", -10)], HOJE)).toHaveLength(0);
  });

  it("prorrogado é outro fato (a data entra na chave)", () => {
    const [a] = achadosDosContratos([contrato("1/2026", 5)], HOJE);
    const [b] = achadosDosContratos([contrato("1/2026", 6)], HOJE);
    expect(a.chave).not.toBe(b.chave);
  });

  it("limita a oito, os mais urgentes primeiro", () => {
    const muitos = Array.from({ length: 12 }, (_, i) => contrato(`${i}/2026`, 3 + i));
    expect(achadosDosContratos(muitos, HOJE)).toHaveLength(8);
  });
});

describe("padrões de licitação", () => {
  it("vira alerta médio de Licitações com o texto e a ação", () => {
    const [a] = achadosDosPadroes([{ tipo: "teto_dispensa", chave: "x", texto: "Dispensa a 98% do limite.", acao: "Confira.", peso: 1 }]);
    expect(a).toMatchObject({ prioridade: "medio", secretaria: "licitacoes", chave: "padrao:teto_dispensa:x" });
    expect(a.descricao).toBe("Dispensa a 98% do limite. Confira.");
  });
});

describe("estoque da saúde", () => {
  const linha = (item: string, saldo: number, consumo: number, unidade = "UBS Centro", atualizado = HOJE.toISOString()) => ({
    item,
    categoria: "medicamento" as const,
    saldo,
    consumoMensal: consumo,
    atualizadoEm: atualizado,
    unidadeNome: unidade,
  });

  it("agrupa a falta em um alerta urgente, e o crítico em outro", () => {
    const achados = achadosDoEstoque(
      [linha("Dipirona", 0, 100), linha("Amoxicilina", 0, 50, "UBS Norte"), linha("Insulina", 10, 300), linha("Soro", 1000, 30)],
      HOJE
    );
    expect(achados.map((a) => a.chave)).toEqual(["estoque:falta", "estoque:critico"]);
    expect(achados[0].titulo).toBe("2 itens em falta em 2 unidades de saúde");
    expect(achados[0].prioridade).toBe("urgente");
  });

  it("contagem velha e item sem consumo não acusam", () => {
    const velha = new Date(HOJE.getTime() - 40 * 86_400_000).toISOString();
    expect(achadosDoEstoque([linha("Dipirona", 0, 100, "UBS", velha), linha("Gaze", 0, 0)], HOJE)).toHaveLength(0);
  });
});

describe("busca ativa", () => {
  const caso = (dias: number, extra: Partial<{ situacao: string; conselhoTutelarEm: string | null; faltas: number; aulasPeriodo: number }> = {}) => ({
    situacao: "aberta",
    ultimaPresenca: new Date(HOJE.getTime() - dias * 86_400_000).toISOString().slice(0, 10),
    conselhoTutelarEm: null,
    faltas: 0,
    aulasPeriodo: 0,
    escolaNome: "EM Centro",
    ...extra,
  });

  it("avisa quem está 15 dias ou mais fora sem Conselho Tutelar, sem nome de aluno", () => {
    const achados = achadosDaBuscaAtiva([caso(20), caso(3), caso(30, { conselhoTutelarEm: "2026-10-01" }), caso(40, { situacao: "retornou" })], HOJE);
    expect(achados).toHaveLength(1);
    expect(achados[0].titulo).toBe("1 aluno fora da escola sem comunicação ao Conselho Tutelar");
    expect(achados[0].prioridade).toBe("urgente");
  });

  it("avisa à parte quem já reprova por falta", () => {
    const achados = achadosDaBuscaAtiva([caso(1, { faltas: 30, aulasPeriodo: 100 })], HOJE);
    expect(achados.map((a) => a.chave)).toEqual(["busca-ativa:reprovacao"]);
  });
});

describe("planejar", () => {
  const achado = (id: string, prioridade: DeteccaoAutomatica["prioridade"] = "medio"): AchadoComId => ({
    id,
    categoria: "prazo",
    prioridade,
    secretaria: null,
    titulo: id,
    descricao: "",
  });
  const existente = (id: string, x: Partial<AlertaExistente> = {}): AlertaExistente => ({
    id,
    prioridade: "medio",
    resolvido: false,
    fechadoAMaoEm: null,
    encerradoEm: null,
    ...x,
  });

  it("fato novo entra; fato que continua só atualiza, sem aviso", () => {
    const p = planejar([existente("a")], [achado("a"), achado("b")]);
    expect(p.inserir.map((x) => x.id)).toEqual(["b"]);
    expect(p.atualizar.map((x) => x.id)).toEqual(["a"]);
    expect(p.piorou).toEqual([]);
  });

  it("subiu de prioridade: avisa de novo", () => {
    const p = planejar([existente("a", { prioridade: "medio" })], [achado("a", "urgente")]);
    expect(p.piorou.map((x) => x.id)).toEqual(["a"]);
  });

  it("fato que sumiu fecha o alerta aberto", () => {
    const p = planejar([existente("a")], []);
    expect(p.encerrar).toEqual(["a"]);
  });

  it("fechado à mão com o fato de pé: a vigia respeita e não reabre", () => {
    const p = planejar([existente("a", { resolvido: true, fechadoAMaoEm: "2026-10-10" })], [achado("a")]);
    expect(p.reabrir).toEqual([]);
    expect(p.atualizar.map((x) => x.id)).toEqual(["a"]);
  });

  it("fechado à mão, o fato some: registra o sumiço, para reabrir se voltar", () => {
    const p = planejar([existente("a", { resolvido: true, fechadoAMaoEm: "2026-10-10" })], []);
    expect(p.registrarSumico).toEqual(["a"]);
    expect(p.encerrar).toEqual([]);
  });

  it("fato que sumiu e voltou reabre o alerta, como novo", () => {
    const fechadoSozinho = existente("a", { resolvido: true, encerradoEm: "2026-10-12" });
    expect(planejar([fechadoSozinho], [achado("a")]).reabrir.map((x) => x.id)).toEqual(["a"]);
    const sumiuDepoisDoManual = existente("b", { resolvido: true, fechadoAMaoEm: "2026-10-10", encerradoEm: "2026-10-12" });
    expect(planejar([sumiuDepoisDoManual], [achado("b")]).reabrir.map((x) => x.id)).toEqual(["b"]);
  });

  it("fechado sozinho e ainda ausente: nada a fazer", () => {
    const p = planejar([existente("a", { resolvido: true, encerradoEm: "2026-10-12" })], []);
    expect(p).toMatchObject({ encerrar: [], registrarSumico: [], reabrir: [] });
  });

  it("achado repetido no mesmo dia conta uma vez", () => {
    expect(planejar([], [achado("a"), achado("a")]).inserir).toHaveLength(1);
  });
});

describe("o e-mail", () => {
  const d = (prioridade: DeteccaoAutomatica["prioridade"], titulo = "Algo"): DeteccaoAutomatica => ({
    categoria: "prazo",
    prioridade,
    secretaria: "saude",
    titulo,
    descricao: "Descrição <com tag>",
  });

  it("não sai só com informação", () => {
    expect(emailDaVigia({ municipio: "Picos", novos: [d("info")], piorados: [], linkAlertas: "x" })).toBeNull();
  });

  it("conta os urgentes no assunto e escapa o texto", () => {
    const m = emailDaVigia({ municipio: "Picos", novos: [d("urgente"), d("medio")], piorados: [d("urgente", "Piorou")], linkAlertas: "https://a/b" })!;
    expect(m.assunto).toBe("Picos: 2 pontos urgentes para hoje");
    expect(m.html).toContain("&lt;com tag&gt;");
    expect(m.html).toContain("piorou desde o último aviso");
    expect(m.html).toContain("Saúde");
  });
});
