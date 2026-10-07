import { describe, it, expect, vi, afterEach } from "vitest";
import { ESPERAS_TESOURO_MS } from "@/lib/tesouro-http";
// Nos testes, a nova tentativa não espera.
ESPERAS_TESOURO_MS.fill(0);
import {
  extrairRgf,
  mesDeReferencia,
  periodosParaTentar,
  buscarSerieRgf,
  buscarRgfMaisRecente,
  type PeriodoRgf,
} from "@/lib/siconfi-rgf";
import {
  LIMITE_PESSOAL,
  LIMITE_PRUDENCIAL,
  LIMITE_ALERTA,
  avaliarDespesaPessoal,
} from "@/lib/despesa-pessoal";
import bruto from "./fixtures/rgf-teresina-2024-q3.json";

// Resposta REAL da API do Tesouro, gravada em arquivo. Testar contra a
// internet tornaria a suíte dependente de um serviço público sair do ar — e é
// justamente aqui, na leitura de dado oficial, que a análise precisa continuar
// verificável mesmo offline.

const PERIODO: PeriodoRgf = {
  exercicio: 2024,
  periodicidade: "Q",
  periodo: 3,
  mesReferencia: 12,
};

describe("leitura do RGF Anexo 01", () => {
  it("extrai despesa e RCL ajustada de uma resposta real", () => {
    const r = extrairRgf(bruto, PERIODO);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.dados.despesaTotal).toBeCloseTo(1_933_027_161.08, 2);
    expect(r.dados.rclAjustada).toBeCloseTo(4_261_106_390.62, 2);
    expect(r.dados.instituicao).toContain("Teresina");
  });

  it("usa a RCL AJUSTADA, e não a cheia, como denominador", () => {
    // O erro que este teste tranca: a RCL cheia dá 44,22% e a ajustada dá
    // 45,36%. Um ponto percentual inteiro, sempre para MENOS — dizendo ao
    // prefeito que ele tem folga que não tem, na direção em que o teto estoura.
    const r = extrairRgf(bruto, PERIODO);
    if (!r.ok) throw new Error("fixture deveria extrair");

    expect(r.dados.rcl).toBeGreaterThan(r.dados.rclAjustada);

    const oficial = (r.dados.despesaTotal / r.dados.rclAjustada) * 100;
    const comRclCheia = (r.dados.despesaTotal / r.dados.rcl) * 100;

    // 45,36% é o percentual que o próprio Tesouro publica no demonstrativo.
    expect(oficial).toBeCloseTo(45.36, 1);
    expect(comRclCheia).toBeLessThan(oficial);
  });

  it("confirma nossos três limites contra os que o Tesouro publica", () => {
    // Não é redundância: se um dia a repartição do art. 20 mudar por lei, o
    // Tesouro passa a publicar outro limite e este teste avisa. Sem ele,
    // continuaríamos julgando por uma régua revogada, em silêncio.
    const linha = (c: string) =>
      bruto.find((r) => r.cod_conta === c && r.coluna === "% sobre a RCL Ajustada")?.valor;

    expect(linha("LimiteMaximoDespesaComPessoalTotal")).toBe(LIMITE_PESSOAL);
    expect(linha("LimitePrudencialDespesaComPessoalTotal")).toBeCloseTo(LIMITE_PRUDENCIAL, 2);
    expect(linha("LimiteDeAlertaDespesaComPessoalTotal")).toBeCloseTo(LIMITE_ALERTA, 2);
  });

  it("lê os três limites declarados, em reais", () => {
    // O herói da home confronta a despesa declarada com o LIMITE DECLARADO
    // pela própria prefeitura, no mesmo documento. Sem estes campos saindo da
    // extração, a página teria que calcular o limite — e aí vira a nossa
    // conta contra o número dela, que é exatamente a discussão a evitar.
    const r = extrairRgf(bruto, PERIODO);
    if (!r.ok) throw new Error("fixture deveria extrair");

    const pct = (v: number) => (v / r.dados.rclAjustada) * 100;
    expect(pct(r.dados.limiteMaximo!)).toBeCloseTo(LIMITE_PESSOAL, 1);
    expect(pct(r.dados.limitePrudencial!)).toBeCloseTo(LIMITE_PRUDENCIAL, 1);
    expect(pct(r.dados.limiteAlerta!)).toBeCloseTo(LIMITE_ALERTA, 1);
  });

  it("limite ausente vira null, nunca zero", () => {
    // `limiteMaximo ?? 0` fazia um limite ausente virar R$ 0 — e R$ 0 na tela
    // afirma que o município estourou tudo. É o espelho do "0% de despesa com
    // pessoal" que a função já se preocupa em evitar algumas linhas acima.
    const semLimites = bruto.filter((l) => !String(l.cod_conta).startsWith("Limite"));
    const r = extrairRgf(semLimites, PERIODO);
    if (!r.ok) throw new Error("sem os limites, a extração ainda deve funcionar");

    expect(r.dados.limiteMaximo).toBeNull();
    expect(r.dados.limitePrudencial).toBeNull();
    expect(r.dados.limiteAlerta).toBeNull();
  });

  it("classifica o município real com o número importado", () => {
    const r = extrairRgf(bruto, PERIODO);
    if (!r.ok) throw new Error("fixture deveria extrair");

    const a = avaliarDespesaPessoal({ rcl: r.dados.rclAjustada, despesa: r.dados.despesaTotal })!;
    expect(a.percentual).toBeCloseTo(45.36, 1);
    expect(a.situacao).toBe("confortavel");
  });
});

