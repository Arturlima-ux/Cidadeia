import { describe, it, expect } from "vitest";
import {
  PRAZOS,
  diasEntre,
  avaliarPrazo,
  montarPainelPrazos,
  descreverPrazo,
  type EntradaPrazo,
} from "@/lib/prazo-atendimento";
import { TIPOS } from "@/lib/atendimento";

const HOJE = new Date("2026-09-02T12:00:00Z");

function diasAtras(n: number): string {
  return new Date(HOJE.getTime() - n * 86_400_000).toISOString();
}

function pedido(over: Partial<EntradaPrazo> = {}): EntradaPrazo {
  return { tipo: "informacao", status: "aberto", abertoEm: diasAtras(1), ...over };
}

describe("prazos legais", () => {
  it("dá 20 dias ao pedido de informação, como manda a LAI", () => {
    // É o prazo mais curto e o mais fiscalizado — tratar tudo com o mesmo
    // prazo faria a prefeitura descobrir o atraso depois de vencido.
    expect(PRAZOS.informacao.dias).toBe(20);
    expect(PRAZOS.informacao.prorrogacao).toBe(10);
    expect(PRAZOS.informacao.lei).toContain("12.527");
    expect(PRAZOS.informacao.artigo).toContain("11");
  });

  it("dá 30 dias às manifestações de ouvidoria", () => {
    expect(PRAZOS.reclamacao.dias).toBe(30);
    expect(PRAZOS.denuncia.lei).toContain("13.460");
    expect(PRAZOS.denuncia.artigo).toContain("16");
  });

  it("cobre todo tipo que o cidadão consegue abrir", () => {
    // Um tipo sem prazo cadastrado sairia do painel em silêncio — e o silêncio
    // é exatamente o modo como o prazo é perdido hoje.
    for (const t of TIPOS) {
      expect(PRAZOS[t.chave], t.chave).toBeDefined();
      expect(PRAZOS[t.chave].dias, t.chave).toBeGreaterThan(0);
    }
  });
});

describe("contagem de dias", () => {
  it("conta dias corridos ignorando a hora", () => {
    expect(diasEntre("2026-09-01T23:50:00Z", "2026-09-02T00:10:00Z")).toBe(1);
    expect(diasEntre("2026-09-01T00:00:00Z", "2026-09-01T23:59:00Z")).toBe(0);
  });

  it("não quebra com data inválida", () => {
    expect(diasEntre("não é data", "2026-09-02")).toBe(0);
  });
});

