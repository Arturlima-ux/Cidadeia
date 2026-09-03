import { describe, it, expect } from "vitest";
import {
  LIMITE_PESSOAL,
  LIMITE_PRUDENCIAL,
  LIMITE_ALERTA,
  VEDACOES_PRUDENCIAL,
  BASE_LEGAL_LIMITE,
  CONSEQUENCIA_PESSOAL,
  avaliarDespesaPessoal,
  avaliarReconducao,
  type PeriodoPessoal,
} from "@/lib/despesa-pessoal";

/** Despesa que produz exatamente `p`% de uma RCL de 100 milhões. */
const RCL = 100_000_000;
const para = (p: number) => (RCL * p) / 100;

const avaliar = (percentual: number) =>
  avaliarDespesaPessoal({ rcl: RCL, despesa: para(percentual) });

function periodo(exercicio: number, mes: number, percentual: number): PeriodoPessoal {
  return { exercicio, mesReferencia: mes, rcl: RCL, despesa: para(percentual) };
}

describe("limites e base legal", () => {
  it("guarda a norma junto do número", () => {
    expect(LIMITE_PESSOAL).toBe(54);
    expect(BASE_LEGAL_LIMITE).toContain("20");
    expect(BASE_LEGAL_LIMITE).toContain("101/2000");
    expect(CONSEQUENCIA_PESSOAL).toContain("10.028/2000");
  });

  it("deriva os patamares do limite, em vez de repetir números soltos", () => {
    // Se um dia a repartição do art. 20 mudar, basta mexer em LIMITE_PESSOAL:
    // dois números decorados em lugares diferentes é como a regra fica meio
    // atualizada.
    expect(LIMITE_PRUDENCIAL).toBeCloseTo(51.3, 10);
    expect(LIMITE_ALERTA).toBeCloseTo(48.6, 10);
  });

  it("lista as cinco vedações do art. 22, parágrafo único", () => {
    expect(VEDACOES_PRUDENCIAL).toHaveLength(5);
    expect(VEDACOES_PRUDENCIAL.join(" ")).toContain("educação, saúde e segurança");
  });
});

describe("classificação", () => {
  it("trata RCL ausente como ausência de dado, não como zero", () => {
    // Devolver 0% faria a tela afirmar que a prefeitura não gasta com pessoal,
    // que é o oposto do risco real — e pintaria de verde quem não mediu nada.
    expect(avaliarDespesaPessoal({ rcl: 0, despesa: 40_000_000 })).toBeNull();
    expect(avaliarDespesaPessoal({ rcl: -1, despesa: 1 })).toBeNull();
    expect(avaliarDespesaPessoal({ rcl: Number.NaN, despesa: 1 })).toBeNull();
  });

  it("40% é confortável", () => {
    expect(avaliar(40)!.situacao).toBe("confortavel");
  });

  it("48,6% já é o patamar de alerta do Tribunal de Contas", () => {
    expect(avaliar(48.6)!.situacao).toBe("alerta");
    expect(avaliar(48.59)!.situacao).toBe("confortavel");
  });

  it("51,3% liga as vedações", () => {
    expect(avaliar(51.3)!.situacao).toBe("prudencial");
  });

  it("54% cravados ainda não é excesso", () => {
    // A LRF fala em ULTRAPASSAR o limite. Acusar quem está exatamente nele de
    // estar fora seria acusar de uma infração que não ocorreu — e essa acusação
    // tem consequência concreta: o gestor cortaria folha sem precisar.
    expect(avaliar(54)!.situacao).toBe("prudencial");
    expect(avaliar(54.01)!.situacao).toBe("excedido");
  });
});

describe("margens", () => {
  it("mede separadamente a folga até as vedações e até o limite", () => {
    // São duas perguntas diferentes e a primeira chega antes: o prefeito em 50%
    // ainda está legal, mas o que ele quer saber é quanto falta para perder a
    // caneta de nomear.
    const a = avaliar(50)!;
    expect(a.margem).toBeCloseTo(para(4), 2);
    expect(a.margemAtePrudencial).toBeCloseTo(para(1.3), 2);
    expect(a.excedente).toBe(0);
  });

  it("zera a margem e mede o excedente quando estourou", () => {
    const a = avaliar(57)!;
    expect(a.margem).toBe(0);
    expect(a.margemAtePrudencial).toBe(0);
    expect(a.excedente).toBeCloseTo(para(3), 2);
    expect(a.excedentePontos).toBeCloseTo(3, 6);
  });
});