describe("recusas", () => {
  it("período não publicado não vira zero", () => {
    const r = extrairRgf([], PERIODO);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro).toContain("ainda não tem");
  });

  it("demonstrativo enviado em branco não vira zero", () => {
    // É o caso perigoso: a estrutura vem certa e os valores vêm vazios.
    // Gravar zero faria a tela declarar 0% de despesa com pessoal — o veredito
    // mais falsamente tranquilizador que este produto pode dar.
    const emBranco = bruto.map((r) => ({ ...r, valor: 0 }));
    const r = extrairRgf(emBranco, PERIODO);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro).toContain("sem os valores");
  });
});

describe("períodos", () => {
  it("converte período em mês de fechamento da janela de doze meses", () => {
    expect(mesDeReferencia("Q", 1)).toBe(4);
    expect(mesDeReferencia("Q", 3)).toBe(12);
    expect(mesDeReferencia("S", 1)).toBe(6);
    expect(mesDeReferencia("S", 2)).toBe(12);
  });

  it("tenta do mais recente para o mais antigo", () => {
    // O gestor não sabe qual foi o último período que o Tesouro processou —
    // costuma haver semanas entre o envio e a publicação. A busca anda para
    // trás em vez de devolver "não encontrado" para período que nem venceu.
    const lista = periodosParaTentar(2026, 9);
    const chave = (p: PeriodoRgf) => p.exercicio * 100 + p.mesReferencia;

    expect(lista[0].exercicio).toBe(2026);
    for (let i = 1; i < lista.length; i++) {
      expect(chave(lista[i])).toBeLessThanOrEqual(chave(lista[i - 1]));
    }
  });

  it("cobre as duas periodicidades", () => {
    // Município abaixo de 50 mil habitantes pode publicar semestralmente, e
    // nada garante que a opção registrada no nosso cadastro seja a que ele de
    // fato usou. Tentar só uma perderia o relatório de quem escolheu a outra.
    const lista = periodosParaTentar(2026, 9);
    expect(lista.some((p) => p.periodicidade === "Q")).toBe(true);
    expect(lista.some((p) => p.periodicidade === "S")).toBe(true);
  });
});

