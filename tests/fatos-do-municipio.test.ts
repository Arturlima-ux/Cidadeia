import { describe, it, expect } from "vitest";
import {
  fatoDoPessoal,
  fatoDaAplicacao,
  fatoDosRelatorios,
  rotuloDoPeriodoRgf,
  municipioDoParametro,
} from "@/lib/fatos-do-municipio";
import { RESSALVA_MINIMOS } from "@/lib/raio-x-texto";
import type { ImportacaoRgf, PeriodoRgf, ResultadoRgf } from "@/lib/siconfi-rgf";
import type { RaioX, ResultadoRaioX } from "@/lib/raio-x";

const HOJE = "2026-10-02T12:00:00.000Z";

const PERIODO: PeriodoRgf = { exercicio: 2026, periodicidade: "Q", periodo: 2, mesReferencia: 8 };

function rgfOk(ajuste: Partial<ImportacaoRgf> = {}): ResultadoRgf {
  const rclAjustada = 100_000_000;
  return {
    ok: true,
    dados: {
      periodo: PERIODO,
      instituicao: "Prefeitura Municipal de Exemplo",
      rclAjustada,
      rcl: rclAjustada,
      despesaTotal: rclAjustada * 0.52,
      limiteMaximo: rclAjustada * 0.54,
      limitePrudencial: rclAjustada * 0.513,
      limiteAlerta: rclAjustada * 0.486,
      rclVeioDeReserva: false,
      ...ajuste,
    },
  };
}

const rgfNaoPublicado = (): ResultadoRgf => ({
  ok: false,
  erro: "Nenhum RGF encontrado no Tesouro para este município nos últimos períodos.",
  causa: "nao_publicado",
  periodosProcurados: 8,
});

const rgfEmBranco = (): ResultadoRgf => ({
  ok: false,
  erro: "O RGF foi publicado sem os valores de despesa com pessoal.",
  causa: "em_branco",
  periodosProcurados: 8,
});

const rgfConsultaFalhou = (): ResultadoRgf => ({
  ok: false,
  erro: "A consulta ao Tesouro não respondeu nesta tentativa.",
  causa: "consulta_falhou",
  periodosProcurados: 8,
});

function raioXOk(ajuste: Partial<RaioX> = {}): ResultadoRaioX {
  return {
    ok: true,
    raioX: {
      municipio: "Exemplo",
      uf: "PI",
      codigoIbge: "2211001",
      exercicio: 2026,
      bimestreReferencia: 4,
      receita: { valor: 200_000_000, fonte: "Tesouro Nacional · SICONFI", detalhe: "RREO Anexo 01" },
      despesaSaude: { valor: 30_000_000, fonte: "Tesouro Nacional · SICONFI", detalhe: "RREO" },
      despesaEducacao: { valor: 52_000_000, fonte: "Tesouro Nacional · SICONFI", detalhe: "RREO" },
      despesaObras: { valor: 8_000_000, fonte: "Tesouro Nacional · SICONFI", detalhe: "RREO" },
      rreoEsperados: 4,
      rreoEntregues: 4,
      rreoFaltando: [],
      rreoSemResposta: [],
      consultadoEm: HOJE,
      ...ajuste,
    },
  };
}

describe("o fato da despesa com pessoal", () => {
  it("confronta despesa declarada com limite declarado, sem calcular limite", () => {
    const f = fatoDoPessoal(rgfOk(), HOJE);
    expect(f.valor).toContain("52,00%");
    expect(f.leitura).toMatch(/a própria prefeitura declarou/);
  });

  it("limite ausente não vira zero nem percentual", () => {
    // Um limite de R$ 0 na tela afirma que o município estourou tudo.
    const f = fatoDoPessoal(
      rgfOk({ limiteMaximo: null, limitePrudencial: null, limiteAlerta: null }),
      HOJE
    );
    expect(f.leitura ?? "").not.toMatch(/R\$ ?0\b|\b0,00%/);
    expect(f.valor).toContain("52,00%");
  });

  it("sem RGF publicado é ausência, não erro", () => {
    const f = fatoDoPessoal(rgfNaoPublicado(), HOJE);
    expect(f.valor).toBeNull();
    expect(f.ausencia).toBeTruthy();
  });

  it("RGF em branco se distingue de RGF não publicado", () => {
    // Um é omissão de ENTREGA, o outro é omissão de CONTEÚDO. Tratar os dois
    // com a mesma frase acusaria de não publicar quem publicou.
    expect(fatoDoPessoal(rgfEmBranco(), HOJE).ausencia).not.toBe(
      fatoDoPessoal(rgfNaoPublicado(), HOJE).ausencia
    );
  });

  it("o fundamento é da LRF, nunca do Tribunal de Contas", () => {
    const f = fatoDoPessoal(rgfOk(), HOJE);
    expect(f.fundamento).toContain("59");
    expect(f.fundamento).not.toMatch(/Tribunal de Contas/);
  });
});

