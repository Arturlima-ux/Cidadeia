import { describe, expect, it } from "vitest";
import { achadosDasEmendas, cnpjFormatado, montarEmendas, resumirEmendas, type PlanoAcaoCru } from "@/lib/emendas-pix";
import { emendasDeExemplo } from "@/lib/emendas-pix-exemplo";

const hoje = new Date("2026-10-20T12:00:00Z");
const plano = (id: number, extra: Partial<PlanoAcaoCru> = {}): PlanoAcaoCru => ({
  id_plano_acao: id,
  codigo_plano_acao: `PA-${id}`,
  ano_plano_acao: 2026,
  situacao_plano_acao: "CIENTE",
  data_aceite_plano_acao: "2026-02-01",
  nome_parlamentar_emenda_plano_acao: "Fulano",
  codigo_emenda_parlamentar_formatado_plano_acao: "2026.123.456",
  motivo_impedimento_plano_acao: null,
  valor_custeio_plano_acao: 100_000,
  valor_investimento_plano_acao: 50_000,
  nome_objeto: "Reforma da praça",
  codigo_descricao_areas_politicas_publicas_plano_acao: "15 - Urbanismo; 10 - Saúde",
  ...extra,
});

describe("emendas Pix", () => {
  it("monta a emenda com o último plano de trabalho, relatórios e devoluções", () => {
    const [e] = montarEmendas(
      [plano(1)],
      [
        { id_plano_trabalho: 1, id_plano_acao: 1, situacao_plano_trabalho: "Antigo", data_inicio_execucao_plano_trabalho: null, data_fim_execucao_plano_trabalho: "2026-01-01", dt_hora_pt_aprovado: null, ind_orgao_analises_pendentes: null },
        { id_plano_trabalho: 2, id_plano_acao: 1, situacao_plano_trabalho: "Aprovado", data_inicio_execucao_plano_trabalho: "2026-03-01T00:00:00", data_fim_execucao_plano_trabalho: "2026-11-30T00:00:00", dt_hora_pt_aprovado: "2026-02-20T10:00:00", ind_orgao_analises_pendentes: "Sim" },
      ],
      [{ id_relatorio_gestao_novo: 9, id_plano_acao: 1, data_relatorio_gestao_novo: "2026-06-30", tipo_relatorio_gestao_novo: "Parcial", situacao_relatorio_gestao_novo: "Enviado", valor_executado_relatorio_gestao_novo: 40_000 }],
      []
    );
    expect(e.valor).toBe(150_000);
    expect(e.area).toBe("Urbanismo, Saúde");
    expect(e.planoTrabalho).toMatchObject({ situacao: "Aprovado", fim: "2026-11-30", analisePendente: true });
    expect(e.relatorios[0].tipo).toBe("Parcial");
  });

  it("avisa impedimento, fim de execução sem relatório final e devolução vencendo", () => {
    const emendas = montarEmendas(
      [plano(1, { motivo_impedimento_plano_acao: "Conta bloqueada" }), plano(2), plano(3), plano(4)],
      [
        { id_plano_trabalho: 1, id_plano_acao: 2, situacao_plano_trabalho: "Aprovado", data_inicio_execucao_plano_trabalho: null, data_fim_execucao_plano_trabalho: "2026-11-25", dt_hora_pt_aprovado: null, ind_orgao_analises_pendentes: false },
        { id_plano_trabalho: 2, id_plano_acao: 3, situacao_plano_trabalho: "Aprovado", data_inicio_execucao_plano_trabalho: null, data_fim_execucao_plano_trabalho: "2026-09-01", dt_hora_pt_aprovado: null, ind_orgao_analises_pendentes: false },
        { id_plano_trabalho: 3, id_plano_acao: 4, situacao_plano_trabalho: "Aprovado", data_inicio_execucao_plano_trabalho: null, data_fim_execucao_plano_trabalho: "2026-09-01", dt_hora_pt_aprovado: null, ind_orgao_analises_pendentes: false },
      ],
      [{ id_relatorio_gestao_novo: 1, id_plano_acao: 4, data_relatorio_gestao_novo: "2026-09-20", tipo_relatorio_gestao_novo: "Final", situacao_relatorio_gestao_novo: "Enviado", valor_executado_relatorio_gestao_novo: 150_000 }],
      [{ id_devolucao: 1, id_plano_acao: 2, situacao_devolucao: "Pendente", dt_vencimento_devolucao: "2026-10-28", dt_pagamento_devolucao: null, vl_total_devolucao: 3_000 }]
    );
    const a = achadosDasEmendas(emendas, hoje);
    const chaves = a.map((x) => x.chave);
    expect(chaves).toContain("emenda:1:impedida");
    expect(chaves).toContain("emenda:2:fim:2026-11-25");
    expect(chaves).toContain("emenda:3:sem-final:2026-09-01");
    expect(chaves).toContain("emenda:2:devolucao:2026-10-28");
    // a 4 terminou, mas tem relatório final
    expect(chaves.some((c) => c?.startsWith("emenda:4"))).toBe(false);
    expect(a.find((x) => x.chave === "emenda:3:sem-final:2026-09-01")!.prioridade).toBe("urgente");
  });

  it("resumo e exemplo coerentes", () => {
    const r = resumirEmendas(emendasDeExemplo(hoje), hoje);
    expect(r.quantidade).toBe(4);
    expect(r.comPendencia).toBeGreaterThanOrEqual(2);
    expect(cnpjFormatado("06554729000196")).toBe("06.554.729/0001-96");
  });
});
