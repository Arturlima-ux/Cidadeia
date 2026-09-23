import { describe, it, expect } from "vitest";
import {
  frequencia,
  situacaoDaFrequencia,
  faltasQueAindaCabem,
  diasSemAparecer,
  etapas,
  lerCaso,
  emAndamento,
  exigenciaBolsaFamilia,
  textoOficioConselhoTutelar,
  numeroDoOficio,
  FREQUENCIA_MINIMA_LDB,
  FREQUENCIA_BOLSA_FAMILIA,
  DIAS_PARA_CONSELHO,
  type CasoBuscaAtiva,
} from "@/lib/busca-ativa";

const HOJE = new Date("2026-09-22T12:00:00Z");
const diasAtras = (n: number) => new Date(HOJE.getTime() - n * 86_400_000).toISOString().slice(0, 10);

const base: CasoBuscaAtiva = {
  alunoNome: "Maria Souza",
  alunoTurma: "5º ano B",
  idade: 10,
  faltas: 10,
  aulasPeriodo: 100,
  periodo: "2º bimestre de 2026",
  ultimaPresenca: diasAtras(5),
  bolsaFamilia: false,
  situacao: "aberta",
  contatoFamiliaEm: null,
  visitaEm: null,
  conselhoTutelarEm: null,
  ministerioPublicoEm: null,
  createdAt: diasAtras(6),
};

describe("frequência contra o mínimo da LDB", () => {
  it("calcula o percentual de presença", () => {
    expect(frequencia(10, 100)).toBe(90);
    expect(frequencia(0, 100)).toBe(100);
    expect(frequencia(10, 0)).toBeNull();
  });

  it("nunca passa de 100% nem fica negativo quando as faltas excedem as aulas", () => {
    expect(frequencia(150, 100)).toBe(0);
  });

  it(`abaixo de ${FREQUENCIA_MINIMA_LDB}% é reprovação por falta`, () => {
    expect(situacaoDaFrequencia(26, 100)).toBe("reprovacao");
    expect(situacaoDaFrequencia(25, 100)).toBe("atencao");
    expect(situacaoDaFrequencia(10, 100)).toBe("ok");
    expect(situacaoDaFrequencia(10, 0)).toBe("sem_dado");
  });

  it("diz quantas faltas ainda cabem antes de perder o ano", () => {
    expect(faltasQueAindaCabem(10, 100)).toBe(15);
    expect(faltasQueAindaCabem(30, 100)).toBe(0);
    expect(faltasQueAindaCabem(10, 0)).toBeNull();
  });

  it("conta os dias desde a última presença", () => {
    expect(diasSemAparecer(diasAtras(12), HOJE)).toBe(12);
    expect(diasSemAparecer(null, HOJE)).toBeNull();
  });
});

describe("condicionalidade do Bolsa Família", () => {
  it("60% até os 5 anos, 75% dos 6 aos 17", () => {
    expect(exigenciaBolsaFamilia(4)).toBe(FREQUENCIA_BOLSA_FAMILIA.ate5);
    expect(exigenciaBolsaFamilia(5)).toBe(60);
    expect(exigenciaBolsaFamilia(6)).toBe(75);
    expect(exigenciaBolsaFamilia(null)).toBe(75);
  });

  it("avisa quando o benefício está em risco, e só quando está", () => {
    const emRisco = lerCaso({ ...base, bolsaFamilia: true, faltas: 40, aulasPeriodo: 100 }, HOJE);
    expect(emRisco.riscoBolsaFamilia).toMatch(/abaixo dos 75%/);

    const tranquilo = lerCaso({ ...base, bolsaFamilia: true, faltas: 10, aulasPeriodo: 100 }, HOJE);
    expect(tranquilo.riscoBolsaFamilia).toMatch(/dentro dos 75%/);

    const semBolsa = lerCaso({ ...base, faltas: 40, aulasPeriodo: 100 }, HOJE);
    expect(semBolsa.riscoBolsaFamilia).toBeNull();
  });

  it("criança de 5 anos é medida pelos 60%", () => {
    const r = lerCaso({ ...base, idade: 5, bolsaFamilia: true, faltas: 35, aulasPeriodo: 100 }, HOJE);
    expect(r.riscoBolsaFamilia).toMatch(/dentro dos 60%/);
  });
});

