import { describe, it, expect } from "vitest";
import {
  extrairRgf,
  mesDeReferencia,
  periodosParaTentar,
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
