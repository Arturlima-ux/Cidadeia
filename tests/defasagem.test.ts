import { describe, it, expect } from "vitest";
import {
  avaliarDefasagem,
  descreverDefasagem,
  nomeDoMes,
  TOLERANCIA_MINIMOS,
  TOLERANCIA_PESSOAL,
  TOLERANCIA_PESSOAL_SEMESTRAL,
} from "@/lib/defasagem";

function medir(mesReferencia: number, hojeMes: number, tolerancia = TOLERANCIA_MINIMOS) {
  return avaliarDefasagem({
    exercicio: 2026,
    mesReferencia,
    hojeExercicio: 2026,
    hojeMes,
    toleranciaMeses: tolerancia,
  });
}

describe("tolerâncias", () => {
  it("acompanha a periodicidade de cada obrigação", () => {
    // Não são números escolhidos por gosto: o RREO é bimestral, o RGF é
    // quadrimestral, e o município pequeno pode publicá-lo semestralmente.
    // Cobrar de todos o mesmo ritmo acusaria de atraso quem está em dia.
    expect(TOLERANCIA_MINIMOS).toBeLessThan(TOLERANCIA_PESSOAL);
    expect(TOLERANCIA_PESSOAL).toBeLessThan(TOLERANCIA_PESSOAL_SEMESTRAL);
  });
});

describe("estados do dado", () => {
  it("não alarma dentro do ciclo normal de fechamento", () => {
    // Dois a três meses de defasagem nos mínimos é a prefeitura funcionando:
    // o contador fecha o bimestre no mês seguinte. Alarmar aqui treinaria o
    // gestor a ignorar o aviso — e aí ele o ignora também aos sete meses.
    expect(medir(8, 8).situacao).toBe("atual");
    expect(medir(8, 10).situacao).toBe("atual");
    expect(medir(8, 11).situacao).toBe("atual");
  });

  it("marca como desatualizado passado o ciclo", () => {
    expect(medir(3, 7).situacao).toBe("desatualizado");
    expect(medir(3, 7).mesesDecorridos).toBe(4);
  });

  it("vence depois de dois ciclos sem confirmação", () => {
    expect(medir(3, 9).situacao).toBe("desatualizado");
    expect(medir(3, 10).situacao).toBe("vencido");
  });

  it("aceita a tolerância maior do município que publica RGF semestral", () => {
    // Mesmo dado, mesma data: acusado no ritmo quadrimestral, em dia no
    // semestral. É exatamente a acusação falsa que a distinção evita.
    expect(medir(2, 8, TOLERANCIA_PESSOAL).situacao).toBe("desatualizado");
    expect(medir(2, 8, TOLERANCIA_PESSOAL_SEMESTRAL).situacao).toBe("atual");
  });

  it("atravessa a virada do ano", () => {
    // Sem isto, uma base de outubro de 2025 pareceria do futuro em fevereiro
    // de 2026, e a tela voltaria a afirmar sobre ela.
    const d = avaliarDefasagem({
      exercicio: 2025,
      mesReferencia: 10,
      hojeExercicio: 2026,
      hojeMes: 2,
      toleranciaMeses: TOLERANCIA_MINIMOS,
    });
    expect(d.mesesDecorridos).toBe(4);
    expect(d.situacao).toBe("desatualizado");
  });

  it("trata referência no futuro como dado atual, não como alarme", () => {
    // Acontece de verdade: o contador lança o fechamento de dezembro ainda em
    // dezembro, ou alguém erra o seletor. Nada disso é dado velho, e um número
    // negativo de meses viraria texto sem sentido no aviso.
    const d = medir(12, 3);
    expect(d.mesesDecorridos).toBe(0);
    expect(d.situacao).toBe("atual");
  });
});

describe("aviso ao gestor", () => {
  it("cala quando o dado está em dia", () => {
    expect(descreverDefasagem(medir(8, 9), { exercicio: 2026, mesReferencia: 8 })).toBeNull();
  });

  it("diz até quando o número vale, há quanto tempo e o que fazer", () => {
    // As três coisas juntas. Um aviso que só diz "desatualizado" transfere ao
    // gestor o trabalho de descobrir o resto — e ele não vai fazer.
    const texto = descreverDefasagem(medir(3, 7), { exercicio: 2026, mesReferencia: 3 })!;
    expect(texto).toContain("março de 2026");
    expect(texto).toContain("4 meses");
    expect(texto).toContain("já não descreve a situação de hoje");
  });

  it("recusa explicitamente a conclusão quando o dado venceu", () => {
    const texto = descreverDefasagem(medir(3, 11), { exercicio: 2026, mesReferencia: 3 })!;
    expect(texto).toContain("não tem como saber");
    expect(texto).toContain("Atualize");
  });

  it("concorda em número quando faz um mês só", () => {
    const texto = descreverDefasagem(medir(3, 4, 0), { exercicio: 2026, mesReferencia: 3 })!;
    expect(texto).toContain("há um mês");
    expect(texto).not.toContain("1 meses");
  });
});

describe("nome do mês", () => {
  it("converte 1..12", () => {
    expect(nomeDoMes(1)).toBe("janeiro");
    expect(nomeDoMes(12)).toBe("dezembro");
  });

  it("não quebra com valor fora da faixa", () => {
    // A coluna é validada na entrada, mas esta função também é chamada com
    // dado antigo do banco; devolver undefined viraria "undefined de 2026"
    // impresso num telão.
    expect(nomeDoMes(0)).toBe("janeiro");
    expect(nomeDoMes(99)).toBe("dezembro");
  });
});
