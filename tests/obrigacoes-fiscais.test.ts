import { describe, it, expect } from "vitest";
import {
  OBRIGACOES,
  obrigacaoPor,
  periodicidadeRgf,
  podeOptarPorSemestral,
  periodosDoExercicio,
  avaliarObrigacoes,
  montarPainelObrigacoes,
} from "@/lib/obrigacoes-fiscais";

const VAZIO = new Set<string>();

function periodo(chave: string, numero: number, exercicio = 2026) {
  return periodosDoExercicio(exercicio).find(
    (p) => p.obrigacao.chave === chave && p.numero === numero
  )!;
}

describe("catálogo de obrigações", () => {
  it("cita lei, artigo e consequência em todas", () => {
    // Sem a consequência o gestor não abre a tela: "entregar o RREO" é tarefa,
    // "travar convênio com a União" é motivo.
    for (const o of OBRIGACOES) {
      expect(o.lei, o.chave).toMatch(/Lei/);
      expect(o.artigo.length, o.chave).toBeGreaterThan(3);
      expect(o.consequencia.length, o.chave).toBeGreaterThan(30);
    }
  });

  it("separa o que conseguimos conferir do que é só lembrete", () => {
    // Só o RREO sai utilizável da API do Tesouro. O endpoint de RGF responde
    // 200 e devolve zero registro para todo município testado, então tratá-lo
    // como verificável faria a tela acusar de atraso quem cumpriu. SIOPS e
    // SIOPE não têm consulta pública equivalente.
    expect(obrigacaoPor("rreo")?.verificavel).toBe(true);
    expect(obrigacaoPor("rgf")?.verificavel).toBe(false);
    expect(obrigacaoPor("siops")?.verificavel).toBe(false);
    expect(obrigacaoPor("siope")?.verificavel).toBe(false);
  });

  it("ignora chave inexistente", () => {
    expect(obrigacaoPor("inexistente")).toBeUndefined();
  });
});

describe("periodicidade do RGF por porte", () => {
  it("permite semestral só até 50 mil habitantes", () => {
    // Art. 63, I, "b" da LRF.
    expect(podeOptarPorSemestral(8_000)).toBe(true);
    expect(podeOptarPorSemestral(50_000)).toBe(true);
    expect(podeOptarPorSemestral(50_001)).toBe(false);
    expect(podeOptarPorSemestral(null)).toBe(false);
  });

  it("não assume a opção sozinho, mesmo quando o município poderia", () => {
    // É faculdade, não automatismo — o município precisa ter optado. Assumir
    // esconderia uma entrega que talvez seja devida.
    expect(periodicidadeRgf(8_000)).toBe("quadrimestral");
    expect(periodicidadeRgf(8_000, true)).toBe("semestral");
  });

  it("nega a opção a município grande mesmo se pedida", () => {
    expect(periodicidadeRgf(120_000, true)).toBe("quadrimestral");
  });
});

