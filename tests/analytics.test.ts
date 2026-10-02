import { describe, it, expect } from "vitest";
import {
  identificadorDoDia,
  truncarIp,
  dispositivoDe,
  origemDe,
  montarFunil,
  maiorPerda,
  municipiosMaisConsultados,
  municipiosQueConverteram,
  ORDEM_DO_FUNIL,
  MINIMO_PARA_DIAGNOSTICO,
  type ContagemPorTipo,
} from "@/lib/analytics";

const SEGREDO = "segredo-de-teste-que-nunca-sai-do-ambiente";

describe("o identificador expira sozinho", () => {
  // ── O QUE SEPARA ISTO DE RASTREAMENTO ──
  //
  // Contar visitantes exige reconhecer que dois pedidos vieram da mesma
  // pessoa. A saída é uma impressão digital que EXPIRA: muda à meia-noite,
  // então ninguém é seguido de um dia para o outro — nem por nós.

  it("a mesma pessoa, no mesmo dia, é a mesma", () => {
    const a = identificadorDoDia("189.34.12.77", "Mozilla/5.0", "2026-10-02", SEGREDO);
    const b = identificadorDoDia("189.34.12.77", "Mozilla/5.0", "2026-10-02", SEGREDO);
    expect(a).toBe(b);
  });

  it("a mesma pessoa, no dia seguinte, é outra", () => {
    const hoje = identificadorDoDia("189.34.12.77", "Mozilla/5.0", "2026-10-02", SEGREDO);
    const amanha = identificadorDoDia("189.34.12.77", "Mozilla/5.0", "2026-10-03", SEGREDO);
    expect(hoje).not.toBe(amanha);
  });

  it("sem o segredo, o identificador é outro", () => {
    // É o segredo que torna irreversível. Hash de IP puro NÃO é anônimo:
    // IPv4 tem 4 bilhões de valores e qualquer um os percorre em minutos.
    const com = identificadorDoDia("189.34.12.77", "Mozilla/5.0", "2026-10-02", SEGREDO);
    const sem = identificadorDoDia("189.34.12.77", "Mozilla/5.0", "2026-10-02", "outro");
    expect(com).not.toBe(sem);
  });

  it("pessoas diferentes na mesma rede ainda se distinguem pelo navegador", () => {
    const a = identificadorDoDia("189.34.12.77", "Chrome", "2026-10-02", SEGREDO);
    const b = identificadorDoDia("189.34.12.77", "Firefox", "2026-10-02", SEGREDO);
    expect(a).not.toBe(b);
  });

  it("não devolve nada que pareça um IP", () => {
    const id = identificadorDoDia("189.34.12.77", "Mozilla/5.0", "2026-10-02", SEGREDO);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(id).not.toContain("189");
  });
});

describe("o IP é truncado antes de resumir", () => {
  // O último octeto identifica a MÁQUINA dentro da rede; para contar
  // visitante basta a rede. Truncar reduz o que entra no resumo mesmo que o
  // segredo vaze um dia.

  it("IPv4 perde o último octeto", () => {
    expect(truncarIp("189.34.12.77")).toBe("189.34.12.0");
    expect(truncarIp("10.0.0.255")).toBe("10.0.0.0");
  });

  it("IPv6 perde os 80 bits finais", () => {
    expect(truncarIp("2001:db8:85a3:1234:5678:8a2e:370:7334")).toBe("2001:db8:85a3:1234::");
  });

  it("duas máquinas da mesma rede contam como um visitante", () => {
    const a = identificadorDoDia("189.34.12.10", "Chrome", "2026-10-02", SEGREDO);
    const b = identificadorDoDia("189.34.12.200", "Chrome", "2026-10-02", SEGREDO);
    expect(a).toBe(b);
  });

  it("endereço estranho não quebra nem vira exceção", () => {
    expect(truncarIp("desconhecido")).toBe("desconhecido");
    expect(truncarIp("")).toBe("");
  });
});

