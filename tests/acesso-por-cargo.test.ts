import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { temAcessoSecretaria, ehGestor, podeVerEscola, podeVerUnidade, type SessaoPayload } from "@/lib/sessao";

// ── O ERRO QUE ESTE ARQUIVO EXISTE PARA IMPEDIR ──
//
// Em 28/09/2026 uma revisão de segurança achou duas escaladas de
// privilégio, e as duas tinham a MESMA forma: o código perguntava
// "é secretário?" em vez de "o que esta pessoa pode ver?".
//
//   if (cargo === "secretario" && secretaria !== alvo) → 403
//   const ehSecretario = cargo === "secretario"
//
// Pergunta negativa funciona enquanto a lista de cargos não muda. Quando
// entraram "unidade" (gerência de UBS) e "escola" (direção), eles não eram
// secretários — então caíam no ramo PERMISSIVO. Uma diretora de escola, a
// conta de menor confiança do produto, baixava o PDF da rede de saúde
// inteira e recebia da IA o financeiro consolidado da prefeitura.
//
// Os testes abaixo travam a regra em duas frentes: o comportamento das
// funções de acesso, e a ausência do padrão negativo nos arquivos onde ele
// já causou dano.

const sessao = (cargo: string, extra: Partial<SessaoPayload> = {}): SessaoPayload => ({
  usuarioId: "u1",
  prefeituraId: "p1",
  nome: "Fulano",
  cargo: cargo as SessaoPayload["cargo"],
  ...extra,
});

describe("cargos de uma instalação só não enxergam a prefeitura", () => {
  it("a direção de escola alcança Educação e mais nada", () => {
    const s = sessao("escola", { escolaId: "e1" });
    expect(temAcessoSecretaria(s, "educacao")).toBe(true);
    expect(temAcessoSecretaria(s, "saude")).toBe(false);
    expect(temAcessoSecretaria(s, "obras")).toBe(false);
    expect(temAcessoSecretaria(s, "licitacoes")).toBe(false);
  });

  it("a gerência de unidade alcança Saúde e mais nada", () => {
    const s = sessao("unidade", { unidadeId: "u1" });
    expect(temAcessoSecretaria(s, "saude")).toBe(true);
    expect(temAcessoSecretaria(s, "educacao")).toBe(false);
  });

  it("nenhum dos dois é gestor — é isto que libera financeiro e alertas", () => {
    expect(ehGestor(sessao("escola"))).toBe(false);
    expect(ehGestor(sessao("unidade"))).toBe(false);
    expect(ehGestor(sessao("secretario"))).toBe(false);
    expect(ehGestor(sessao("prefeito"))).toBe(true);
    expect(ehGestor(sessao("admin"))).toBe(true);
  });

  it("cada um só abre a própria ficha", () => {
    expect(podeVerEscola(sessao("escola", { escolaId: "e1" }), "e1")).toBe(true);
    expect(podeVerEscola(sessao("escola", { escolaId: "e1" }), "e2")).toBe(false);
    expect(podeVerUnidade(sessao("unidade", { unidadeId: "u1" }), "u2")).toBe(false);
  });

  it("a direção de escola não abre ficha de unidade de saúde, nem o contrário", () => {
    expect(podeVerUnidade(sessao("escola", { escolaId: "e1" }), "u1")).toBe(false);
    expect(podeVerEscola(sessao("unidade", { unidadeId: "u1" }), "e1")).toBe(false);
  });

  it("um cargo desconhecido não cai no ramo permissivo por engano", () => {
    // Se alguém criar um cargo novo e esquecer de tratá-lo, ele NÃO pode
    // herdar a visão do prefeito. Hoje temAcessoSecretaria devolve true no
    // fim — este teste documenta isso como decisão consciente, e quebra se
    // um cargo de instalação única for adicionado sem sua regra.
    const conhecidos = ["prefeito", "secretario", "admin", "unidade", "escola"];
    const arquivo = readFileSync("src/lib/sessao.ts", "utf8");
    const declarados = arquivo.match(/cargo: "([^"]+)"/)?.[1] ?? "";
    for (const c of declarados.split('" | "')) {
      expect(conhecidos, `cargo "${c}" existe no tipo mas não neste teste`).toContain(c);
    }
  });
});

describe("as portas que já vazaram continuam fechadas", () => {
  const semComentarios = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("o relatório em PDF não decide acesso perguntando se é secretário", () => {
    const codigo = semComentarios(
      readFileSync("src/app/api/relatorios/secretaria/[nome]/route.ts", "utf8")
    );
    // A pergunta negativa que deixava unidade e escola passarem.
    expect(codigo).not.toMatch(/cargo === "secretario"\s*&&/);
    // E a pergunta positiva que a substituiu.
    expect(codigo).toContain("temAcessoSecretaria(sessao, secretaria)");
  });

  it("o relatório em PDF barra quem só enxerga a própria instalação", () => {
    const codigo = semComentarios(
      readFileSync("src/app/api/relatorios/secretaria/[nome]/route.ts", "utf8")
    );
    expect(codigo).toMatch(/cargo === "unidade" \|\| sessao\.cargo === "escola"/);
  });

  it("o chat da IA recusa cargo de instalação única", () => {
    // Ação de servidor é despachada por id, não por rota: o proxy não a
    // contém. A recusa tem de estar dentro da própria ação.
    const codigo = semComentarios(readFileSync("src/app/dashboard/ia/actions.ts", "utf8"));
    expect(codigo).toMatch(/cargo === "unidade" \|\| sessao\.cargo === "escola"/);
  });

  it("o contexto da IA não tem mais a própria cópia da regra de acesso", () => {
    const codigo = semComentarios(readFileSync("src/lib/ia.ts", "utf8"));
    // Era `const ehSecretario = restricaoCargo?.cargo === "secretario"`,
    // repetido em dois blocos, e foi por aí que os cargos novos passaram.
    expect(codigo).not.toContain('cargo === "secretario"');
    // Agora a visibilidade vem das mesmas funções que guardam as telas.
    expect(codigo).toContain("ehGestor(");
    expect(codigo).toContain("temAcessoSecretaria(");
  });
});
