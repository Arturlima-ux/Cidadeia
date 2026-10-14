import { describe, expect, it } from "vitest";
import { diasEntreDatas, frasesDoValor, montarValor, type Resolucao } from "@/lib/valor-entregue";

const HOJE = new Date("2026-10-14T12:00:00Z");
const r = (x: Partial<Resolucao>): Resolucao => ({ titulo: "x", secretaria: null, prioridade: "medio", desde: null, em: "2026-10-10 09:00:00-03", fiscal: false, ...x });
const vazio = { contratos: 0, processos: 0, unidades: 0, obras: 0, periodosFiscais: 0 };

describe("dias entre datas do banco", () => {
  it("conta dias inteiros, com o formato do Postgres", () => {
    expect(diasEntreDatas("2026-10-01 10:00:00.123456-03", "2026-10-11 09:00:00-03")).toBe(10);
  });
});

describe("o valor", () => {
  it("conta resolvidos, urgentes, média de dias e área", () => {
    const v = montarValor({
      resolucoes: [
        r({ secretaria: "obras", prioridade: "urgente", desde: "2026-10-01 10:00:00-03", em: "2026-10-05 10:00:00-03" }),
        r({ secretaria: "saude", desde: "2026-10-01 10:00:00-03", em: "2026-10-03 10:00:00-03" }),
        r({ secretaria: "obras" }),
      ],
      manifestacoes: [],
      importados: vazio,
      hoje: HOJE,
    });
    expect(v.resolvidos).toBe(3);
    expect(v.urgentesResolvidos).toBe(1);
    expect(v.mediaDias).toBe(3);
    expect(v.porArea[0]).toEqual({ area: "Obras", n: 2 });
  });

  it("separa os prazos do Tesouro avisados dos atrasos regularizados", () => {
    const v = montarValor({
      resolucoes: [
        r({ fiscal: true, titulo: "RREO do 4º bimestre de 2026 vence em 5 dias" }),
        r({ fiscal: true, titulo: "RGF do 2º quadrimestre de 2026 não consta entregue no Tesouro" }),
      ],
      manifestacoes: [],
      importados: vazio,
      hoje: HOJE,
    });
    expect(v.fiscais).toEqual({ avisadosEntregues: 1, atrasosRegularizados: 1 });
    expect(v.porArea[0].area).toBe("Tesouro");
  });

  it("ouvidoria no prazo legal", () => {
    const v = montarValor({
      resolucoes: [],
      manifestacoes: [
        { tipo: "informacao", status: "respondido", abertoEm: "2026-09-01T12:00:00Z", respondidoEm: "2026-09-10T12:00:00Z", prorrogado: false },
        { tipo: "informacao", status: "respondido", abertoEm: "2026-09-01T12:00:00Z", respondidoEm: "2026-09-30T12:00:00Z", prorrogado: false },
        { tipo: "reclamacao", status: "aberto", abertoEm: "2026-10-01T12:00:00Z", respondidoEm: null, prorrogado: false },
      ],
      importados: vazio,
      hoje: HOJE,
    });
    expect(v.ouvidoria).toEqual({ recebidas: 3, respondidas: 2, noPrazo: 1, percentualNoPrazo: 50 });
  });

  it("vazio quando não aconteceu nada", () => {
    expect(montarValor({ resolucoes: [], manifestacoes: [], importados: vazio, hoje: HOJE }).vazio).toBe(true);
  });

  it("as frases dizem 'apontado e resolvido pela equipe', nunca que o sistema resolveu", () => {
    const v = montarValor({
      resolucoes: [r({ prioridade: "urgente", desde: "2026-10-01 10:00:00-03", em: "2026-10-05 10:00:00-03" })],
      manifestacoes: [],
      importados: { ...vazio, contratos: 40, processos: 12 },
      hoje: HOJE,
    });
    const f = frasesDoValor(v);
    expect(f[0]).toBe("1 problema apontado pelo CidadeIA foi resolvido pela equipe, 1 deles urgente, em 4 dias em média depois do aviso.");
    expect(f[1]).toBe("52 registros entraram sozinhos dos portais públicos (Tesouro, CNES e PNCP), sem ninguém digitar.");
  });
});