describe("avaliação", () => {
  it("está no prazo quando ainda há folga", () => {
    const r = avaliarPrazo(pedido({ abertoEm: diasAtras(3) }), HOJE);
    expect(r.situacao).toBe("no_prazo");
    expect(r.diasRestantes).toBe(17);
  });

  it("avisa cinco dias antes, com tempo de reagir", () => {
    // Cinco dias é o que permite localizar o processo, redigir a resposta e
    // ainda formalizar a prorrogação. Avisar em cima da hora só registraria o
    // fracasso.
    const r = avaliarPrazo(pedido({ abertoEm: diasAtras(16) }), HOJE);
    expect(r.diasRestantes).toBe(4);
    expect(r.situacao).toBe("vence_breve");
  });

  it("marca vencido e diz de quantos dias é o atraso", () => {
    const r = avaliarPrazo(pedido({ abertoEm: diasAtras(25) }), HOJE);
    expect(r.situacao).toBe("vencido");
    expect(r.diasRestantes).toBe(-5);
    expect(descreverPrazo(r)).toContain("vencido há 5 dias");
  });

  it("soma a prorrogação quando ela foi formalizada", () => {
    // 22 dias corridos estouram os 20 da LAI, mas cabem folgados nos 30 com a
    // prorrogação do § 2º — que a lei exige ser expressa e comunicada ao
    // requerente, e por isso é um campo marcado, não uma dedução nossa.
    const semProrrogar = avaliarPrazo(pedido({ abertoEm: diasAtras(22) }), HOJE);
    const prorrogado = avaliarPrazo(pedido({ abertoEm: diasAtras(22), prorrogado: true }), HOJE);
    expect(semProrrogar.situacao).toBe("vencido");
    expect(semProrrogar.diasRestantes).toBe(-2);
    expect(prorrogado.situacao).toBe("no_prazo");
    expect(prorrogado.diasRestantes).toBe(8);
    expect(prorrogado.prazoDias).toBe(30);
  });

  it("não oferece prorrogar o que já foi prorrogado", () => {
    expect(avaliarPrazo(pedido(), HOJE).podeProrrogar).toBe(true);
    expect(avaliarPrazo(pedido({ prorrogado: true }), HOJE).podeProrrogar).toBe(false);
  });

  it("para o relógio na data da resposta", () => {
    // Sem isso, um atendimento respondido dentro do prazo apareceria como
    // atrasado semanas depois, só porque o tempo continuou correndo.
    const r = avaliarPrazo(
      pedido({ abertoEm: diasAtras(60), status: "respondido", respondidoEm: diasAtras(50) }),
      HOJE
    );
    expect(r.situacao).toBe("respondido");
    expect(r.diasCorridos).toBe(10);
    expect(descreverPrazo(r)).toContain("Respondido em 10 dias");
  });

  it("não acusa atraso em atendimento respondido sem data registrada", () => {
    // O registro é falho, mas acusar atraso em algo que a prefeitura respondeu
    // seria pior do que perder a métrica.
    const r = avaliarPrazo(
      pedido({ abertoEm: diasAtras(90), status: "encerrado", respondidoEm: null }),
      HOJE
    );
    expect(r.situacao).toBe("respondido");
  });

  it("aplica prazos diferentes ao mesmo tempo de espera", () => {
    // 25 dias: vencido para a LAI, ainda dentro do prazo para a ouvidoria.
    const info = avaliarPrazo(pedido({ tipo: "informacao", abertoEm: diasAtras(25) }), HOJE);
    const reclamacao = avaliarPrazo(pedido({ tipo: "reclamacao", abertoEm: diasAtras(25) }), HOJE);
    expect(info.situacao).toBe("vencido");
    expect(reclamacao.situacao).toBe("vence_breve");
  });

  it("diz 'vence hoje' quando é o último dia", () => {
    const r = avaliarPrazo(pedido({ abertoEm: diasAtras(20) }), HOJE);
    expect(r.diasRestantes).toBe(0);
    expect(r.situacao).toBe("vence_breve");
    expect(descreverPrazo(r)).toBe("Vence hoje.");
  });
});

describe("painel", () => {
  it("separa o que exige ação do que só precisa ser contado", () => {
    const painel = montarPainelPrazos(
      [
        pedido({ abertoEm: diasAtras(30) }),
        pedido({ abertoEm: diasAtras(18) }),
        pedido({ abertoEm: diasAtras(2) }),
        pedido({ abertoEm: diasAtras(40), status: "respondido", respondidoEm: diasAtras(35) }),
      ],
      HOJE
    );
    expect(painel.vencidos).toHaveLength(1);
    expect(painel.vencendo).toHaveLength(1);
    expect(painel.noPrazo).toBe(1);
    expect(painel.respondidos).toBe(1);
    expect(painel.total).toBe(4);
  });

  it("ordena pelo mais atrasado primeiro", () => {
    // É a ordem em que o dano cresce, e a ordem em que o gestor deve abrir.
    const painel = montarPainelPrazos(
      [pedido({ abertoEm: diasAtras(25) }), pedido({ abertoEm: diasAtras(60) })],
      HOJE
    );
    expect(painel.vencidos.map((v) => v.avaliacao.diasRestantes)).toEqual([-40, -5]);
  });

  it("com lista vazia não inventa pendência", () => {
    const painel = montarPainelPrazos([], HOJE);
    expect(painel.total).toBe(0);
    expect(painel.vencidos).toHaveLength(0);
    expect(painel.vencendo).toHaveLength(0);
  });
});
