import { describe, it, expect } from "vitest";
import {
  TIPOS_PUBLICACAO,
  ORDEM_PORTAL,
  definicaoTipo,
  montarSecoes,
  coberturaLegal,
  type Publicacao,
  type TipoPublicacao,
} from "@/lib/publicacoes";

function pub(over: Partial<Publicacao> & { tipo: TipoPublicacao }): Publicacao {
  return {
    id: Math.random().toString(36).slice(2),
    titulo: "Título",
    conteudo: "Conteúdo da publicação",
    secretaria: null,
    requisitos: null,
    prazo: null,
    contato: null,
    linkExterno: null,
    publicado: true,
    atualizadoEm: "2026-09-02T10:00:00Z",
    ...over,
  };
}

describe("tipos de publicação", () => {
  it("cobre todos os tipos na ordem do portal, sem repetir", () => {
    // Um tipo fora da ordem sumiria do portal em silêncio: a publicação existe
    // no banco, o gestor a vê no painel, e o cidadão nunca a encontra.
    expect([...ORDEM_PORTAL].sort()).toEqual(TIPOS_PUBLICACAO.map((t) => t.chave).sort());
    expect(new Set(ORDEM_PORTAL).size).toBe(ORDEM_PORTAL.length);
  });

  it("amarra os tipos de conformidade à norma que os exige", () => {
    // É o que separa isto de um blog: o tipo diz QUAL obrigação o conteúdo
    // atende, e sem a citação o painel não teria o que apontar como descoberto.
    expect(definicaoTipo("servico")?.lei).toContain("13.460");
    expect(definicaoTipo("estrutura")?.artigo).toContain("art. 8º");
    expect(definicaoTipo("faq")?.artigo).toContain("VI");
    expect(definicaoTipo("repasse")?.artigo).toContain("II");
  });

  it("marca como estruturado só o que a lei exige detalhar", () => {
    // Serviço precisa de requisitos e prazo pela Lei 13.460; secretaria precisa
    // de endereço e horário pela LAI. Comunicado é texto livre mesmo.
    expect(definicaoTipo("servico")?.estruturado).toBe(true);
    expect(definicaoTipo("estrutura")?.estruturado).toBe(true);
    expect(definicaoTipo("comunicado")?.estruturado).toBe(false);
  });

  it("comunicado abre o portal", () => {
    // Um portal cujo topo é sempre igual ensina o cidadão a não voltar.
    expect(ORDEM_PORTAL[0]).toBe("comunicado");
  });
});

describe("seções do portal público", () => {
  it("nunca mostra rascunho", () => {
    // Texto pela metade no endereço público é pior que seção ausente — e é
    // exatamente o que aconteceria se o padrão fosse publicar ao salvar.
    const secoes = montarSecoes([
      pub({ tipo: "comunicado", titulo: "Rascunho", publicado: false }),
    ]);
    expect(secoes).toHaveLength(0);
  });

  it("omite seção sem nenhum item", () => {
    // Um portal cheio de títulos vazios passa a impressão contrária à que ele
    // existe para dar.
    const secoes = montarSecoes([pub({ tipo: "faq", titulo: "Como pedir alvará?" })]);
    expect(secoes).toHaveLength(1);
    expect(secoes[0].tipo).toBe("faq");
  });

  it("respeita a ordem definida, não a ordem de chegada", () => {
    const secoes = montarSecoes([
      pub({ tipo: "documento", titulo: "Edital" }),
      pub({ tipo: "comunicado", titulo: "Mutirão" }),
      pub({ tipo: "faq", titulo: "Dúvida" }),
    ]);
    expect(secoes.map((s) => s.tipo)).toEqual(["comunicado", "faq", "documento"]);
  });

  it("agrupa vários itens do mesmo tipo numa seção só", () => {
    const secoes = montarSecoes([
      pub({ tipo: "servico", titulo: "Alvará" }),
      pub({ tipo: "servico", titulo: "IPTU" }),
    ]);
    expect(secoes).toHaveLength(1);
    expect(secoes[0].itens).toHaveLength(2);
  });

  it("com nada publicado não devolve seção nenhuma", () => {
    expect(montarSecoes([])).toHaveLength(0);
  });
});

describe("cobertura legal", () => {
  it("lista só os tipos que atendem norma", () => {
    // Comunicado e documento são úteis, mas não cumprem inciso nenhum —
    // contá-los como cobertura daria falsa sensação de conformidade.
    const cobertura = coberturaLegal([]);
    expect(cobertura.map((c) => c.tipo).sort()).toEqual(["estrutura", "faq", "repasse", "servico"]);
  });

  it("aponta como descoberto o que não tem publicação viva", () => {
    const cobertura = coberturaLegal([pub({ tipo: "faq", titulo: "Dúvida" })]);
    expect(cobertura.find((c) => c.tipo === "faq")?.atendida).toBe(true);
    expect(cobertura.find((c) => c.tipo === "servico")?.atendida).toBe(false);
  });

  it("rascunho não cobre exigência", () => {
    // O inciso é cumprido pela publicação, não pela intenção de publicar.
    const cobertura = coberturaLegal([
      pub({ tipo: "estrutura", titulo: "Secretaria de Saúde", publicado: false }),
    ]);
    expect(cobertura.find((c) => c.tipo === "estrutura")?.atendida).toBe(false);
  });
});
