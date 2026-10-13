import { describe, it, expect } from "vitest";
import { fatosDaCidade, fatosNovos, chaveDoAviso, inscritoDaChave, emailDoAviso } from "@/lib/aviso-da-cidade";
import type { SituacaoFiscal } from "@/lib/vigia-fiscal";

const obr = (chave: "rreo" | "rgf" | "siops") => ({ chave, sigla: chave.toUpperCase(), verificavel: chave !== "siops" });
const av = (chave: "rreo" | "rgf" | "siops", numero: number, situacao: string, diasRestantes: number, fim: string, venc: string) => ({
  obrigacao: obr(chave),
  numero,
  periodicidade: chave === "rgf" ? "quadrimestral" : "bimestral",
  rotulo: `${numero}º período de 2026`,
  fimDoPeriodo: fim,
  vencimento: venc,
  situacao,
  diasRestantes,
});

function situacao(avaliadas: unknown[], inconclusivos: string[] = []): SituacaoFiscal {
  return { exercicio: 2026, periodicidadeRgf: "quadrimestral", periodicidadeDoExtrato: true, avaliadas, inconclusivos, pessoal: null } as unknown as SituacaoFiscal;
}

describe("aviso da cidade: o que avisar", () => {
  it("avisa prazo perto, prazo vencido e só a entrega mais recente de cada relatório", () => {
    const f = fatosDaCidade(
      situacao([
        av("rreo", 3, "entregue", -60, "2026-06-30", "2026-07-30"),
        av("rreo", 4, "vence_breve", 5, "2026-08-31", "2026-09-30"),
        av("rgf", 1, "entregue", -100, "2026-04-30", "2026-05-30"),
        av("rgf", 2, "vencida", -10, "2026-08-31", "2026-09-30"),
        av("siops", 4, "vencida", -3, "2026-08-31", "2026-09-30"),
        av("rreo", 2, "entregue", -120, "2026-04-30", "2026-05-30"),
      ]),
      "Picos"
    );
    expect(f.map((x) => x.chave)).toEqual(["2026:rgf:2:vencida", "2026:rreo:4:vence", "2026:rreo:3:entregue", "2026:rgf:1:entregue"]);
    expect(f[0].texto).toContain("Picos");
    expect(f[1].texto).toContain("em 5 dias");
  });

  it("prazo a mais de 7 dias ainda não vira aviso", () => {
    expect(fatosDaCidade(situacao([av("rreo", 4, "vence_breve", 12, "2026-08-31", "2026-09-30")]), "Picos")).toEqual([]);
  });

  it("sem resposta do Tesouro sobre o período, nada é afirmado", () => {
    expect(fatosDaCidade(situacao([av("rgf", 2, "vencida", -10, "2026-08-31", "2026-09-30")], ["rgf:2"]), "Picos")).toEqual([]);
  });

  it("não repete o que já foi avisado", () => {
    const f = fatosDaCidade(situacao([av("rgf", 2, "vencida", -10, "2026-08-31", "2026-09-30")]), "Picos");
    expect(fatosNovos(f, new Set(["2026:rgf:2:vencida"]))).toEqual([]);
    expect(fatosNovos(f, new Set())).toHaveLength(1);
  });
});

describe("aviso da cidade: descadastro e e-mail", () => {
  it("a chave de cancelar só vale para o próprio inscrito", () => {
    const s = "segredo-de-teste-com-mais-de-32-caracteres";
    const c = chaveDoAviso("lead_123e4567-e89b-12d3-a456-426614174000", s)!;
    expect(inscritoDaChave(c, s)).toBe("lead_123e4567-e89b-12d3-a456-426614174000");
    expect(inscritoDaChave(c.replace("lead_123", "lead_124"), s)).toBeNull();
  });

  it("todo e-mail tem o convite ao Gestão e o link para parar", () => {
    const m = emailDoAviso({
      nome: "Maria Silva",
      municipio: "Picos",
      uf: "PI",
      fatos: [],
      primeiro: true,
      linkRaioX: "https://x/raio-x/pi/picos",
      linkProposta: "https://x/proposta?ibge=2208007&modulos=gestao",
      linkCancelar: "https://x/aviso/cancelar/abc",
    });
    expect(m.assunto).toBe("Picos/PI: como estão os relatórios fiscais hoje");
    expect(m.html).toContain("Olá, Maria.");
    expect(m.html).toContain("modulos=gestao");
    expect(m.html).toContain("/aviso/cancelar/abc");
    expect(m.html).toContain("nada em atraso");
  });
});