describe("janela de busca", () => {
  it("descarta período que ainda não terminou", () => {
    // O bug que este teste tranca: em setembro de 2026 o quadrimestre que
    // fecha em dezembro não existe em lugar nenhum, e gastar as tentativas
    // nele fazia a busca não alcançar o exercício anterior. Toledo/MG
    // aparecia como "sem RGF" tendo três períodos publicados.
    const lista = periodosParaTentar(2026, 9);
    const futuros = lista.filter((p) => p.exercicio === 2026 && p.mesReferencia > 9);
    expect(futuros).toHaveLength(0);
  });

  it("alcança o exercício anterior dentro das oito primeiras tentativas", () => {
    // Prefeitura em dia com o RGF do ano passado, mas ainda sem enviar o deste,
    // precisa ser encontrada. Do contrário o botão diz "nunca publicou" para
    // quem publicou.
    const oito = periodosParaTentar(2026, 9).slice(0, 8);
    expect(oito.some((p) => p.exercicio === 2025)).toBe(true);
  });

  it("em janeiro, procura tudo no exercício anterior", () => {
    // Caso extremo real: em 1º de janeiro nenhum período do ano corrente
    // fechou, e a lista não pode vir vazia.
    const lista = periodosParaTentar(2026, 1);
    expect(lista.length).toBeGreaterThan(0);
    expect(lista.every((p) => p.exercicio === 2025)).toBe(true);
  });
});

describe("a série de períodos", () => {
  // A trajetória da despesa com pessoal precisa de VÁRIOS períodos. É a
  // diferença entre esta função e `buscarRgfMaisRecente`, que para no
  // primeiro que extrai.

  const resposta = (itens: unknown[]) =>
    Response.json({ items: itens }, { status: 200 });

  /** Monta o anexo de um período com o percentual pedido. */
  const anexo = (rcl: number, percentual: number) => [
    { cod_conta: "ReceitaCorrenteLiquidaAjustada", coluna: "Valor", valor: rcl },
    { cod_conta: "ReceitaCorrenteLiquidaLimiteLegal", coluna: "Valor", valor: rcl },
    { cod_conta: "DespesaComPessoalTotal", coluna: "Valor", valor: (rcl * percentual) / 100 },
    { cod_conta: "LimiteMaximoDespesaComPessoalTotal", coluna: "Valor", valor: rcl * 0.54 },
    { instituicao: "Prefeitura Municipal de Exemplo" },
  ];

  afterEach(() => vi.unstubAllGlobals());

  it("devolve a série em ordem cronológica", async () => {
    let n = 0;
    vi.stubGlobal("fetch", vi.fn(async () => resposta(anexo(100_000_000, 50 - n++))));

    const serie = await buscarSerieRgf("2211001", 4);
    const meses = serie.map((s) => s.periodo.exercicio * 12 + s.periodo.mesReferencia);
    expect(serie.length).toBeGreaterThan(1);
    expect(meses).toEqual([...meses].sort((a, b) => a - b));
  });

  it("não devolve período em branco", async () => {
    // Período publicado sem valores não entra na série: entraria como ponto
    // falso numa reta que decide uma data.
    let chamada = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => (chamada++ % 2 === 0 ? resposta([]) : resposta(anexo(100_000_000, 48))))
    );

    const serie = await buscarSerieRgf("2211001", 4);
    expect(serie.every((s) => s.despesaTotal > 0)).toBe(true);
  });

  it("município sem nada publicado devolve série vazia, não exceção", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resposta([])));
    await expect(buscarSerieRgf("2211001", 3)).resolves.toEqual([]);
  });
});