describe("o fato da aplicação em saúde e educação", () => {
  it("traz a ressalva literal do produto", () => {
    expect(fatoDaAplicacao(raioXOk(), HOJE).ressalva).toBe(RESSALVA_MINIMOS);
  });

  it("mostra os dois percentuais sobre a receita realizada", () => {
    const f = fatoDaAplicacao(raioXOk(), HOJE);
    expect(f.leitura).toContain("15,00%");
    expect(f.leitura).toContain("26,00%");
  });

  it("sem bimestre publicado é ausência", () => {
    const f = fatoDaAplicacao(raioXOk({ bimestreReferencia: null }), HOJE);
    expect(f.valor).toBeNull();
    expect(f.ausencia).toBeTruthy();
  });
});

describe("o fato dos relatórios", () => {
  it("nomeia os bimestres que não constam e cita o art. 51, § 2º", () => {
    const f = fatoDosRelatorios(raioXOk({ rreoFaltando: [3, 4], rreoEntregues: 2 }), HOJE);
    expect(f.leitura).toContain("3º");
    expect(f.fundamento).toMatch(/51/);
  });

  it("nada faltando não vira elogio vazio", () => {
    const f = fatoDosRelatorios(raioXOk({ rreoFaltando: [] }), HOJE);
    expect(f.valor).toBeTruthy();
    expect(f.ausencia).toBeNull();
  });

  it("bimestre sem resposta do Tesouro não é chamado de faltante", () => {
    const f = fatoDosRelatorios(raioXOk({ rreoFaltando: [], rreoSemResposta: [4], rreoEntregues: 3 }), HOJE);
    expect(f.leitura).not.toMatch(/não consta/);
    expect(f.leitura).toMatch(/não respondeu/);
  });

  it("sem bimestre vencido não cobra nada", () => {
    const f = fatoDosRelatorios(raioXOk({ rreoEsperados: 0, rreoEntregues: 0, bimestreReferencia: null }), HOJE);
    expect(f.valor).toBeNull();
    expect(f.ausencia).toMatch(/prazo/);
  });

  it("falha na consulta é ausência, não zero relatórios faltando", () => {
    const f = fatoDosRelatorios(
      { ok: false, erro: "timeout", municipioNaoEncontrado: false },
      HOJE
    );
    expect(f.valor).toBeNull();
    expect(f.ausencia).toBeTruthy();
  });
});

describe("o carimbo é duplo e sem hora", () => {
  it("traz o período medido e a data de consulta", () => {
    const c = fatoDoPessoal(rgfOk(), HOJE).carimbo!;
    expect(c.periodo).toMatch(/quadrimestre|semestre/);
    expect(c.consultadoEm).not.toMatch(/\d{2}:\d{2}/);
  });

  it("o rótulo do período nomeia a periodicidade declarada", () => {
    expect(rotuloDoPeriodoRgf(PERIODO)).toContain("2º quadrimestre de 2026");
    expect(rotuloDoPeriodoRgf({ ...PERIODO, periodicidade: "S", periodo: 1 })).toContain("semestre");
  });

  it("todo fato com valor tem carimbo", () => {
    for (const f of [fatoDoPessoal(rgfOk(), HOJE), fatoDaAplicacao(raioXOk(), HOJE), fatoDosRelatorios(raioXOk(), HOJE)]) {
      expect(f.valor, f.chave).toBeTruthy();
      expect(f.carimbo, f.chave).toBeTruthy();
    }
  });
});

describe("a página não diz tempo real", () => {
  it("nenhum texto gerado contém a expressão", () => {
    const todos = [
      fatoDoPessoal(rgfOk(), HOJE),
      fatoDoPessoal(rgfNaoPublicado(), HOJE),
      fatoDaAplicacao(raioXOk(), HOJE),
      fatoDosRelatorios(raioXOk({ rreoFaltando: [2] }), HOJE),
    ];
    for (const f of todos) expect(JSON.stringify(f)).not.toMatch(/tempo real/i);
  });
});

describe("toda fonte é nomeada", () => {
  it("nenhum fato aparece sem fonte e sem fundamento", () => {
    const todos = [fatoDoPessoal(rgfOk(), HOJE), fatoDaAplicacao(raioXOk(), HOJE), fatoDosRelatorios(raioXOk(), HOJE)];
    for (const f of todos) {
      expect(f.fonte.length, f.chave).toBeGreaterThan(5);
      expect(f.fundamento.length, f.chave).toBeGreaterThan(10);
    }
  });
});

describe("o parâmetro ?m= da home", () => {
  it("código válido resolve o município", () => {
    expect(municipioDoParametro("2211001")?.uf).toBe("PI");
  });

  it("lixo não vira consulta ao Tesouro", () => {
    // Validar contra a lista LOCAL antes de consultar é o que impede que
    // qualquer coisa colada na barra de endereço vire chamada à API pública.
    for (const m of ["", "abc", "0", "99999999", "<script>", "2211001; DROP", "221100", "22110011"]) {
      expect(municipioDoParametro(m), m).toBeNull();
    }
  });

  it("parâmetro ausente é estado inicial, não erro", () => {
    expect(municipioDoParametro(undefined)).toBeNull();
    expect(municipioDoParametro(null)).toBeNull();
  });
});

