import { describe, it, expect } from "vitest";
import {
  PRAZOS_ART_55,
  PRAZO_MINIMO_ABSOLUTO,
  prazoArt55,
  prazoProvavel,
  diasUteisEntre,
  diasCorridosEntre,
  lerVigencia,
  pedeAcao,
  HORIZONTE_ATENCAO_DIAS,
} from "@/lib/vigencia";

// Uma terça-feira, para as contas de dias úteis não dependerem de acaso.
const HOJE = new Date("2026-09-29T12:00:00Z");

const contrato = (vigenciaFim: string | null, objeto = "Aquisição de gêneros alimentícios") => ({
  objeto,
  vigenciaFim,
  fornecedorNome: "Fornecedor Teste LTDA",
});

describe("prazos do art. 55", () => {
  it("guarda os prazos conferidos no texto da lei", () => {
    // Números de lei não são estimativa. Se algum dia a lei mudar, este teste
    // quebra junto e obriga a olhar a tabela.
    expect(prazoArt55("bens_menor_preco").dias).toBe(8);
    expect(prazoArt55("bens_demais").dias).toBe(15);
    expect(prazoArt55("servicos_comuns").dias).toBe(10);
    expect(prazoArt55("servicos_especiais").dias).toBe(25);
    expect(prazoArt55("contratacao_integrada").dias).toBe(60);
    expect(prazoArt55("semi_integrada").dias).toBe(35);
    expect(prazoArt55("maior_lance").dias).toBe(15);
    expect(prazoArt55("tecnica_e_preco").dias).toBe(35);
  });

  it("todo prazo carrega a sua base legal, para a tela poder citar", () => {
    for (const p of PRAZOS_ART_55) {
      expect(p.base).toMatch(/^art\. 55/);
      expect(p.dias).toBeGreaterThan(0);
    }
  });

  it("o piso absoluto é o menor prazo da tabela", () => {
    // A régua do "se nem o mais rápido cabe, nenhum cabe".
    expect(PRAZO_MINIMO_ABSOLUTO).toBe(Math.min(...PRAZOS_ART_55.map((p) => p.dias)));
  });

  it("obra e serviço caem no prazo de serviços; o resto no de bens", () => {
    expect(prazoProvavel("Reforma da escola municipal").dias).toBe(10);
    expect(prazoProvavel("Prestação de serviço de transporte escolar").dias).toBe(10);
    expect(prazoProvavel("Locação de imóvel").dias).toBe(10);
    expect(prazoProvavel("Aquisição de medicamentos").dias).toBe(8);
  });

  it("objeto indistinguível cai no prazo mais curto, que é o mais favorável", () => {
    // Se o aviso já é grave com o prazo mais curto, é grave com qualquer um.
    // Escolher o prazo longo inflaria a gravidade sem base.
    expect(prazoProvavel("xyz").dias).toBe(PRAZO_MINIMO_ABSOLUTO);
  });
});

describe("contagem de dias úteis", () => {
  it("não conta sábado nem domingo", () => {
    // 29/09/2026 é terça. Até sexta 02/10 são 3 dias úteis.
    expect(diasUteisEntre(HOJE, new Date("2026-10-02T12:00:00Z"))).toBe(3);
    // Até a segunda 05/10 continuam sendo 4, porque o fim de semana não conta.
    expect(diasUteisEntre(HOJE, new Date("2026-10-05T12:00:00Z"))).toBe(4);
  });

  it("uma semana cheia dá exatamente 5 dias úteis", () => {
    expect(diasUteisEntre(HOJE, new Date("2026-10-06T12:00:00Z"))).toBe(5);
  });

  it("data no passado ou igual devolve zero, nunca negativo", () => {
    expect(diasUteisEntre(HOJE, new Date("2026-09-20T12:00:00Z"))).toBe(0);
    expect(diasUteisEntre(HOJE, HOJE)).toBe(0);
  });

  it("dias corridos ficam negativos no passado — é assim que o vencido é detectado", () => {
    expect(diasCorridosEntre(HOJE, new Date("2026-09-24T12:00:00Z"))).toBe(-5);
    expect(diasCorridosEntre(HOJE, new Date("2026-10-09T12:00:00Z"))).toBe(10);
  });

  it("a contagem não depende do horário dentro do dia", () => {
    // Fuso e horário já causaram defeito neste projeto; a conta é de data.
    expect(diasCorridosEntre(new Date("2026-09-29T23:59:00Z"), new Date("2026-09-30T00:01:00Z"))).toBe(1);
  });
});

