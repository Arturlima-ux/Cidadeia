import { describe, it, expect } from "vitest";
import {
  lerObra,
  ehObraOuEngenharia,
  pedeAtencao,
  ATRASO_RELEVANTE_PP,
  DIAS_SEM_NOTICIA,
} from "@/lib/obra-prazo";

const HOJE = new Date("2026-09-29T12:00:00Z");

const obra = (o: Partial<Parameters<typeof lerObra>[0]> = {}) => ({
  id: "o1",
  objeto: "Construção de ponte sobre o rio",
  fornecedorNome: "Construtora Teste Ltda",
  valorInicial: 1_000_000,
  valorGlobal: 1_000_000,
  vigenciaInicio: "2026-01-01",
  vigenciaFim: "2026-12-31",
  progressoInformado: 70,
  progressoAtualizadoEm: "2026-09-20",
  ...o,
});

describe("o que conta como obra", () => {
  it("reconhece as categorias do portal", () => {
    expect(ehObraOuEngenharia("Obras")).toBe(true);
    expect(ehObraOuEngenharia("Serviços de Engenharia")).toBe(true);
    expect(ehObraOuEngenharia("Servicos de Engenharia")).toBe(true);
    expect(ehObraOuEngenharia("Compras")).toBe(false);
    expect(ehObraOuEngenharia("Locação Imóveis")).toBe(false);
    expect(ehObraOuEngenharia(null)).toBe(false);
  });
});

describe("o prazo vem do contrato, não de um palpite", () => {
  it("a fração consumida sai das duas datas", () => {
    // 01/01 a 31/12/2026, hoje 29/09: 271 de 364 dias ≈ 74%.
    const r = lerObra(obra({ progressoInformado: 75 }), HOJE);
    expect(r.prazoConsumido).toBeCloseTo(74.5, 0);
    expect(r.diasAteOFim).toBe(93);
  });

  it("contrato de poucos dias não vira divisão por zero", () => {
    // Existe nos dados reais: reforma de forro, 11 a 16 de julho.
    const r = lerObra(
      obra({ vigenciaInicio: "2026-09-29", vigenciaFim: "2026-09-29", progressoInformado: 50 }),
      HOJE
    );
    expect(r.prazoConsumido).toBe(100);
    expect(r.texto).not.toMatch(/Infinity|NaN|∞/);
  });

  it("a fração nunca passa de 100 nem fica negativa", () => {
    const passou = lerObra(obra({ vigenciaFim: "2026-06-30", progressoInformado: 100 }), HOJE);
    expect(passou.prazoConsumido).toBeLessThanOrEqual(100);
  });

  it("sem as duas datas, não inventa prazo", () => {
    const r = lerObra(obra({ vigenciaFim: null }), HOJE);
    expect(r.situacao).toBe("sem_prazo");
    expect(r.prazoConsumido).toBeNull();
  });

  it("vigência que ainda não começou não é atraso", () => {
    const r = lerObra(obra({ vigenciaInicio: "2027-01-01", vigenciaFim: "2027-12-31" }), HOJE);
    expect(r.situacao).toBe("nao_comecou");
    expect(pedeAtencao(r.situacao)).toBe(false);
  });
});

describe("obra com contrato vencido", () => {
  it("é o primeiro da lista, acima de qualquer atraso", () => {
    // É o que vira manchete e processo: obra inacabada sem contrato vigente.
    const vencida = lerObra(obra({ vigenciaFim: "2026-06-30", progressoInformado: 40 }), HOJE);
    const atrasada = lerObra(obra({ progressoInformado: 10 }), HOJE);
    expect(vencida.situacao).toBe("contrato_encerrado_sem_conclusao");
    expect(vencida.peso).toBeLessThan(atrasada.peso);
  });

  it("não diz que a execução ficou sem cobertura contratual", () => {
    // ── A CORREÇÃO QUE ESTE TESTE TRAVA ──
    //
    // O texto anterior sugeria que a obra executada depois do prazo estava
    // sem contrato. Para obra, está errado: o art. 111 da Lei 14.133/2021
    // prorroga AUTOMATICAMENTE a vigência de contratação de escopo
    // predefinido quando o objeto não é concluído no prazo — sem aditivo,
    // sem assinatura.
    //
    // Assustar o gestor com um problema que a lei resolveu é tão ruim quanto
    // esconder um que ela não resolve.
    const r = lerObra(obra({ vigenciaFim: "2026-06-30", progressoInformado: 40 }), HOJE);
    expect(r.acao).not.toMatch(/sem cobertura contratual/);
    expect(r.acao).toMatch(/automaticamente prorrogada/);
    expect(r.acao).toMatch(/art\. 111/);
  });

  it("aponta o que a lei NÃO resolve sozinha: a responsabilidade", () => {
    // Parágrafo único: culpa do contratado o constitui em mora, com sanções,
    // e a Administração pode optar pela extinção. É a decisão que precisa ser
    // tomada e registrada.
    const r = lerObra(obra({ vigenciaFim: "2026-06-30", progressoInformado: 40 }), HOJE);
    expect(r.acao).toMatch(/mora/);
    expect(r.acao).toMatch(/extinção/);
    expect(r.acao).toMatch(/Registre a decisão/);
  });

  it("sem progresso informado, diz que não há — não assume zero", () => {
    const r = lerObra(obra({ vigenciaFim: "2026-06-30", progressoInformado: null }), HOJE);
    expect(r.situacao).toBe("contrato_encerrado_sem_conclusao");
    expect(r.texto).toMatch(/sem progresso informado/);
    expect(r.texto).not.toMatch(/\b0%/);
  });

  it("obra a 100% com prazo vencido não é apontada", () => {
    // O contrato terminou porque a obra acabou. Não há nada a perguntar.
    const r = lerObra(obra({ vigenciaFim: "2026-06-30", progressoInformado: 100 }), HOJE);
    expect(r.situacao).not.toBe("contrato_encerrado_sem_conclusao");
  });
});

