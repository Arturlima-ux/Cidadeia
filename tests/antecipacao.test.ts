import { describe, it, expect } from "vitest";
import {
  projetarTravessia,
  antecipacaoDoPessoal,
  antecipacaoDoSaldo,
  ordenarAntecipacoes,
  emPalavras,
  comoFoiCalculado,
  mesAnoDe,
  MINIMO_LEITURAS,
  HORIZONTE_MESES,
  R2_MINIMO,
  IDADE_MAXIMA_MESES,
  type Antecipacao,
} from "@/lib/antecipacao";
import { LIMITE_ALERTA, LIMITE_PRUDENCIAL, LIMITE_PESSOAL } from "@/lib/despesa-pessoal";

const reais = (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`;

/**
 * Série mensal terminando `atrasoMeses` atrás, um ponto por mês.
 *
 * Ancorada em HOJE, não numa data fixa. Com data fixa os testes apodreciam
 * sozinhos: a série vivia no começo de 2026, a travessia caía antes de hoje, e
 * a recusa de travessia no passado derrubava vinte casos que estavam certos.
 */
function serie(valores: (number | null)[], atrasoMeses = 0) {
  const n = valores.length;
  return valores.map((valor, i) => {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - (n - 1 - i) - atrasoMeses);
    return { valor, em: d.toISOString() };
  });
}

describe("as quatro recusas", () => {
  // ── POR QUE RECUSAR IMPORTA MAIS QUE PREVER ──
  //
  // Um aviso falso queima a credibilidade de todos os avisos verdadeiros ao
  // lado dele. Silêncio é o comportamento correto de um previsor sem base.

  it("1. menos de quatro leituras não traça rota", () => {
    expect(projetarTravessia(serie([40, 44, 48]), 54, "subindo")).toBeNull();
    // Com a quarta, passa a existir.
    expect(projetarTravessia(serie([40, 44, 48, 50]), 54, "subindo")).not.toBeNull();
    expect(MINIMO_LEITURAS).toBe(4);
  });

  it("nulos não contam como leitura", () => {
    // Quatro posições, duas medidas. Contar as posições faria o mínimo ser
    // decorativo.
    expect(projetarTravessia(serie([40, null, null, 50]), 54, "subindo")).toBeNull();
  });

  it("2. reta que explica pouco da variação é nuvem, não trajetória", () => {
    // Serra: sobe, cai, sobe, cai. Termina mais alto que começou, então uma
    // reta ingênua apontaria travessia.
    const t = projetarTravessia(serie([40, 52, 41, 53, 42, 54 - 0.1]), 54, "subindo");
    expect(t).toBeNull();
    expect(R2_MINIMO).toBeGreaterThan(0);
  });

  it("3. série andando para longe do limiar não tem travessia", () => {
    expect(projetarTravessia(serie([52, 50, 48, 46]), 54, "subindo")).toBeNull();
  });

  it("série parada não divide por quase-zero", () => {
    // Sem esta recusa, ritmo perto de zero devolveria "em 4.000 meses".
    expect(projetarTravessia(serie([46, 46, 46, 46]), 54, "subindo")).toBeNull();
  });

  it("3b. quem já cruzou não é assunto de previsão", () => {
    // O presente é das regras. Prever travessia de quem já atravessou daria
    // "em 0 meses" ao lado do alerta já disparado — a mesma notícia em dois
    // tons.
    expect(projetarTravessia(serie([48, 50, 52, 55]), 54, "subindo")).toBeNull();
    expect(projetarTravessia(serie([5, 3, 1, -2]), 0, "descendo")).toBeNull();
  });

  it("limiar exatamente alcançado conta como cruzado", () => {
    expect(projetarTravessia(serie([48, 50, 52, 54]), 54, "subindo")).toBeNull();
  });

  it("4. além do horizonte, cala a boca", () => {
    // "Você estoura o teto em 2032" é aritmética sobre ruído, e desacredita o
    // resto da tela.
    const lenta = serie([40.0, 40.1, 40.2, 40.3, 40.4, 40.5]);
    expect(projetarTravessia(lenta, 54, "subindo")).toBeNull();
    expect(HORIZONTE_MESES).toBe(18);
  });

  it("dentro do horizonte, prevê", () => {
    const t = projetarTravessia(serie([40, 42, 44, 46]), 54, "subindo");
    expect(t).not.toBeNull();
    expect(t!.mesesAte).toBeLessThanOrEqual(HORIZONTE_MESES);
  });
});

describe("5. série que parou de ser alimentada não descreve trajetória", () => {
  // ── O DEFEITO QUE SÓ APARECEU RODANDO A TELA ──
  //
  // Sem esta recusa, uma série abandonada seguia prevendo — e a previsão
  // nascia com data NO PASSADO: última apuração de um ano atrás, travessia em
  // oito meses, "por volta de maio" de um mês já vencido. Um aviso sobre o
  // futuro apontando para trás prova ao gestor que a tela não sabe que dia é
  // hoje, e derruba a credibilidade dos avisos corretos ao lado.

  it("série recente prevê", () => {
    expect(projetarTravessia(serie([40, 43, 46, 49]), 54, "subindo")).not.toBeNull();
  });

  it("série velha é recusada", () => {
    expect(projetarTravessia(serie([40, 43, 46, 49], 14), 54, "subindo")).toBeNull();
    expect(IDADE_MAXIMA_MESES).toBe(10);
  });

  it("nenhuma travessia prevista cai no passado", () => {
    // O cinto, independente da idade: data de travessia é futuro, sempre.
    for (const atraso of [0, 2, 4, 6, 8, 9]) {
      const t = projetarTravessia(serie([40, 43, 46, 49], atraso), 54, "subindo");
      if (t) expect(Date.parse(t.em)).toBeGreaterThan(Date.now());
    }
  });

  it("a antecipação de pessoal respeita a idade", () => {
    expect(antecipacaoDoPessoal(serie([40, 42, 44, 46], 14))).toBeNull();
  });

  it("a antecipação de saldo respeita a idade", () => {
    expect(antecipacaoDoSaldo(serie([200_000, 150_000, 100_000, 60_000], 14), reais)).toBeNull();
  });
});

describe("o tempo anunciado conta de hoje, não do fim do quadrimestre", () => {
  // O gestor lê "em cerca de 8 meses" e conta a partir de hoje. Contando da
  // última apuração, a frase e a data divergiam em um mês — "em cerca de 8
  // meses" ao lado de uma data que caía no sétimo.

  it("com apuração atrasada, faltam menos meses do que a reta diz", () => {
    const t = projetarTravessia(serie([40, 42, 44, 46], 3), 54, "subindo")!;
    expect(t.mesesDeHoje).toBeLessThan(t.mesesAte);
    expect(t.mesesAte - t.mesesDeHoje).toBeCloseTo(3, 0);
  });

  it("com apuração de hoje, os dois coincidem", () => {
    const t = projetarTravessia(serie([40, 42, 44, 46]), 54, "subindo")!;
    expect(t.mesesDeHoje).toBeCloseTo(t.mesesAte, 1);
  });

  it("a frase e a data concordam", () => {
    const a = antecipacaoDoPessoal(serie([40, 42, 44, 46], 3))!;
    const mesesNaFrase = Number(a.quando.match(/cerca de (\d+) meses/)?.[1] ?? NaN);
    if (!Number.isNaN(mesesNaFrase)) {
      const mesesAteAData = (Date.parse(a.travessia.em) - Date.now()) / (30.44 * 86_400_000);
      expect(Math.abs(mesesNaFrase - mesesAteAData)).toBeLessThan(1);
    }
  });
});

describe("a conta parte do dado real, não da reta", () => {
  // ── O DETALHE QUE EVITA UMA CONTRADIÇÃO NA TELA ──
  //
  // Partir do valor da reta deixaria a previsão discordar do número que o
  // gestor tem na frente: "você está em 50,1%" ao lado de "faltam 2 meses para
  // 51,3%" quando a reta já passou de 51,3.

  const dados = serie([40, 44, 48, 50]);

  it("o valor atual é a última leitura, não o ajuste", () => {
    const t = projetarTravessia(dados, 54, "subindo")!;
    expect(t.valorAtual).toBe(50);
  });

  it("os meses saem do valor atual dividido pelo ritmo", () => {
    const t = projetarTravessia(dados, 54, "subindo")!;
    const esperado = (54 - t.valorAtual) / t.ritmoPorMes;
    expect(t.mesesAte).toBeCloseTo(Math.round(esperado * 10) / 10, 5);
  });

  it("a data da travessia fica depois da última leitura", () => {
    const t = projetarTravessia(dados, 54, "subindo")!;
    expect(Date.parse(t.em)).toBeGreaterThan(Date.parse(t.atualEm));
  });

  it("série fora de ordem dá o mesmo resultado", () => {
    // A ordem do banco varia por consulta, e uma série invertida produziria
    // ritmo com o sinal trocado — um aviso dizendo o contrário da realidade.
    const invertida = [...dados].reverse();
    const a = projetarTravessia(dados, 54, "subindo")!;
    const b = projetarTravessia(invertida, 54, "subindo")!;
    expect(b.ritmoPorMes).toBeCloseTo(a.ritmoPorMes, 6);
    expect(b.mesesAte).toBeCloseTo(a.mesesAte, 6);
  });

  it("o ritmo preserva o sinal da direção", () => {
    expect(projetarTravessia(dados, 54, "subindo")!.ritmoPorMes).toBeGreaterThan(0);
    const caindo = projetarTravessia(serie([80_000, 50_000, 20_000, 8_000]), 0, "descendo")!;
    expect(caindo.ritmoPorMes).toBeLessThan(0);
  });

  it("série perfeitamente linear tem reta que explica tudo", () => {
    const t = projetarTravessia(serie([40, 43, 46, 49]), 54, "subindo")!;
    expect(t.r2).toBeGreaterThanOrEqual(0.99);
  });
});

describe("a confiança cresce com histórico, não com otimismo", () => {
  it("quatro leituras perfeitas ainda são confiança baixa", () => {
    // Quatro pontos alinhados podem ser coincidência de um ano atípico.
    expect(projetarTravessia(serie([40, 43, 46, 49]), 54, "subindo")!.confianca).toBe("baixa");
  });

  it("seis leituras alinhadas chegam a média", () => {
    const t = projetarTravessia(serie([40, 41.5, 43, 44.5, 46, 47.5]), 54, "subindo")!;
    expect(t.confianca).toBe("média");
  });

  it("oito leituras alinhadas chegam a alta", () => {
    const t = projetarTravessia(
      serie([40, 41, 42, 43, 44, 45, 46, 47]),
      54,
      "subindo"
    )!;
    expect(t.confianca).toBe("alta");
  });

  it("a ressalva aparece no texto quando a base é curta", () => {
    const curta = projetarTravessia(serie([40, 43, 46, 49]), 54, "subindo")!;
    expect(comoFoiCalculado(curta, "pontos")).toMatch(/ordem de grandeza/);
    const longa = projetarTravessia(serie([40, 41, 42, 43, 44, 45, 46, 47]), 54, "subindo")!;
    expect(comoFoiCalculado(longa, "pontos")).not.toMatch(/ordem de grandeza/);
  });

  it("o texto do método sempre diz quantas apurações e quanto da variação", () => {
    const t = projetarTravessia(serie([40, 43, 46, 49]), 54, "subindo")!;
    const texto = comoFoiCalculado(t, "pontos");
    expect(texto).toContain("4 apurações");
    expect(texto).toMatch(/\d+% da variação/);
    expect(texto).toContain("subindo");
  });
});

describe("o tempo em palavras não finge precisão", () => {
  // "Em 4,7 meses" é falsa precisão, e é ela que faz o gestor descobrir que a
  // previsão errou e parar de acreditar nas outras.
  it("nunca devolve casa decimal", () => {
    for (const m of [1, 2.4, 3.6, 5.2, 9.9, 13, 17.8]) {
      expect(emPalavras(m)).not.toMatch(/,\d/);
    }
  });

  it("muito perto é a próxima apuração", () => {
    expect(emPalavras(0.4)).toContain("próxima apuração");
    expect(emPalavras(1.2)).toContain("próxima apuração");
  });

  it("arredonda para meses, e acima de um ano fala em anos", () => {
    expect(emPalavras(5.2)).toBe("em cerca de 5 meses");
    expect(emPalavras(13)).toBe("em cerca de um ano");
    expect(emPalavras(22)).toBe("em cerca de dois anos");
  });

  it("o mês e o ano saem por extenso", () => {
    expect(mesAnoDe("2027-03-10T12:00:00.000Z")).toContain("março");
    expect(mesAnoDe("2027-03-10T12:00:00.000Z")).toContain("2027");
  });

  it("data inválida não vira exceção nem mês errado", () => {
    expect(mesAnoDe("isto não é data")).toBe("data indefinida");
  });
});

describe("a despesa com pessoal: a próxima porta, não o mapa do corredor", () => {
  it("em 40% e subindo, a porta é a faixa de alerta", () => {
    // Um prefeito avisado só do teto de 54% descobre as vedações ao assinar a
    // nomeação que já não podia assinar.
    const a = antecipacaoDoPessoal(serie([40, 42, 44, 46]))!;
    expect(a.travessia.limiar).toBe(LIMITE_ALERTA);
    expect(a.titulo).toContain("alerta");
  });

  it("já passado do alerta, a porta é o prudencial", () => {
    const a = antecipacaoDoPessoal(serie([48.8, 49.3, 49.8, 50.3]))!;
    expect(a.travessia.limiar).toBeCloseTo(LIMITE_PRUDENCIAL, 5);
    expect(a.oQue).toMatch(/atos nulos/);
  });

  it("já passado do prudencial, a porta é o teto, e é urgente", () => {
    const a = antecipacaoDoPessoal(serie([51.5, 52, 52.5, 53]))!;
    expect(a.travessia.limiar).toBe(LIMITE_PESSOAL);
    expect(a.prioridade).toBe("urgente");
  });

  it("devolve UMA antecipação, não três cenários", () => {
    const a = antecipacaoDoPessoal(serie([40, 42, 44, 46]));
    expect(a).not.toBeNull();
    expect(Array.isArray(a)).toBe(false);
  });

  it("a faixa de alerta sobe de tom quando está perto", () => {
    // A fronteira é leve, mas a quatro meses já muda o que se decide agora.
    const longe = antecipacaoDoPessoal(serie([40, 41, 42, 43]))!;
    const perto = antecipacaoDoPessoal(serie([45, 46, 47, 48]))!;
    expect(longe.prioridade).toBe("info");
    expect(perto.travessia.mesesAte).toBeLessThanOrEqual(4);
    expect(perto.prioridade).toBe("medio");
  });

  it("traz a base legal, a ação e o método", () => {
    const a = antecipacaoDoPessoal(serie([40, 42, 44, 46]))!;
    expect(a.fundamento).toContain("101/2000");
    expect(a.acao.length).toBeGreaterThan(40);
    expect(a.base).toContain("apurações");
    expect(a.destino).toBe("/dashboard/pessoal");
  });

  it("sem trajetória, não inventa antecipação", () => {
    expect(antecipacaoDoPessoal(serie([46, 46, 46, 46]))).toBeNull();
    expect(antecipacaoDoPessoal(serie([50, 48, 46, 44]))).toBeNull();
    expect(antecipacaoDoPessoal(serie([40, 42]))).toBeNull();
  });
});

describe("o saldo, antes de ficar negativo", () => {
  // O detector de saldo negativo dispara com o saldo JÁ negativo, quando a
  // folha do mês está comprometida. A mesma série responde antes.
  it("prevê a travessia do zero", () => {
    const a = antecipacaoDoSaldo(serie([200_000, 150_000, 100_000, 60_000]), reais)!;
    expect(a.travessia.limiar).toBe(0);
    expect(a.oQue).toMatch(/caindo/);
    expect(a.quando).toMatch(/próxima apuração|cerca de/);
  });

  it("perto do zero é urgente", () => {
    const a = antecipacaoDoSaldo(serie([200_000, 140_000, 80_000, 30_000]), reais)!;
    expect(a.travessia.mesesAte).toBeLessThanOrEqual(3);
    expect(a.prioridade).toBe("urgente");
  });

  it("saldo já negativo não vira previsão", () => {
    expect(antecipacaoDoSaldo(serie([100_000, 50_000, 10_000, -20_000]), reais)).toBeNull();
  });

  it("saldo subindo não vira previsão", () => {
    expect(antecipacaoDoSaldo(serie([10_000, 40_000, 80_000, 120_000]), reais)).toBeNull();
  });

  it("o valor em reais é formatado por quem chama", () => {
    const a = antecipacaoDoSaldo(serie([200_000, 150_000, 100_000, 60_000]), (v) => `[${v}]`)!;
    expect(a.oQue).toContain("[60000]");
  });
});

describe("a ordem é pelo tempo, não pela gravidade", () => {
  // Ao contrário de tudo o mais no produto. Entre duas coisas que ainda não
  // aconteceram, manda a que chega antes: uma fronteira grave a dezoito meses
  // não disputa atenção com uma leve no mês que vem.
  const a = (chave: string, mesesAte: number, prioridade: Antecipacao["prioridade"]): Antecipacao => ({
    chave,
    titulo: "",
    oQue: "",
    quando: "",
    base: "",
    acao: "",
    fundamento: null,
    prioridade,
    destino: "/",
    travessia: {
      mesesAte,
      mesesDeHoje: mesesAte,
      em: "2027-01-01T00:00:00.000Z",
      ritmoPorMes: 1,
      valorAtual: 0,
      atualEm: "2026-01-01T00:00:00.000Z",
      limiar: 1,
      r2: 1,
      leituras: 4,
      confianca: "alta",
    },
  });

  it("o mais próximo vem primeiro, mesmo sendo menos grave", () => {
    const ordem = ordenarAntecipacoes([a("longe", 18, "urgente"), a("perto", 1, "info")]).map(
      (x) => x.chave
    );
    expect(ordem).toEqual(["perto", "longe"]);
  });

  it("empate no tempo desempata pela gravidade", () => {
    const ordem = ordenarAntecipacoes([a("leve", 5, "info"), a("grave", 5, "urgente")]).map(
      (x) => x.chave
    );
    expect(ordem).toEqual(["grave", "leve"]);
  });

  it("não modifica a lista recebida", () => {
    const lista = [a("longe", 18, "urgente"), a("perto", 1, "info")];
    ordenarAntecipacoes(lista);
    expect(lista.map((x) => x.chave)).toEqual(["longe", "perto"]);
  });
});