describe("leitura da vigência", () => {
  it("contrato vencido é apontado pelo que importa: execução sem cobertura", () => {
    const r = lerVigencia(contrato("2026-09-24"), HOJE);
    expect(r.situacao).toBe("vencido");
    expect(r.diasCorridos).toBe(-5);
    expect(r.acao).toMatch(/sem cobertura contratual/);
  });

  it("quando nem o prazo do edital cabe, diz isso com a base legal", () => {
    // Vence em 5 dias corridos (3 úteis) e o piso legal é 8 dias úteis.
    const r = lerVigencia(contrato("2026-10-02"), HOJE);
    expect(r.situacao).toBe("sem_tempo_de_licitar");
    expect(r.diasUteis).toBe(3);
    expect(r.texto).toContain("8 dias úteis");
    expect(r.texto).toContain("art. 55");
  });

  it("no aperto, mostra quanto sobra depois de descontar o edital", () => {
    // 15 dias úteis à frente: acima do piso de 8, abaixo do dobro.
    const r = lerVigencia(contrato("2026-10-20"), HOJE);
    expect(r.situacao).toBe("apertado");
    expect(r.texto).toMatch(/sobrando/);
    expect(r.acao).toMatch(/aditivo depois do vencimento não prorroga nada/);
  });

  it("dentro do horizonte, mas com folga, é atenção e não urgência", () => {
    const r = lerVigencia(contrato("2026-12-15"), HOJE);
    expect(r.situacao).toBe("atencao");
    expect(r.diasCorridos).toBeLessThanOrEqual(HORIZONTE_ATENCAO_DIAS);
  });

  it("contrato distante não entra na tela", () => {
    const r = lerVigencia(contrato("2027-06-30"), HOJE);
    expect(r.situacao).toBe("ok");
    expect(pedeAcao(r.situacao)).toBe(false);
  });

  it("sem data de fim, não inventa prazo nenhum", () => {
    const r = lerVigencia(contrato(null), HOJE);
    expect(r.situacao).toBe("sem_data");
    expect(r.diasCorridos).toBeNull();
    expect(r.prazo).toBeNull();
    // E explica por que a data importa, em vez de só pedir um campo.
    expect(r.acao).toMatch(/dispensa emergencial/);
  });

  it("o objeto escolhe a régua: serviço exige mais dias que bem", () => {
    // Mesma data, prazos legais diferentes: o serviço fica sem tempo antes.
    const dia = "2026-10-12"; // 9 dias úteis à frente
    expect(lerVigencia(contrato(dia, "Aquisição de papel A4"), HOJE).situacao).toBe("apertado");
    expect(lerVigencia(contrato(dia, "Prestação de serviço de limpeza"), HOJE).situacao).toBe(
      "sem_tempo_de_licitar"
    );
  });

  it("a ação nunca manda só licitar — prorrogar também é legal", () => {
    const r = lerVigencia(contrato("2026-10-02"), HOJE);
    expect(r.acao).toMatch(/prorroga/i);
  });

  it("nenhuma leitura chama o gestor de irregular", () => {
    // A mesma disciplina do módulo de fracionamento: a tela relata fato e manda
    // conferir. Acusação é do Tribunal de Contas, não do software.
    for (const d of ["2026-09-01", "2026-10-02", "2026-10-20", "2026-12-15", "2027-06-30"]) {
      const r = lerVigencia(contrato(d), HOJE);
      expect(`${r.texto} ${r.acao}`).not.toMatch(/ilegal|irregularidade|fraude|descumpri/i);
    }
  });

  it("o peso ordena por faixa: o que já venceu vem antes do que ainda dá tempo", () => {
    const datas = ["2026-12-15", "2026-09-24", "2026-10-02"];
    const ordenado = datas
      .map((d) => lerVigencia(contrato(d), HOJE))
      .sort((a, b) => a.peso - b.peso)
      .map((r) => r.diasCorridos);
    expect(ordenado).toEqual([-5, 3, 77]);
  });

  it("entre vencidos, o de ontem vem antes do de dois anos atrás", () => {
    // Descoberto nos dados reais: um município tinha 39 contratos vencidos, e
    // ordenar por dias corridos punha o mais ANTIGO na frente. O antigo ou já
    // foi resolvido ou é problema crônico; o recente é o que ainda dá para
    // consertar hoje.
    const ontem = lerVigencia(contrato("2026-09-28"), HOJE);
    const antigo = lerVigencia(contrato("2024-09-28"), HOJE);
    expect(ontem.peso).toBeLessThan(antigo.peso);
  });

  it("uma faixa nunca invade a outra, por mais distante que seja a data", () => {
    // Um contrato vencido há 10 anos continua vindo antes de um que vence
    // daqui a 3 dias sem tempo de licitar? Não — mas os dois vêm antes de
    // qualquer "atenção". É isso que o degrau entre faixas garante.
    const vencidoAntigo = lerVigencia(contrato("2016-01-01"), HOJE);
    const atencao = lerVigencia(contrato("2026-12-15"), HOJE);
    const ok = lerVigencia(contrato("2030-01-01"), HOJE);
    expect(vencidoAntigo.peso).toBeLessThan(atencao.peso);
    expect(atencao.peso).toBeLessThan(ok.peso);
  });

  it("contrato sem data fica depois das urgências, mas antes do que está em dia", () => {
    // Não é urgência: é cadastro incompleto. Mas impede todo aviso futuro,
    // então também não pode sumir no fim da lista.
    const semData = lerVigencia(contrato(null), HOJE);
    const atencao = lerVigencia(contrato("2026-12-15"), HOJE);
    const ok = lerVigencia(contrato("2030-01-01"), HOJE);
    expect(semData.peso).toBeGreaterThan(atencao.peso);
    expect(semData.peso).toBeLessThan(ok.peso);
  });
});
