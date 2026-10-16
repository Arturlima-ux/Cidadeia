import { describe, expect, it } from "vitest";
import { ehNota, lerAvaliacao, resumirSatisfacao, rotuloDaNota, ultimaPorManifestacao } from "@/lib/avaliacao-cidadao";
import { MINIMO_PUBLICO, resumirVoz, type LinhaVoz } from "@/lib/voz-da-cidade";
import { linhasDe, type Fontes } from "@/lib/dados-abertos";
import { emailAvaliacaoParaEquipe, emailRespostaParaCidadao } from "@/lib/ouvidoria-avisos";
import { mensagensDeExemplo } from "@/lib/portal-exemplo";

describe("avaliação do cidadão", () => {
  it("aceita só as três notas", () => {
    expect(["sim", "parte", "nao"].every(ehNota)).toBe(true);
    expect(ehNota("talvez")).toBe(false);
    expect(rotuloDaNota("nao")).toBe("Não resolveu");
  });

  it("lê o evento e ignora linha estragada", () => {
    expect(lerAvaliacao('{"nota":"parte","comentario":"  faltou a data  "}')).toEqual({ nota: "parte", comentario: "faltou a data" });
    expect(lerAvaliacao('{"nota":"sim","comentario":""}')).toEqual({ nota: "sim", comentario: null });
    expect(lerAvaliacao('{"nota":"otimo"}')).toBeNull();
    expect(lerAvaliacao("não é json")).toBeNull();
  });

  it("vale a última avaliação de cada manifestação", () => {
    const m = ultimaPorManifestacao([
      { pedidoId: "a", descricao: '{"nota":"sim"}' }, // mais recente
      { pedidoId: "a", descricao: '{"nota":"nao"}' },
      { pedidoId: "b", descricao: "estragada" },
      { pedidoId: "b", descricao: '{"nota":"parte"}' },
    ]);
    expect(m.get("a")?.nota).toBe("sim");
    expect(m.get("b")?.nota).toBe("parte");
  });

  it("resume a satisfação", () => {
    expect(resumirSatisfacao([]).percentualResolveu).toBeNull();
    const s = resumirSatisfacao(["sim", "sim", "parte", "nao"].map((nota) => ({ nota: nota as "sim", comentario: null })));
    expect(s).toEqual({ total: 4, sim: 2, parte: 1, nao: 1, percentualResolveu: 50 });
  });
});

describe("a satisfação no portal", () => {
  const agora = Date.parse("2026-10-10T12:00:00Z");
  const linha = (i: number, avaliacao: LinhaVoz["avaliacao"], respondida = true): LinhaVoz => ({
    tipo: "protocolo",
    status: respondida ? "respondido" : "aberto",
    secretaria: "obras",
    createdAt: new Date(agora - (i + 1) * 86_400_000).toISOString(),
    respondidoEm: respondida ? new Date(agora - i * 86_400_000).toISOString() : null,
    avaliacao,
  });

  it("conta só manifestações respondidas e leva a nota à faixa", () => {
    const linhas = [linha(0, "sim"), linha(1, "nao"), linha(2, null), linha(3, "sim"), linha(4, "parte", false)];
    expect(linhas.length).toBeGreaterThanOrEqual(MINIMO_PUBLICO);
    const voz = resumirVoz(linhas, agora);
    if (!voz.publica) throw new Error("devia ser pública");
    expect(voz.satisfacao).toMatchObject({ total: 3, sim: 2, nao: 1 });
    expect(voz.faixa[0].avaliacao).toBe("sim");
    expect(voz.faixa.find((f) => f.situacao === "andamento")?.avaliacao).toBeNull();
  });

  it("o arquivo de manifestações leva a nota, nunca o comentário", () => {
    const fontes = { manifestacoes: [{ tipo: "protocolo", secretaria: "obras", status: "respondido", createdAt: "2026-10-01", respondidoEm: "2026-10-03", avaliacao: "parte" }] } as unknown as Fontes;
    const [r] = linhasDe("manifestacoes", fontes);
    expect(r.avaliacao_do_cidadao).toBe("Em parte");
    expect(JSON.stringify(r)).not.toContain("comentario");
  });

  it("a cidade de exemplo tem avaliações suficientes para aparecer", () => {
    const voz = resumirVoz(mensagensDeExemplo(agora), agora);
    if (!voz.publica) throw new Error("devia ser pública");
    expect(voz.satisfacao.total).toBeGreaterThan(10);
    expect(voz.satisfacao.percentualResolveu).toBeGreaterThan(50);
  });
});

describe("os e-mails", () => {
  it("a resposta convida a avaliar; o andamento não", () => {
    const base = { municipio: "Bela Aurora", nome: null, protocolo: "X1", resposta: "Feito.", linkConsulta: "https://x/y" };
    expect(emailRespostaParaCidadao({ ...base, status: "respondido" }).html).toContain("A resposta resolveu?");
    expect(emailRespostaParaCidadao({ ...base, status: "em_analise" }).html).not.toContain("A resposta resolveu?");
  });

  it("o aviso à equipe não leva o comentário do cidadão", () => {
    const e = emailAvaliacaoParaEquipe({ municipio: "Bela Aurora", protocolo: "X1", tipo: "reclamacao", assunto: "Buraco", nota: "nao", comComentario: true, linkPainel: "https://x/p" });
    expect(e.assunto).toContain("não resolveu");
    expect(e.html).toContain("deixou um comentário");
    expect(e.html).toContain("https://x/p");
  });
});
