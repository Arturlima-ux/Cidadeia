import { describe, it, expect } from "vitest";
import {
  frenteDoMinimo,
  frenteDoPessoal,
  frenteDaTransparencia,
  frenteDosRelatorios,
  ordenarFrentes,
  totalQueFalta,
  vereditoGeral,
  dataBr,
  PESO_SITUACAO,
  degradarPorIdade,
  rotuloDaConsequencia,
  type Frente,
} from "@/lib/prestacao-de-contas";
import { avaliarMinimo } from "@/lib/minimos-constitucionais";
import { avaliarDespesaPessoal } from "@/lib/despesa-pessoal";

const reais = (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`;

describe("ausência de dado nunca vira conformidade", () => {
  // ── O DEFEITO QUE ESTA TELA NÃO PODE TER ──
  //
  // Uma prefeitura que não lançou nada veria tudo verde e fecharia o exercício
  // tranquila olhando uma tela nossa. É o pior resultado possível num produto
  // vendido para evitar rejeição de contas.

  it("mínimo sem base lançada é sem_dado, não cumprido", () => {
    const f = frenteDoMinimo("educacao", null, reais);
    expect(f.situacao).toBe("sem_dado");
    expect(f.falta).toBeNull();
  });

  it("pessoal sem período lançado é sem_dado", () => {
    expect(frenteDoPessoal(null, reais).situacao).toBe("sem_dado");
  });

  it("RCL zerada não vira 0% de despesa com pessoal", () => {
    // avaliarDespesaPessoal devolve null nesse caso; a frente tem que
    // respeitar isso em vez de mostrar "0% da RCL, dentro do limite".
    const f = frenteDoPessoal(avaliarDespesaPessoal({ rcl: 0, despesa: 900_000 }), reais);
    expect(f.situacao).toBe("sem_dado");
  });

  it("o relatório fiscal nunca é declarado cumprido", () => {
    // Afirmar entrega exigiria confirmação do Tesouro, e o calendário não
    // confirma nada.
    const comProximo = frenteDosRelatorios({
      vencidosSemConferencia: 0,
      proximo: { sigla: "RREO", rotulo: "5º bimestre", vencimento: "2026-11-30", consequencia: "x" },
    });
    expect(comProximo.situacao).not.toBe("cumprido");
    expect(comProximo.situacao).toBe("acompanhar");
  });

  it("prazo vencido sem conferência não é acusado de atraso", () => {
    // Dizer "em atraso" sem conferir acusaria de omissão quem publicou no dia.
    const f = frenteDosRelatorios({ vencidosSemConferencia: 3, proximo: null });
    expect(f.situacao).toBe("sem_dado");
    expect(f.veredito).not.toMatch(/atraso|atrasad/i);
    expect(f.veredito).toContain("não foi conferida");
  });
});

describe("a frente de mínimo constitucional", () => {
  const avaliacao = (base: number, aplicado: number, meses: number) =>
    avaliarMinimo({ area: "educacao", base, aplicado, mesesDecorridos: meses });

  it("cumprido quando o percentual já passou do exigido", () => {
    const f = frenteDoMinimo("educacao", avaliacao(1_000_000, 300_000, 8), reais);
    expect(f.situacao).toBe("cumprido");
    expect(f.falta).toBeNull();
    expect(f.veredito).toContain("30,00%");
  });

  it("abaixo do mínimo mostra o que falta em reais", () => {
    const f = frenteDoMinimo("educacao", avaliacao(1_000_000, 150_000, 6), reais);
    expect(f.situacao).not.toBe("cumprido");
    expect(f.falta).toBeGreaterThan(0);
    expect(f.veredito).toContain("15,00%");
  });

  it("a falta é a PROJETADA no ano, não a de hoje", () => {
    // A falta de hoje se paga com um empenho e reaparece no mês seguinte,
    // porque a base cresce junto. Quem decide precisa do número do ano.
    const a = avaliacao(1_000_000, 150_000, 6);
    expect(a.faltaProjetadaNoAno).not.toBeNull();
    expect(frenteDoMinimo("educacao", a, reais).falta).toBeCloseTo(a.faltaProjetadaNoAno!, 5);
  });

  it("sem meses para projetar, cai na falta de hoje em vez de null", () => {
    const a = avaliacao(1_000_000, 50_000, 1);
    expect(a.faltaProjetadaNoAno).toBeNull();
    expect(frenteDoMinimo("educacao", a, reais).falta).toBeCloseTo(a.faltaSobreBaseAtual, 5);
  });

  it("traz a base legal da área, não um texto genérico", () => {
    expect(frenteDoMinimo("educacao", null, reais).fundamento).toContain("212");
    expect(frenteDoMinimo("saude", null, reais).fundamento).toContain("141/2012");
    expect(frenteDoMinimo("fundeb", null, reais).fundamento).toContain("212-A");
  });

  it("o FUNDEB é uma frente própria, com o piso de 70%", () => {
    // O município pode cumprir os 25% com folga e descumprir este. É o erro
    // que passa porque o número grande está verde.
    expect(frenteDoMinimo("fundeb", null, reais).titulo).toContain("70%");
  });

  it("o esforço aparece como fator, quando há mês para acelerar", () => {
    const f = frenteDoMinimo("educacao", avaliacao(1_000_000, 150_000, 6), reais);
    expect(f.esforco).toMatch(/×/);
    expect(f.esforco).toContain("meses");
  });

  it("em dezembro não promete aceleração", () => {
    const f = frenteDoMinimo("educacao", avaliacao(1_000_000, 150_000, 12), reais);
    expect(f.esforco).toBeNull();
  });
});

describe("a frente que anda no sentido contrário", () => {
  // Nos mínimos o número precisa subir; no teto da despesa com pessoal precisa
  // descer. Na mesma lista, cada linha tem que dizer para onde.

  const pessoal = (percentual: number) =>
    avaliarDespesaPessoal({ rcl: 10_000_000, despesa: (10_000_000 * percentual) / 100 });

  it("acima de 54% é crítico, e o excedente é o que falta cortar", () => {
    const f = frenteDoPessoal(pessoal(56), reais);
    expect(f.situacao).toBe("critico");
    expect(f.falta).toBeCloseTo(200_000, 0);
  });

  it("no patamar prudencial é risco, e nomear já é ato nulo", () => {
    const f = frenteDoPessoal(pessoal(52), reais);
    expect(f.situacao).toBe("risco");
    expect(f.veredito).toMatch(/vedaç|nul/i);
    // Não falta dinheiro: ainda está dentro do teto legal.
    expect(f.falta).toBeNull();
  });

  it("na faixa de alerta é acompanhar", () => {
    expect(frenteDoPessoal(pessoal(49.5), reais).situacao).toBe("acompanhar");
  });

  it("confortável é cumprido, com a margem dita em reais", () => {
    const f = frenteDoPessoal(pessoal(40), reais);
    expect(f.situacao).toBe("cumprido");
    expect(f.veredito).toContain("margem");
  });
});

describe("a frente que não se mede em reais", () => {
  it("todas publicadas é cumprido", () => {
    const f = frenteDaTransparencia([
      { nome: "Orçamento", atendida: true },
      { nome: "Serviços", atendida: true },
    ]);
    expect(f.situacao).toBe("cumprido");
  });

  it("faltando publicação, nomeia o que falta", () => {
    const f = frenteDaTransparencia([
      { nome: "Orçamento", atendida: true },
      { nome: "Horários das secretarias", atendida: false },
    ]);
    expect(f.situacao).toBe("risco");
    expect(f.veredito).toContain("Horários das secretarias");
    expect(f.falta).toBeNull();
  });

  it("não promete sanção específica", () => {
    // O que a LAI cria é o dever de divulgar; o que o Tribunal faz com o
    // descumprimento varia por estado. Prometer multa certa venderia melhor e
    // seria falso.
    const f = frenteDaTransparencia([{ nome: "Serviços", atendida: false }]);
    expect(f.consequencia).not.toMatch(/multa de|inelegib/i);
    expect(f.fundamento).toContain("12.527");
  });

  it("lista vazia é sem_dado, não cumprido", () => {
    expect(frenteDaTransparencia([]).situacao).toBe("sem_dado");
  });
});

describe("medição velha não sustenta veredito verde", () => {
  const reais10 = (v: number) => `R$ ${v}`;
  const cumprido = frenteDoMinimo(
    "educacao",
    avaliarMinimo({ area: "educacao", base: 1_000_000, aplicado: 300_000, mesesDecorridos: 3 }),
    reais10
  );

  it("sem aviso de idade, nada muda", () => {
    expect(degradarPorIdade(cumprido, null)).toEqual(cumprido);
  });

  it("cumprido sobre dado velho vira sem_dado", () => {
    // Uma base de março continuaria dizendo "cumprido" em outubro, em verde,
    // com duas casas decimais.
    const d = degradarPorIdade(cumprido, "Última medição em março.");
    expect(d.situacao).toBe("sem_dado");
    expect(d.veredito).toContain("março");
    expect(d.veredito).toContain("não se afirma cumprimento");
  });

  it("crítico sobre dado velho continua crítico", () => {
    // Medição velha não melhora descumprimento: aplicar pouco em março não
    // deixa de ser aplicar pouco porque o dado é antigo.
    const critico = frenteDoPessoal(
      avaliarDespesaPessoal({ rcl: 10_000_000, despesa: 5_700_000 }),
      reais10
    );
    expect(critico.situacao).toBe("critico");
    const d = degradarPorIdade(critico, "Última apuração no 1º quadrimestre.");
    expect(d.situacao).toBe("critico");
    expect(d.veredito).toContain("1º quadrimestre");
  });

  it("acompanhar também perde o verde", () => {
    const a = frenteDoPessoal(avaliarDespesaPessoal({ rcl: 10_000_000, despesa: 4_950_000 }), reais10);
    expect(a.situacao).toBe("acompanhar");
    expect(degradarPorIdade(a, "velho").situacao).toBe("sem_dado");
  });

  it("não modifica a frente recebida", () => {
    const antes = cumprido.situacao;
    degradarPorIdade(cumprido, "velho");
    expect(cumprido.situacao).toBe(antes);
  });
});

describe("a ordem da lista", () => {
  const f = (chave: string, situacao: Frente["situacao"]): Frente => ({
    chave,
    titulo: chave,
    situacao,
    veredito: "",
    falta: null,
    esforco: null,
    consequencia: "",
    fundamento: "",
    destino: "/",
  });

  it("gravidade primeiro", () => {
    const ordem = ordenarFrentes([
      f("a", "cumprido"),
      f("b", "critico"),
      f("c", "acompanhar"),
      f("d", "risco"),
    ]).map((x) => x.chave);
    expect(ordem).toEqual(["b", "d", "c", "a"]);
  });

  it("sem_dado fica ACIMA de acompanhar", () => {
    // Decisão, não descuido: "não sabemos se a educação cumpre os 25%" é mais
    // urgente que "a saúde está no caminho".
    expect(PESO_SITUACAO.sem_dado).toBeLessThan(PESO_SITUACAO.acompanhar);
    const ordem = ordenarFrentes([f("a", "acompanhar"), f("b", "sem_dado")]).map((x) => x.chave);
    expect(ordem).toEqual(["b", "a"]);
  });

  it("não modifica o array recebido", () => {
    const lista = [f("a", "cumprido"), f("b", "critico")];
    ordenarFrentes(lista);
    expect(lista.map((x) => x.chave)).toEqual(["a", "b"]);
  });
});

describe("quanto dinheiro separa a prefeitura da conformidade", () => {
  const comFalta = (chave: string, situacao: Frente["situacao"], falta: number | null): Frente => ({
    chave,
    titulo: chave,
    situacao,
    veredito: "",
    falta,
    esforco: null,
    consequencia: "",
    fundamento: "",
    destino: "/",
  });

  it("soma só o que está fora de conformidade", () => {
    const t = totalQueFalta([
      comFalta("a", "critico", 100_000),
      comFalta("b", "risco", 50_000),
      comFalta("c", "cumprido", null),
    ]);
    expect(t.reais).toBe(150_000);
    expect(t.frentes).toBe(2);
  });

  it("frente sem dado não entra no total", () => {
    // Somar zero por ela produziria um total que parece completo e não é.
    const t = totalQueFalta([comFalta("a", "critico", 100_000), comFalta("b", "sem_dado", null)]);
    expect(t.reais).toBe(100_000);
    expect(t.frentes).toBe(1);
  });

  it("nada fora de conformidade dá zero em zero frentes", () => {
    expect(totalQueFalta([comFalta("a", "cumprido", null)])).toEqual({ reais: 0, frentes: 0 });
  });
});

describe("o veredito geral", () => {
  const f = (situacao: Frente["situacao"]): Frente => ({
    chave: situacao,
    titulo: "",
    situacao,
    veredito: "",
    falta: null,
    esforco: null,
    consequencia: "",
    fundamento: "",
    destino: "/",
  });

  it("reporta sempre a situação mais grave", () => {
    expect(vereditoGeral([f("cumprido"), f("critico"), f("risco")]).tom).toBe("critico");
    expect(vereditoGeral([f("cumprido"), f("risco")]).tom).toBe("risco");
  });

  it("tudo verde com uma frente sem dado NÃO é um veredito tranquilo", () => {
    // É exatamente nessa combinação que uma tela tranquiliza quem não deveria
    // estar tranquilo.
    const v = vereditoGeral([f("cumprido"), f("cumprido"), f("sem_dado")]);
    expect(v.tom).toBe("sem_dado");
    expect(v.frase).toContain("não é conformidade");
  });

  it("o sem_dado é dito mesmo quando há coisa pior", () => {
    const v = vereditoGeral([f("critico"), f("sem_dado"), f("sem_dado")]);
    expect(v.tom).toBe("critico");
    expect(v.frase).toContain("2 frentes estão sem dado");
  });

  it("concorda em número no singular", () => {
    expect(vereditoGeral([f("critico")]).frase).toContain("1 frente está");
    expect(vereditoGeral([f("critico"), f("critico")]).frase).toContain("2 frentes estão");
  });

  it("sem frente nenhuma, não inventa aprovação", () => {
    const v = vereditoGeral([]);
    expect(v.tom).toBe("sem_dado");
    expect(v.frase).toMatch(/não há dado/i);
  });

  it("tudo cumprido diz sobre o dado lançado, não em absoluto", () => {
    const v = vereditoGeral([f("cumprido"), f("cumprido")]);
    expect(v.tom).toBe("cumprido");
    expect(v.frase).toContain("lançado");
  });
});

describe("a consequência não acusa quem está em conformidade", () => {
  // ── O DEFEITO QUE SÓ APARECEU RODANDO A TELA ──
  //
  // O rótulo era "Se o exercício fechar assim:" em toda linha. Numa frente
  // CUMPRIDA isso afirmava o contrário do verdadeiro: fechar o exercício assim,
  // com os 25% aplicados, é exatamente o que EVITA a rejeição das contas.
  // Nenhum teste de unidade pegou — a frase estava no JSX.

  it("cumprido não fala de exercício fechando assim", () => {
    const r = rotuloDaConsequencia("cumprido");
    expect(r).not.toMatch(/fechar assim/);
    expect(r).toMatch(/evita/);
  });

  it("acompanhar usa o mesmo tom de cumprido", () => {
    expect(rotuloDaConsequencia("acompanhar")).toBe(rotuloDaConsequencia("cumprido"));
  });

  it("crítico fala de exercício fechando assim", () => {
    expect(rotuloDaConsequencia("critico")).toMatch(/fechar assim/);
  });

  it("risco fala de ritmo, porque ainda dá para mudar", () => {
    expect(rotuloDaConsequencia("risco")).toMatch(/ritmo/);
  });

  it("sem dado não afirma como vai fechar", () => {
    // Não se sabe. Dizer "se fechar assim" sobre frente sem dado inventaria
    // um prognóstico.
    const r = rotuloDaConsequencia("sem_dado");
    expect(r).not.toMatch(/fechar|ritmo/);
  });
});

describe("a concordância das frases contadas", () => {
  // Também só apareceu na tela: "Outras 1 ainda dão para corrigir. Outras 1
  // frente está sem dado lançado." Número certo, português errado — e numa
  // reunião de venda o português errado é o que o cliente lê primeiro.
  const f = (situacao: Frente["situacao"]): Frente => ({
    chave: `${situacao}-${Math.random()}`,
    titulo: "",
    situacao,
    veredito: "",
    falta: null,
    esforco: null,
    consequencia: "",
    fundamento: "",
    destino: "/",
  });

  it("um crítico, um risco e um sem dado sai em português", () => {
    const frase = vereditoGeral([f("critico"), f("risco"), f("sem_dado")]).frase;
    expect(frase).toContain("Outra ainda dá para corrigir.");
    expect(frase).toContain("Uma frente está sem dado lançado.");
    expect(frase).not.toMatch(/Outras 1|1 frente está sem/);
  });

  it("no plural volta a concordar no plural", () => {
    const frase = vereditoGeral([
      f("critico"),
      f("risco"),
      f("risco"),
      f("sem_dado"),
      f("sem_dado"),
    ]).frase;
    expect(frase).toContain("Outras 2 ainda dão para corrigir.");
    expect(frase).toContain("2 frentes estão sem dado lançado.");
  });

  it("nenhuma frase repete 'Outras' duas vezes", () => {
    const frase = vereditoGeral([f("critico"), f("risco"), f("sem_dado")]).frase;
    expect(frase.match(/Outra/g)?.length ?? 0).toBe(1);
  });

  it("o veredito de só sem_dado também concorda", () => {
    expect(vereditoGeral([f("cumprido"), f("sem_dado")]).frase).toContain("uma frente está sem dado");
    expect(vereditoGeral([f("cumprido"), f("sem_dado"), f("sem_dado")]).frase).toContain(
      "2 frentes estão sem dado"
    );
  });
});

describe("toda frente leva a uma tela", () => {
  // Sem destino, a lista informa e não serve.
  it("nenhuma frente nasce sem destino nem sem consequência", () => {
    const frentes = [
      frenteDoMinimo("educacao", null, reais),
      frenteDoMinimo("saude", null, reais),
      frenteDoMinimo("fundeb", null, reais),
      frenteDoPessoal(null, reais),
      frenteDaTransparencia([{ nome: "x", atendida: false }]),
      frenteDosRelatorios({ vencidosSemConferencia: 0, proximo: null }),
    ];
    for (const f of frentes) {
      expect(f.destino.startsWith("/dashboard")).toBe(true);
      expect(f.consequencia.length).toBeGreaterThan(30);
      expect(f.fundamento.length).toBeGreaterThan(10);
      expect(f.veredito.length).toBeGreaterThan(20);
    }
  });

  it("as chaves não colidem", () => {
    const chaves = [
      frenteDoMinimo("educacao", null, reais),
      frenteDoMinimo("saude", null, reais),
      frenteDoMinimo("fundeb", null, reais),
      frenteDoPessoal(null, reais),
      frenteDaTransparencia([]),
      frenteDosRelatorios({ vencidosSemConferencia: 0, proximo: null }),
    ].map((f) => f.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });
});

describe("data por extenso curto", () => {
  it("vira o formato brasileiro", () => {
    expect(dataBr("2026-11-30")).toBe("30/11/2026");
  });
});