describe("o Tesouro fora do ar não acusa o município", () => {
  // ── O DEFEITO QUE ISTO FECHA ──
  //
  // Com o Tesouro lento ou recusando, a página escrevia "Nenhum RGF deste
  // município consta publicado no Tesouro" — uma afirmação sobre a conduta do
  // cliente numa visita em que o problema era nosso. Quem lê pode ser o
  // próprio secretário de finanças do município.

  it("falha de consulta não vira acusação de não publicar", () => {
    const f = fatoDoPessoal(rgfConsultaFalhou(), HOJE);
    expect(f.ausencia).not.toMatch(/não consta publicado|consta publicado/i);
    expect(f.ausencia).toMatch(/Tesouro não respondeu/i);
    expect(f.ausencia).toMatch(/não diz nada sobre o que a prefeitura/i);
  });

  it("as três ausências têm frases diferentes", () => {
    const frases = [rgfNaoPublicado(), rgfEmBranco(), rgfConsultaFalhou()].map(
      (r) => fatoDoPessoal(r, HOJE).ausencia
    );
    expect(new Set(frases).size).toBe(3);
  });

  it("a ausência também é carimbada e diz quantos períodos", () => {
    // Sem data de consulta, um print desta tela não é auditável.
    const c = fatoDoPessoal(rgfNaoPublicado(), HOJE).carimbo;
    expect(c).not.toBeNull();
    expect(c!.periodo).toContain("8");
    expect(c!.consultadoEm).not.toMatch(/\d{2}:\d{2}/);
  });
});

describe("nenhum cartão sai sem texto", () => {
  // Quando o RREO existe mas o anexo não trouxe a receita, `valor` ficava null
  // E `ausencia` ficava null: o visitante via um cartão tracejado com título,
  // carimbo e NENHUMA frase, no herói da home.
  it("receita não publicada vira ausência com frase, não cartão vazio", () => {
    const f = fatoDaAplicacao(
      raioXOk({ receita: { valor: null, fonte: "Tesouro Nacional · SICONFI", detalhe: "RREO" } }),
      HOJE
    );
    expect(f.valor).toBeNull();
    expect(f.ausencia).toBeTruthy();
  });

  it("despesa de saúde não publicada também", () => {
    const f = fatoDaAplicacao(
      raioXOk({ despesaSaude: { valor: null, fonte: "Tesouro Nacional · SICONFI", detalhe: "RREO" } }),
      HOJE
    );
    expect(f.valor === null ? f.ausencia : f.leitura).toBeTruthy();
  });

  it("todo fato tem OU valor com leitura OU ausência, nunca nenhum dos dois", () => {
    const todos = [
      fatoDoPessoal(rgfOk(), HOJE),
      fatoDoPessoal(rgfConsultaFalhou(), HOJE),
      fatoDaAplicacao(raioXOk(), HOJE),
      fatoDaAplicacao(raioXOk({ receita: { valor: null, fonte: "Tesouro Nacional · SICONFI", detalhe: "RREO" } }), HOJE),
      fatoDaAplicacao(raioXOk({ bimestreReferencia: null }), HOJE),
      fatoDosRelatorios(raioXOk(), HOJE),
      fatoDosRelatorios({ ok: false, erro: "x", municipioNaoEncontrado: false }, HOJE),
    ];
    for (const f of todos) {
      const temConteudo = (f.valor !== null && f.leitura !== null) || f.ausencia !== null;
      expect(temConteudo, `${f.chave} saiu sem texto`).toBe(true);
    }
  });
});

describe("não chama de declarado o que foi calculado por nós", () => {
  // ── O DEFEITO QUE ISTO FECHA ──
  //
  // Quando a linha da RCL ajustada não vem no anexo, `extrairRgf` cai para a
  // RCL do limite legal. Nesse caso o percentual sai de uma divisão NOSSA
  // sobre uma base diferente da que o Tesouro usou — e a frase dizia "o limite
  // que a própria prefeitura declarou", apresentando como declarado um número
  // que ninguém declarou. Numa página cujo argumento é precisão, é a frase que
  // um contador derruba.

  it("com RCL ajustada publicada, a frase afirma o que foi declarado", () => {
    const f = fatoDoPessoal(rgfOk(), HOJE);
    expect(f.leitura).toMatch(/a própria prefeitura declarou/);
  });

  it("com RCL ajustada ausente, a frase não diz 'declarou'", () => {
    const rcl = 100_000_000;
    const f = fatoDoPessoal(
      rgfOk({ rclAjustada: rcl, rcl, limiteAlerta: rcl * 0.486, rclVeioDeReserva: true }),
      HOJE
    );
    expect(f.leitura).not.toMatch(/a própria prefeitura declarou/);
    expect(f.leitura).toMatch(/base de reserva|não trouxe a receita corrente líquida ajustada/i);
  });
});