describe("atrás do prazo", () => {
  it("mostra os dois números crus, sem transformar prazo em progresso esperado", () => {
    // Prazo consumido NÃO é progresso esperado: uma obra pode gastar 80% do
    // prazo e estar em 95%. Quem compara é o gestor, com os números na frente.
    const r = lerObra(obra({ progressoInformado: 20 }), HOJE);
    expect(r.situacao).toBe("atras_do_prazo");
    expect(r.texto).toContain("20%");
    expect(r.texto).toContain("de progresso informado");
    expect(r.texto).toContain("do prazo do contrato");
    expect(r.texto).not.toMatch(/deveria estar/);
  });

  it("diferença pequena não vira alerta", () => {
    // 74% do prazo, progresso logo abaixo: dentro do recorte.
    const r = lerObra(obra({ progressoInformado: 74 - (ATRASO_RELEVANTE_PP - 5) }), HOJE);
    expect(r.situacao).not.toBe("atras_do_prazo");
  });

  it("a folga é a distância em pontos percentuais e fica negativa no atraso", () => {
    const r = lerObra(obra({ progressoInformado: 20 }), HOJE);
    expect(r.folga).toBeLessThan(0);
    expect(r.folga).toBeCloseTo(20 - r.prazoConsumido!, 5);
  });

  it("obra adiantada não é apontada", () => {
    const r = lerObra(obra({ progressoInformado: 95 }), HOJE);
    expect(r.situacao).toBe("em_dia");
    expect(r.folga).toBeGreaterThan(0);
  });

  it("a ação lembra que aditivo depois do vencimento não existe", () => {
    const r = lerObra(obra({ progressoInformado: 20 }), HOJE);
    expect(r.acao).toMatch(/não há contrato para aditar/);
  });
});

describe("obra sem notícia", () => {
  it("progresso nunca informado, com prazo correndo", () => {
    const r = lerObra(obra({ progressoInformado: null, progressoAtualizadoEm: null }), HOJE);
    expect(r.situacao).toBe("sem_noticia");
    expect(r.texto).toMatch(/nenhuma vez/);
  });

  it("medição velha conta como sem notícia, mesmo com progresso em dia", () => {
    // "Cadastrada há muito tempo" e "parada há muito tempo" são coisas
    // diferentes; o que importa é a data da última medição.
    const velho = new Date(HOJE.getTime() - (DIAS_SEM_NOTICIA + 5) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const r = lerObra(obra({ progressoInformado: 70, progressoAtualizadoEm: velho }), HOJE);
    expect(r.situacao).toBe("sem_noticia");
    expect(r.texto).toContain(velho);
  });

  it("medição recente não dispara", () => {
    const r = lerObra(obra({ progressoInformado: 70, progressoAtualizadoEm: "2026-09-25" }), HOJE);
    expect(r.situacao).toBe("em_dia");
  });

  it("a ação pede a medição a quem a tem", () => {
    const r = lerObra(obra({ progressoInformado: null, progressoAtualizadoEm: null }), HOJE);
    expect(r.acao).toMatch(/fiscalização do contrato/);
  });
});

describe("a tela não acusa ninguém", () => {
  it("nenhuma leitura usa palavra de acusação", () => {
    const casos = [
      obra({ vigenciaFim: "2026-06-30", progressoInformado: 40 }),
      obra({ progressoInformado: 10 }),
      obra({ progressoInformado: null, progressoAtualizadoEm: null }),
      obra({ vigenciaFim: null }),
      obra({ progressoInformado: 95 }),
    ];
    for (const caso of casos) {
      const r = lerObra(caso, HOJE);
      expect(`${r.texto} ${r.acao}`).not.toMatch(
        /ilegal|irregularidade|fraude|descumpri|superfatur|desvio/i
      );
    }
  });

  it("nenhuma leitura afirma progresso que não foi informado", () => {
    const r = lerObra(obra({ progressoInformado: null, progressoAtualizadoEm: null }), HOJE);
    expect(r.progressoInformado).toBeNull();
    expect(r.folga).toBeNull();
    expect(r.texto).not.toMatch(/\b0% de progresso/);
  });
});