describe("o que NÃO é guardado", () => {
  it("do navegador sobra uma de duas palavras", () => {
    // Versão de sistema e modelo de aparelho são o que torna uma impressão
    // digital única, e não servem para decisão nenhuma aqui.
    expect(dispositivoDe("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("movel");
    expect(dispositivoDe("Mozilla/5.0 (Linux; Android 14; SM-G991B) Mobile")).toBe("movel");
    expect(dispositivoDe("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("computador");
    expect(dispositivoDe("")).toBe("computador");
  });

  it("da origem sobra só o host", () => {
    // O caminho completo pode trazer busca, identificador de campanha e às
    // vezes dado de sessão de outro site.
    expect(origemDe("https://www.google.com/search?q=prefeitura+teresina")).toBe("google.com");
    expect(origemDe("https://t.co/abc123")).toBe("t.co");
    expect(origemDe(null)).toBeNull();
    expect(origemDe("não é url")).toBeNull();
  });
});

describe("o funil", () => {
  const contagens = (n: Record<string, [number, number]>): ContagemPorTipo[] =>
    Object.entries(n).map(([tipo, par]) => ({
      tipo: tipo as ContagemPorTipo["tipo"],
      eventos: par[0],
      visitantes: par[1],
    }));

  it("segue a ordem da jornada", () => {
    const f = montarFunil([]);
    expect(f.map((e) => e.chave)).toEqual(ORDEM_DO_FUNIL.map((e) => e.chave));
  });

  it("a conversão é sobre VISITANTES, não sobre eventos", () => {
    // Quem recarrega a página três vezes não é três pessoas. Contar eventos
    // faria uma etapa parecer ter mais gente que a anterior.
    const f = montarFunil(
      contagens({ visita: [900, 100], raio_x: [120, 40], demo: [25, 20] })
    );
    expect(f[1]!.conversao).toBeCloseTo(40, 5);
    expect(f[2]!.conversao).toBeCloseTo(50, 5);
  });

  it("a primeira etapa não tem conversão", () => {
    expect(montarFunil(contagens({ visita: [10, 10] }))[0]!.conversao).toBeNull();
  });

  it("etapa sem ninguém não divide por zero", () => {
    const f = montarFunil(contagens({ visita: [10, 10], raio_x: [0, 0], demo: [0, 0] }));
    expect(f[1]!.conversao).toBe(0);
    expect(f[2]!.conversao).toBe(0);
    expect(f.every((e) => Number.isFinite(e.conversao ?? 0))).toBe(true);
  });

  it("toda etapa explica o que significa", () => {
    // A tela não pode exigir que quem lê saiba o que "proposta_aberta" quer
    // dizer.
    for (const e of montarFunil([])) expect(e.significado.length).toBeGreaterThan(20);
  });
});

describe("onde o funil mais perde gente", () => {
  const base = (visitas: number) => [
    { tipo: "visita" as const, eventos: visitas * 3, visitantes: visitas },
    { tipo: "raio_x" as const, eventos: 60, visitantes: 50 },
    { tipo: "demo" as const, eventos: 10, visitantes: 5 },
    { tipo: "proposta_aberta" as const, eventos: 4, visitantes: 4 },
    { tipo: "proposta_enviada" as const, eventos: 3, visitantes: 3 },
  ];

  it("aponta a etapa de menor conversão", () => {
    // 50 → 5 é a maior queda: é ali que um ajuste rende mais.
    const f = montarFunil(base(100));
    expect(maiorPerda(f)!.chave).toBe("demo");
  });

  it("com pouca base, não diagnostica nada", () => {
    // Com cinco visitantes, "perdeu 50%" é ruído com cara de diagnóstico.
    const f = montarFunil(base(MINIMO_PARA_DIAGNOSTICO - 1));
    expect(maiorPerda(f)).toBeNull();
  });

  it("sem evento nenhum, devolve null em vez de inventar", () => {
    expect(maiorPerda(montarFunil([]))).toBeNull();
  });
});

describe("municípios mais consultados", () => {
  const ev = (municipio: string | null, uf: string | null, visitante: string, tipo = "raio_x") => ({
    tipo: tipo as "raio_x" | "visita",
    municipio,
    uf,
    visitante,
  });

  it("conta visitantes, não consultas", () => {
    const r = municipiosMaisConsultados([
      ev("Teresina", "PI", "a"),
      ev("Teresina", "PI", "a"),
      ev("Teresina", "PI", "b"),
      ev("Parnaíba", "PI", "c"),
    ]);
    expect(r[0]).toEqual({ municipio: "Teresina", uf: "PI", visitantes: 2 });
    expect(r[1]!.visitantes).toBe(1);
  });

  it("só conta consulta de Raio-X", () => {
    // Visita à home não é intenção sobre município nenhum.
    expect(municipiosMaisConsultados([ev("Teresina", "PI", "a", "visita")])).toEqual([]);
  });

  it("evento sem município não entra", () => {
    expect(municipiosMaisConsultados([ev(null, "PI", "a")])).toEqual([]);
  });

  it("municípios homônimos de estados diferentes não se misturam", () => {
    // Há muitos no Brasil, e somá-los daria um número que não existe.
    const r = municipiosMaisConsultados([ev("Bom Jesus", "PI", "a"), ev("Bom Jesus", "RS", "b")]);
    expect(r).toHaveLength(2);
  });
});

describe("o cruzamento que justifica medir no próprio banco", () => {
  // O evento de Raio-X e o de proposta enviada carregam o MESMO código IBGE.
  // Cruzá-los responde a pergunta que decide onde investir: dos municípios
  // consultados, quais viraram pedido.

  const e = (
    tipo: "raio_x" | "proposta_enviada" | "visita",
    codigoIbge: string | null,
    visitante: string,
    municipio: string | null = null,
    uf: string | null = null
  ) => ({ tipo, codigoIbge, municipio, uf, visitante });

  it("junta consulta e pedido pelo código, não pelo nome", () => {
    // O pedido manda só o código; o nome é resolvido depois. Cruzar por nome
    // perderia a conversão inteira.
    const r = municipiosQueConverteram([
      e("raio_x", "2211001", "a", "Teresina", "PI"),
      e("raio_x", "2211001", "b", "Teresina", "PI"),
      e("proposta_enviada", "2211001", "b"),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ municipio: "Teresina", uf: "PI", consultaram: 2, pediram: 1 });
  });

  it("quem pediu vem primeiro, mesmo com menos consultas", () => {
    // Ordenar só por consulta esconderia a conversão no meio dos curiosos.
    const r = municipiosQueConverteram([
      ...["a", "b", "c", "d"].map((v) => e("raio_x", "3550308", v, "São Paulo", "SP")),
      e("raio_x", "2211001", "x", "Teresina", "PI"),
      e("proposta_enviada", "2211001", "x"),
    ]);
    expect(r[0]!.municipio).toBe("Teresina");
    expect(r[1]!.consultaram).toBe(4);
  });

  it("município que só aparece no pedido não some", () => {
    // Someria justamente a conversão — o caso mais valioso da lista.
    const r = municipiosQueConverteram([e("proposta_enviada", "2211001", "a")]);
    expect(r).toHaveLength(1);
    expect(r[0]!.pediram).toBe(1);
    expect(r[0]!.municipio).toBe("2211001");
  });

  it("conta visitantes, não eventos", () => {
    const r = municipiosQueConverteram([
      e("raio_x", "2211001", "a", "Teresina", "PI"),
      e("raio_x", "2211001", "a", "Teresina", "PI"),
      e("raio_x", "2211001", "a", "Teresina", "PI"),
    ]);
    expect(r[0]!.consultaram).toBe(1);
  });

  it("evento sem código não entra, e visita não conta", () => {
    expect(municipiosQueConverteram([e("raio_x", null, "a", "Teresina", "PI")])).toEqual([]);
    expect(municipiosQueConverteram([e("visita", "2211001", "a")])).toEqual([]);
  });
});