describe("as etapas que a lei chama de recursos escolares", () => {
  it("a primeira ação é sempre o contato com a família", () => {
    const r = lerCaso(base, HOJE);
    expect(r.etapaPendente).toBe("contato_familia");
    expect(r.proximaAcao).toMatch(/família/i);
  });

  it("cumpridas as duas primeiras, manda comunicar o Conselho Tutelar", () => {
    const r = lerCaso({ ...base, contatoFamiliaEm: diasAtras(4), visitaEm: diasAtras(2) }, HOJE);
    expect(r.etapaPendente).toBe("conselho_tutelar");
    expect(r.proximaAcao).toMatch(/art\. 56/);
  });

  it("depois de muito tempo fora e sem retorno, aponta o Ministério Público", () => {
    const r = lerCaso(
      { ...base, ultimaPresenca: diasAtras(60), contatoFamiliaEm: diasAtras(50), visitaEm: diasAtras(45), conselhoTutelarEm: diasAtras(40) },
      HOJE
    );
    expect(r.etapaPendente).toBe("ministerio_publico");
  });

  it("caso encerrado sai da fila: peso zero e nenhuma etapa pendente", () => {
    const r = lerCaso({ ...base, situacao: "retornou" }, HOJE);
    expect(r.peso).toBe(0);
    expect(r.etapaPendente).toBeNull();
    expect(emAndamento("retornou")).toBe(false);
    expect(emAndamento("conselho_tutelar")).toBe(true);
  });

  it("quem está fora há mais tempo pesa mais na fila", () => {
    const novo = lerCaso({ ...base, ultimaPresenca: diasAtras(2) }, HOJE);
    const antigo = lerCaso({ ...base, ultimaPresenca: diasAtras(40) }, HOJE);
    expect(antigo.peso).toBeGreaterThan(novo.peso);
  });

  it(`sem comunicação ao Conselho depois de ${DIAS_PARA_CONSELHO} dias, o caso sobe na fila`, () => {
    const dentro = lerCaso({ ...base, contatoFamiliaEm: diasAtras(9), visitaEm: diasAtras(8), conselhoTutelarEm: diasAtras(7), ultimaPresenca: diasAtras(10) }, HOJE);
    const atrasado = lerCaso({ ...base, contatoFamiliaEm: diasAtras(19), visitaEm: diasAtras(18), ultimaPresenca: diasAtras(20) }, HOJE);
    expect(atrasado.peso).toBeGreaterThan(dentro.peso);
  });
});

describe("o ofício ao Conselho Tutelar", () => {
  const dados = {
    caso: { ...base, contatoFamiliaEm: "2026-08-10", visitaEm: "2026-08-20" },
    escola: "Escola Municipal José Alves",
    municipio: "Bertolínia",
    estado: "PI",
    numero: "0012/2026",
  };

  it("cita a base legal e os números do caso", () => {
    const t = textoOficioConselhoTutelar(dados, HOJE);
    expect(t).toContain("art. 56, inciso II, da Lei nº 8.069/1990");
    expect(t).toContain("art. 12, inciso VIII, da Lei nº 9.394/1996");
    expect(t).toContain("Maria Souza");
    expect(t).toContain("Escola Municipal José Alves");
    expect(t).toContain("10 falta(s) em 100 aula(s)");
  });

  it("lista só as etapas com data registrada — não inventa tentativa", () => {
    const t = textoOficioConselhoTutelar(dados, HOJE);
    expect(t).toContain("Contato com a família, em 10/08/2026");
    expect(t).toContain("Visita ou convocação, em 20/08/2026");
    expect(t).not.toContain("Comunicação ao Conselho Tutelar, em");
  });

  it("sem nenhuma tentativa registrada, diz isso em vez de fingir", () => {
    const t = textoOficioConselhoTutelar({ ...dados, caso: base }, HOJE);
    expect(t).toContain("(nenhuma tentativa registrada)");
  });

  it("só menciona a frequência abaixo do mínimo quando ela está abaixo", () => {
    const abaixo = textoOficioConselhoTutelar({ ...dados, caso: { ...dados.caso, faltas: 40 } }, HOJE);
    expect(abaixo).toMatch(/abaixo do mínimo de 75%/);
  });

  it("o número do ofício é estável e traz o ano", () => {
    expect(numeroDoOficio("busca_20260922_1234", HOJE)).toBe("1234/2026");
    expect(numeroDoOficio("busca_xy", HOJE)).toBe("0000/2026");
  });

  it("as quatro etapas existem e na ordem que a lei pede", () => {
    expect(etapas(base).map((e) => e.chave)).toEqual([
      "contato_familia",
      "visita",
      "conselho_tutelar",
      "ministerio_publico",
    ]);
  });
});