describe("calendário do exercício", () => {
  it("gera seis RREO por ano", () => {
    const rreo = periodosDoExercicio(2026).filter((p) => p.obrigacao.chave === "rreo");
    expect(rreo).toHaveLength(6);
  });

  it("fecha o 1º bimestre no fim de fevereiro e vence 30 dias depois", () => {
    const b1 = periodo("rreo", 1);
    expect(b1.fimDoPeriodo).toBe("2026-02-28");
    expect(b1.vencimento).toBe("2026-03-30");
  });

  it("acerta fevereiro em ano bissexto", () => {
    // 2028 é bissexto. Somar dias fixos em vez de usar o calendário erraria a
    // data aqui — e o erro passaria despercebido até o ano virar.
    const b1 = periodosDoExercicio(2028).find(
      (p) => p.obrigacao.chave === "rreo" && p.numero === 1
    )!;
    expect(b1.fimDoPeriodo).toBe("2028-02-29");
  });

  it("empurra o último período para o ano seguinte", () => {
    // O 6º bimestre fecha em 31 de dezembro e vence em janeiro — a prefeitura
    // costuma esquecer justamente este, no meio da virada de exercício.
    const b6 = periodo("rreo", 6);
    expect(b6.fimDoPeriodo).toBe("2026-12-31");
    expect(b6.vencimento).toBe("2027-01-30");
  });

  it("dá três RGF quadrimestrais e dois semestrais", () => {
    const quadri = periodosDoExercicio(2026).filter((p) => p.obrigacao.chave === "rgf");
    const semestral = periodosDoExercicio(2026, { periodicidadeRgf: "semestral" }).filter(
      (p) => p.obrigacao.chave === "rgf"
    );
    expect(quadri).toHaveLength(3);
    expect(semestral).toHaveLength(2);
    expect(semestral[0].fimDoPeriodo).toBe("2026-06-30");
  });

  it("ordena tudo por data de vencimento", () => {
    const datas = periodosDoExercicio(2026).map((p) => p.vencimento);
    expect([...datas].sort()).toEqual(datas);
  });
});

describe("avaliação", () => {
  const emMaio = new Date("2026-05-20T12:00:00Z");

  it("não cobra período que ainda nem fechou", () => {
    // Cobrar o 6º bimestre em maio seria alarme sobre algo impossível.
    const b6 = avaliarObrigacoes([periodo("rreo", 6)], VAZIO, emMaio)[0];
    expect(b6.situacao).toBe("futura");
  });

  it("marca atraso quando o prazo passou sem entrega", () => {
    const b1 = avaliarObrigacoes([periodo("rreo", 1)], VAZIO, emMaio)[0];
    expect(b1.situacao).toBe("vencida");
    expect(b1.diasRestantes).toBeLessThan(0);
  });

  it("avisa quinze dias antes, porque fechar o relatório depende da contabilidade", () => {
    // 2º bimestre vence em 30/05; em 20/05 faltam 10 dias.
    const b2 = avaliarObrigacoes([periodo("rreo", 2)], VAZIO, emMaio)[0];
    expect(b2.diasRestantes).toBe(10);
    expect(b2.situacao).toBe("vence_breve");
  });

  it("o alerta some sozinho quando a entrega é confirmada", () => {
    // É o que separa isto de uma agenda: a confirmação do RREO vem da consulta
    // ao Tesouro, sem ninguém marcar nada na mão.
    const entregues = new Set(["rreo:1"]);
    const b1 = avaliarObrigacoes([periodo("rreo", 1)], entregues, emMaio)[0];
    expect(b1.situacao).toBe("entregue");
  });

  it("sem confirmação nenhuma, tudo que venceu conta como atraso", () => {
    // É a leitura correta: não temos como afirmar entrega que ninguém
    // confirmou, e supor o contrário esconderia o problema.
    const avaliadas = avaliarObrigacoes(periodosDoExercicio(2026), VAZIO, emMaio);
    expect(avaliadas.some((a) => a.situacao === "vencida")).toBe(true);
    expect(avaliadas.some((a) => a.situacao === "entregue")).toBe(false);
  });
});

describe("painel", () => {
  const emMaio = new Date("2026-05-20T12:00:00Z");

  it("separa atraso de aviso e aponta a próxima", () => {
    const avaliadas = avaliarObrigacoes(periodosDoExercicio(2026), new Set(["rreo:1"]), emMaio);
    const painel = montarPainelObrigacoes(avaliadas);

    expect(painel.entregues).toBe(1);
    expect(painel.vencidas.length).toBeGreaterThan(0);
    expect(painel.proxima).not.toBeNull();
    expect(painel.total).toBe(avaliadas.length);
  });

  it("com calendário vazio não inventa nada", () => {
    const painel = montarPainelObrigacoes([]);
    expect(painel.total).toBe(0);
    expect(painel.proxima).toBeNull();
    expect(painel.vencidas).toHaveLength(0);
  });
});
