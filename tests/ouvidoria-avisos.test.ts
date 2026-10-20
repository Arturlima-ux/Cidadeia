import { describe, expect, it } from "vitest";
import {
  areaDaManifestacao,
  destinatariosDaManifestacao,
  emailChegouParaEquipe,
  emailProrrogacaoParaCidadao,
  emailRecebidoParaCidadao,
  emailRespostaParaCidadao,
  podeVerManifestacao,
  prazoDeResposta,
} from "@/lib/ouvidoria-avisos";
import type { Pessoa } from "@/lib/alerta-por-area";

const equipe: Pessoa[] = [
  { email: "prefeito@x", cargo: "prefeito", secretaria: null },
  { email: "adm@x", cargo: "admin", secretaria: null },
  { email: "obras@x", cargo: "secretario", secretaria: "obras" },
];

describe("quem recebe a manifestação nova", () => {
  it("a da área vai ao secretário dela e ao administrador", () => {
    expect(destinatariosDaManifestacao({ tipo: "reclamacao", secretaria: "obras" }, equipe).sort()).toEqual(["adm@x", "obras@x"]);
  });

  it("denúncia nunca vai ao secretário da área: fica com o gabinete", () => {
    expect(destinatariosDaManifestacao({ tipo: "denuncia", secretaria: "obras" }, equipe).sort()).toEqual(["adm@x", "prefeito@x"]);
  });

  it("sem área, ou área sem secretário, sobe ao prefeito", () => {
    expect(destinatariosDaManifestacao({ tipo: "protocolo", secretaria: null }, equipe).sort()).toEqual(["adm@x", "prefeito@x"]);
    expect(destinatariosDaManifestacao({ tipo: "protocolo", secretaria: "saude" }, equipe).sort()).toEqual(["adm@x", "prefeito@x"]);
  });
});

describe("quem vê no painel", () => {
  const sec = { cargo: "secretario", secretaria: "obras" };
  it("o secretário vê a da área dele, nunca denúncia", () => {
    expect(podeVerManifestacao(sec, { tipo: "reclamacao", secretaria: "obras" })).toBe(true);
    expect(podeVerManifestacao(sec, { tipo: "reclamacao", secretaria: "saude" })).toBe(false);
    expect(podeVerManifestacao(sec, { tipo: "denuncia", secretaria: "obras" })).toBe(false);
    expect(podeVerManifestacao({ cargo: "prefeito" }, { tipo: "denuncia", secretaria: null })).toBe(true);
  });
});

describe("a área informada pelo cidadão", () => {
  it("só aceita as conhecidas", () => {
    expect(areaDaManifestacao("saude")).toBe("saude");
    expect(areaDaManifestacao("'; drop table")).toBeNull();
    expect(areaDaManifestacao("")).toBeNull();
  });
});

describe("o prazo", () => {
  it("20 dias para pedido de informação, 30 para o resto, mais a prorrogação", () => {
    const aberto = new Date("2026-10-01T15:00:00Z");
    expect(prazoDeResposta("informacao", aberto)).toEqual({ dias: 20, data: "21/10/2026" });
    expect(prazoDeResposta("reclamacao", aberto).dias).toBe(30);
    expect(prazoDeResposta("informacao", aberto, true).dias).toBe(30);
  });
});

describe("os e-mails", () => {
  it("o da equipe não leva o texto nem o contato do cidadão", () => {
    const m = emailChegouParaEquipe({
      municipio: "Picos",
      protocolo: "202610-ABC",
      tipo: "reclamacao",
      assunto: "Buraco na rua",
      area: "obras",
      anonimo: false,
      prazo: { dias: 30, data: "31/10/2026" },
      linkPainel: "https://x/dashboard/atendimento",
    });
    expect(m.assunto).toBe("Picos: reclamação nova no portal (202610-ABC)");
    expect(m.html).toContain("Obras e serviços urbanos");
    expect(m.html).toContain("31/10/2026");
  });

  it("a confirmação do cidadão leva protocolo, chave e prazo", () => {
    const m = emailRecebidoParaCidadao({
      municipio: "Picos",
      nome: "Maria da Silva",
      protocolo: "202610-ABC",
      chave: "K3Y",
      tipo: "informacao",
      assunto: "Gastos com merenda",
      prazo: { dias: 20, data: "21/10/2026" },
      linkConsulta: "https://x",
    });
    expect(m.html).toContain("Olá, Maria.");
    expect(m.html).toContain("K3Y");
    expect(m.html).toContain("Lei 12.527/2011");
  });

  it("a resposta vai escapada e com os parágrafos", () => {
    const m = emailRespostaParaCidadao({ municipio: "Picos", nome: null, protocolo: "P", status: "respondido", resposta: "Linha 1\n\n<b>Linha 2</b>", linkConsulta: "x" });
    expect(m.assunto).toBe("Sua manifestação foi respondida, protocolo P");
    // A prefeitura aparece no remetente ("Prefeitura de Picos via CidadeIA") e no topo.
    expect(m.remetente).toBe("Prefeitura de Picos via CidadeIA");
    expect(m.html).toMatch(/<p[^>]*>Linha 1<\/p><p[^>]*>&lt;b&gt;Linha 2&lt;\/b&gt;<\/p>/);
    expect(m.html).not.toContain("<b>Linha 2");
  });

  it("a prorrogação leva a justificativa", () => {
    const m = emailProrrogacaoParaCidadao({ municipio: "Picos", nome: "Ana", protocolo: "P", diasExtras: 10, novoPrazo: "31/10/2026", justificativa: "Laudo pendente.", lei: "Lei 12.527/2011 (LAI), art. 11", linkConsulta: "x" });
    expect(m.html).toContain("Laudo pendente.");
    expect(m.html).toContain("10 dias, até <strong>31/10/2026</strong>");
  });
});