describe("a causa da ausência é estruturada, não uma frase", () => {
  // ── O DEFEITO QUE ISTO FECHA ──
  //
  // `buscarPeriodo` engolia qualquer falha de rede com `catch { return [] }`,
  // e timeout do Tesouro ficava indistinguível de "o período não existe". A
  // página então escrevia "Nenhum RGF deste município consta publicado no
  // Tesouro" — uma afirmação sobre a CONDUTA do cliente, numa visita em que
  // o problema era nosso. Numa página cujo argumento é precisão, é o pior
  // defeito possível.
  //
  // E a camada de texto fazia regex sobre a mensagem de erro para distinguir
  // "em branco" de "não publicado". A frase do em-branco nunca saía de
  // `buscarRgfMaisRecente`, então a prefeitura que entregou o demonstrativo
  // vazio era acusada de não ter entregado.

  const resposta = (itens: unknown[]) => Response.json({ items: itens }, { status: 200 });

  afterEach(() => vi.unstubAllGlobals());

  it("falha de rede devolve causa de consulta, não de publicação", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNRESET"); }));
    const r = await buscarRgfMaisRecente("2211001", 2026, 10);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.causa).toBe("consulta_falhou");
  });

  it("nada publicado devolve causa de publicação", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resposta([])));
    const r = await buscarRgfMaisRecente("2211001", 2026, 10);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.causa).toBe("nao_publicado");
  });

  it("publicado em branco chega como em_branco, e não como não publicado", async () => {
    // Entrega aconteceu; conteúdo, não. São coisas diferentes.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => resposta([{ cod_conta: "OutraConta", coluna: "Valor", valor: 1 }]))
    );
    const r = await buscarRgfMaisRecente("2211001", 2026, 10);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.causa).toBe("em_branco");
  });

  it("a ausência diz quantos períodos foram procurados", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resposta([])));
    const r = await buscarRgfMaisRecente("2211001", 2026, 10, 3);
    if (r.ok) return;
    expect(r.periodosProcurados).toBe(3);
  });
});

describe("o RGF simplificado (municípios pequenos)", () => {
  // ── O DEFEITO QUE ISTO FECHA ──
  //
  // Boa Esperança/ES entrega o RGF SIMPLIFICADO, como pode todo município de
  // até 50 mil habitantes (LRF, art. 63). A consulta pedia só o tipo "RGF", o
  // Tesouro respondia vazio, e a home afirmava que nenhum RGF constava
  // publicado — com o simplificado homologado e a despesa declarada em 47,58%.
  //
  // Valores reais do RGF Simplificado do 1º semestre de 2026, Anexo 01.
  const anexoReal = [
    { cod_conta: "ReceitaCorrenteLiquidaLimiteLegal", coluna: "Valor", valor: 114064203.2 },
    { cod_conta: "ReceitaCorrenteLiquidaAjustada", coluna: "Valor", valor: 107608007.7 },
    { cod_conta: "DespesaComPessoalTotal", coluna: "Valor", valor: 51198424.56 },
    { cod_conta: "LimiteMaximoDespesaComPessoalTotal", coluna: "Valor", valor: 58108324.16 },
    { cod_conta: "LimitePrudencialDespesaComPessoalTotal", coluna: "Valor", valor: 55202907.95 },
    { cod_conta: "LimiteDeAlertaDespesaComPessoalTotal", coluna: "Valor", valor: 52297491.74 },
    { cod_conta: "DespesaComPessoalTotal", coluna: "% sobre a RCL Ajustada", valor: 47.58 },
    { instituicao: "Prefeitura Municipal de Boa Esperança - ES" },
  ];

  afterEach(() => vi.unstubAllGlobals());

  it("acha o RGF quando só o simplificado foi entregue", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const q = new URL(url).searchParams;
        const tem = q.get("co_tipo_demonstrativo") === "RGF Simplificado" && q.get("in_periodicidade") === "S" && q.get("nr_periodo") === "1" && q.get("an_exercicio") === "2026";
        return Response.json({ items: tem ? anexoReal : [] });
      })
    );
    const r = await buscarRgfMaisRecente("3201001", 2026, 10);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(((r.dados.despesaTotal / r.dados.rclAjustada) * 100).toFixed(2)).toBe("47.58");
    expect(r.dados.periodo).toMatchObject({ exercicio: 2026, periodicidade: "S", periodo: 1 });
  });

  it("falha no tipo simplificado impede dizer que não foi publicado", async () => {
    // O relatório podia estar justamente no tipo cuja pergunta não chegou.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (new URL(url).searchParams.get("co_tipo_demonstrativo") === "RGF Simplificado") throw new Error("timeout");
        return Response.json({ items: [] });
      })
    );
    const r = await buscarRgfMaisRecente("3201001", 2026, 10);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.causa).toBe("consulta_falhou");
  });
});