describe("recondução do art. 23", () => {
  it("não abre prazo quando o período mais recente está dentro do limite", () => {
    expect(avaliarReconducao([periodo(2026, 4, 50)])).toBeNull();
    expect(avaliarReconducao([])).toBeNull();
  });

  it("no período do estouro ainda não cobra meta, mas anuncia a próxima", () => {
    const r = avaliarReconducao([periodo(2026, 4, 57)])!;
    expect(r.periodosDecorridos).toBe(0);
    expect(r.metaDestePeriodo).toBeNull();
    expect(r.noCronograma).toBe(true);
    // Um terço dos 3 pontos excedentes eliminado: 54 + 2 = 56.
    expect(r.metaProximoPeriodo).toBeCloseTo(56, 6);
  });

  it("cobra um terço no primeiro período seguinte", () => {
    const serie = [periodo(2026, 4, 57), periodo(2026, 8, 55.9)];
    const r = avaliarReconducao(serie)!;
    expect(r.periodosDecorridos).toBe(1);
    expect(r.metaDestePeriodo).toBeCloseTo(56, 6);
    expect(r.noCronograma).toBe(true);
    expect(r.prazoEsgotado).toBe(false);
  });

  it("acusa quem não cortou o terço exigido", () => {
    const r = avaliarReconducao([periodo(2026, 4, 57), periodo(2026, 8, 56.5)])!;
    expect(r.noCronograma).toBe(false);
  });

  it("mede o excedente em pontos percentuais, não em reais", () => {
    // Se a conta fosse em reais, uma RCL crescente "eliminaria" o excedente
    // sozinha e o sistema diria que a prefeitura cumpriu o art. 23 sem ela ter
    // cortado nada. O percentual é o que o artigo manda reduzir.
    const estouro = { exercicio: 2026, mesReferencia: 4, rcl: RCL, despesa: para(57) };
    const seguinte = {
      exercicio: 2026,
      mesReferencia: 8,
      rcl: RCL * 2,
      despesa: para(57) * 2, // dobrou tudo: continua 57%
    };
    const r = avaliarReconducao([estouro, seguinte])!;
    expect(r.percentualAtual).toBeCloseTo(57, 6);
    expect(r.noCronograma).toBe(false);
  });

  it("esgota o prazo depois de dois períodos ainda acima do teto", () => {
    const r = avaliarReconducao([
      periodo(2026, 4, 57),
      periodo(2026, 8, 56),
      periodo(2026, 12, 55),
    ])!;
    expect(r.periodosDecorridos).toBe(2);
    expect(r.metaDestePeriodo).toBe(LIMITE_PESSOAL);
    expect(r.noCronograma).toBe(false);
    expect(r.prazoEsgotado).toBe(true);
  });

  it("conta o prazo do primeiro estouro da sequência, não do último período", () => {
    // Sem isto, uma prefeitura acima do teto há um ano apareceria todo período
    // como "acabou de estourar" e nunca chegaria à sanção do § 3º.
    const r = avaliarReconducao([periodo(2026, 4, 57), periodo(2026, 8, 58)])!;
    expect(r.desde).toEqual({ exercicio: 2026, mesReferencia: 4 });
    expect(r.excedenteInicialPontos).toBeCloseTo(3, 6);
  });

  it("ignora um estouro antigo que já foi resolvido", () => {
    // Voltar para dentro do limite encerra o prazo. Se um estouro corrigido em
    // 2025 continuasse contando, o sistema aplicaria a sanção do § 3º a quem
    // fez exatamente o que a lei pediu.
    const r = avaliarReconducao([
      periodo(2025, 4, 58),
      periodo(2025, 8, 50),
      periodo(2026, 4, 55),
    ])!;
    expect(r.desde).toEqual({ exercicio: 2026, mesReferencia: 4 });
    expect(r.periodosDecorridos).toBe(0);
    expect(r.prazoEsgotado).toBe(false);
  });

  it("ordena os períodos recebidos fora de ordem", () => {
    // A consulta traz do mais recente para o mais antigo; a lógica precisa da
    // ordem cronológica. Depender da ordem de entrada seria um acoplamento
    // silencioso entre a tela e a regra.
    const r = avaliarReconducao([periodo(2026, 8, 56), periodo(2026, 4, 57)])!;
    expect(r.desde).toEqual({ exercicio: 2026, mesReferencia: 4 });
    expect(r.periodosDecorridos).toBe(1);
  });

  it("descarta períodos sem RCL informada", () => {
    const r = avaliarReconducao([
      { exercicio: 2026, mesReferencia: 4, rcl: 0, despesa: 0 },
      periodo(2026, 8, 57),
    ])!;
    expect(r.periodosDecorridos).toBe(0);
  });
});
