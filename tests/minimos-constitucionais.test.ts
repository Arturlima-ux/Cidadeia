import { describe, it, expect } from "vitest";
import {
  MINIMOS,
  AREAS_MINIMO,
  CONSEQUENCIA_LEGAL,
  avaliarMinimo,
  resumirAvaliacao,
  type AreaMinimo,
} from "@/lib/minimos-constitucionais";

const reais = (v: number) => `R$ ${v.toFixed(2)}`;

function avaliar(area: AreaMinimo, base: number, aplicado: number, meses: number) {
  return avaliarMinimo({ area, base, aplicado, mesesDecorridos: meses });
}

describe("percentuais e base legal", () => {
  it("guarda a norma junto do número", () => {
    // O percentual sozinho não serve: a prefeitura cita a norma no processo, e
    // nós precisamos saber o que reler se a regra mudar.
    expect(MINIMOS.educacao.percentual).toBe(25);
    expect(MINIMOS.educacao.base).toContain("212");
    expect(MINIMOS.saude.percentual).toBe(15);
    expect(MINIMOS.saude.base).toContain("141/2012");
    expect(MINIMOS.fundeb.percentual).toBe(70);
    expect(MINIMOS.fundeb.base).toContain("212-A");
    expect(MINIMOS.fundeb.base).toContain("14.113/2020");
    expect(CONSEQUENCIA_LEGAL).toContain("64/1990");
  });

  it("cobre exatamente os pisos que a Constituição cria, e nenhum a mais", () => {
    // Obras, gestão e assistência não entram porque não existe percentual
    // obrigatório para elas — inventar um cobraria da prefeitura uma regra que
    // a lei não impõe. O FUNDEB entra porque é piso de verdade, ainda que
    // dentro da educação: dá para cumprir os 25% do art. 212 com folga e
    // descumprir os 70% do art. 212-A no mesmo exercício.
    expect([...AREAS_MINIMO].sort()).toEqual(["educacao", "fundeb", "saude"]);
  });
});

describe("avaliação", () => {
  it("reconhece o mínimo atingido", () => {
    const r = avaliar("educacao", 1_000_000, 260_000, 8);
    expect(r.percentualAtual).toBeCloseTo(26);
    expect(r.situacao).toBe("cumprido");
    expect(r.faltaSobreBaseAtual).toBe(0);
  });

  it("diz quantos reais faltam sobre a base de hoje", () => {
    // 25% de 1 milhão são 250 mil; aplicados 200 mil, faltam 50 mil.
    const r = avaliar("educacao", 1_000_000, 200_000, 6);
    expect(r.faltaSobreBaseAtual).toBeCloseTo(50_000);
  });

  it("projeta o que falta até dezembro, e não só até hoje", () => {
    // Com 6 meses, a base do ano projeta para 2 milhões: o mínimo vira 500 mil
    // e o aplicado projeta para 400 mil — faltam 100 mil, o dobro do buraco de
    // hoje. É esse número que o prefeito precisa ver para empenhar a tempo.
    const r = avaliar("educacao", 1_000_000, 200_000, 6);
    expect(r.faltaProjetadaNoAno).toBeCloseTo(100_000);
    expect(r.faltaProjetadaNoAno!).toBeGreaterThan(r.faltaSobreBaseAtual);
  });

  it("não projeta nos primeiros meses do exercício", () => {
    // Janeiro tem despesa baixa em toda prefeitura. Extrapolar isso para o ano
    // dispararia alarme falso na primeira tela que o prefeito abre.
    const r = avaliar("saude", 500_000, 20_000, 2);
    expect(r.percentualProjetado).toBeNull();
    expect(r.faltaProjetadaNoAno).toBeNull();
  });

  it("trata base ausente como falta de informação, não como descumprimento", () => {
    // Devolver "0% aplicado" acusaria o gestor de descumprir algo que ninguém
    // mediu ainda.
    const r = avaliar("saude", 0, 0, 7);
    expect(r.situacao).not.toBe("critico");
    expect(r.faltaSobreBaseAtual).toBe(0);
    expect(r.percentualProjetado).toBeNull();
  });

  it("agrava a situação conforme o esforço necessário cresce", () => {
    // 6% aplicados com 15% exigidos: para fechar o ano seria preciso mais que
    // dobrar o ritmo mensal. É esforço grave em qualquer mês.
    const maio = avaliar("saude", 1_000_000, 60_000, 5);
    expect(maio.fatorAceleracao!).toBeGreaterThan(1.5);
    expect(maio.situacao).toBe("critico");
  });

  it("trata ajuste pequeno como no caminho, mesmo abaixo do mínimo", () => {
    // 14% contra 15% exigidos, em junho: basta subir ~1,14x o ritmo. Isso cabe
    // na variação normal de um cronograma de empenho e não é notícia.
    const r = avaliar("saude", 1_000_000, 140_000, 6);
    expect(r.fatorAceleracao!).toBeLessThan(1.15);
    expect(r.situacao).toBe("no_caminho");
  });

  it("aperta o julgamento quando restam poucos meses", () => {
    // O MESMO percentual aplicado (14,2%, abaixo dos 15%) é tranquilo em junho
    // e crítico em outubro. Não é o percentual que mudou — é o tamanho do
    // esforço: em junho a diferença se dilui em seis meses, em outubro ela
    // precisa caber em dois. É exatamente a distinção que um painel de
    // percentual sozinho não consegue mostrar.
    const junho = avaliar("saude", 1_000_000, 142_000, 6);
    const outubro = avaliar("saude", 1_000_000, 142_000, 10);

    expect(junho.percentualAtual).toBeCloseTo(outubro.percentualAtual);
    expect(junho.fatorAceleracao!).toBeLessThan(outubro.fatorAceleracao!);
    expect(junho.situacao).toBe("no_caminho");
    expect(outubro.situacao).toBe("critico");
  });

  it("não deixa acelerar o que já não tem mês restante", () => {
    const r = avaliar("saude", 1_000_000, 100_000, 12);
    expect(r.mesesRestantes).toBe(0);
    expect(r.fatorAceleracao).toBeNull();
    expect(r.situacao).toBe("critico");
  });

  it("nunca devolve falta negativa", () => {
    const r = avaliar("educacao", 1_000_000, 900_000, 11);
    expect(r.faltaSobreBaseAtual).toBe(0);
    expect(r.faltaProjetadaNoAno).toBe(0);
  });

  it("ignora aplicado inválido em vez de propagar NaN", () => {
    const r = avaliar("educacao", 1_000_000, Number.NaN, 6);
    expect(Number.isFinite(r.percentualAtual)).toBe(true);
    expect(r.percentualAtual).toBe(0);
  });

  it("limita meses fora da faixa do exercício", () => {
    const r = avaliar("educacao", 1_000_000, 250_000, 99);
    expect(r.situacao).toBe("cumprido");
    expect(Number.isFinite(r.percentualProjetado!)).toBe(true);
  });
});

describe("texto de resumo", () => {
  it("cita o percentual e o mínimo quando cumprido", () => {
    const texto = resumirAvaliacao(avaliar("educacao", 1_000_000, 260_000, 8), reais);
    expect(texto).toContain("26,00%");
    expect(texto).toContain("25%");
  });

  it("cita quanto falta em reais quando descumprido", () => {
    // Percentual sozinho não é acionável; o gestor precisa do valor a empenhar.
    const texto = resumirAvaliacao(avaliar("educacao", 1_000_000, 200_000, 6), reais);
    expect(texto).toContain("20,00%");
    expect(texto).toMatch(/Faltam R\$ 100000/);
  });
});
