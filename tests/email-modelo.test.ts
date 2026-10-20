import { describe, expect, it } from "vitest";
import { h, montarEmail, paragrafosDe, saudacao, textoDoHtml } from "@/lib/email-modelo";
import { comNome } from "@/lib/email";

const empresa = { razaoSocial: "CidadeIA Tecnologia Ltda", cnpj: "12.345.678/0001-90", endereco: null, representante: null, emailSuporte: "contato@cidadeia.com.br", telefoneSuporte: null };

describe("o modelo dos e-mails", () => {
  const html = montarEmail({
    remetente: { tipo: "cidadeia" },
    previa: "Texto de prévia",
    etiqueta: { texto: "Proposta" },
    titulo: "Título <com tag>",
    saudacao: "Olá, Ana.",
    blocos: [
      { p: "Nome <script>alert(1)</script>" },
      { p: h`Valor <strong>${"<b>x</b>"}</strong>` },
      { dados: [["Protocolo", "P123"]] },
      { lista: ["um", "dois"] },
      { itens: [{ etiqueta: "Urgente", titulo: "Item", detalhe: "Detalhe", tom: "urgente" }] },
      { botao: "Abrir", link: "https://x.test/a?b=1&c=2", depois: { texto: "Outro", link: "https://x.test/o" } },
      null,
      false,
    ],
    motivo: "Você recebe porque pediu.",
    cancelar: "https://x.test/cancelar",
    empresa,
  });

  it("escapa tudo o que entra, menos o que já é Html", () => {
    expect(html).toContain("Nome &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("Valor <strong>&lt;b&gt;x&lt;/b&gt;</strong>");
    expect(html).toContain("Título &lt;com tag&gt;");
    expect(html).not.toContain("<script>");
  });

  it("tem a prévia escondida, a assinatura, o motivo, a empresa e o descadastro", () => {
    expect(html).toMatch(/display:none[^>]*>Texto de prévia/);
    expect(html).toContain("Equipe CidadeIA");
    expect(html).toContain("Você recebe porque pediu.");
    expect(html).toContain("CidadeIA Tecnologia Ltda &middot; CNPJ 12.345.678/0001-90");
    expect(html).toContain('href="https://x.test/cancelar"');
    expect(html).toContain('href="https://x.test/a?b=1&amp;c=2"');
  });

  it("sem dado da empresa, nada de marcador de posição", () => {
    const sem = montarEmail({ remetente: { tipo: "cidadeia" }, previa: "p", titulo: "t", blocos: [], empresa: { ...empresa, razaoSocial: null, cnpj: null } });
    expect(sem).not.toMatch(/CNPJ|\[/);
  });

  it("a voz da prefeitura: a marca é dela, e o CidadeIA só no rodapé", () => {
    const p = montarEmail({ remetente: { tipo: "prefeitura", municipio: "Picos", setor: "Ouvidoria" }, previa: "p", titulo: "t", blocos: [] });
    expect(p).toContain("Prefeitura Municipal de");
    expect(p).toContain("Picos");
    expect(p).toContain("Mensagem automática da Ouvidoria da Prefeitura de Picos");
    expect(p).toContain("Prefeitura Municipal de Picos</span>");
  });

  it("o texto puro sai do mesmo HTML, sem a prévia e sem enfeite", () => {
    const t = textoDoHtml(html);
    expect(t).not.toContain("Texto de prévia");
    expect(t).not.toMatch(/<\/?(p|td|tr|table|strong|a|div|h1|h2)\b/);
    expect(t).not.toContain("&lt;");
    expect(t).toContain("Nome <script>alert(1)</script>");
    expect(t).toContain("Protocolo: P123");
    expect(t).toContain("• um");
    expect(t).toContain("Abrir (https://x.test/a?b=1&c=2)");
    expect(t).toContain("Outro → (https://x.test/o)");
    expect(t).toContain("Atenciosamente,\nEquipe CidadeIA");
    expect(t).not.toMatch(/\n{3,}/);
  });

  it("parágrafos do usuário viram <p>, escapados", () => {
    expect(paragrafosDe("a\n\n<b>b</b>\nc").valor).toMatch(/<p[^>]*>a<\/p><p[^>]*>&lt;b&gt;b&lt;\/b&gt;<br>c<\/p>/);
  });

  it("saudação pelo primeiro nome", () => {
    expect(saudacao("Maria das Graças")).toBe("Olá, Maria.");
    expect(saudacao(null)).toBe("Olá.");
    expect(saudacao("  ")).toBe("Olá.");
  });
});

describe("o remetente da Resend", () => {
  it("ganha nome quando a variável só tem o endereço", () => {
    expect(comNome("onboarding@resend.dev", "CidadeIA")).toBe("CidadeIA <onboarding@resend.dev>");
    expect(comNome("Fulano <x@y.com>", "CidadeIA")).toBe("Fulano <x@y.com>");
    expect(comNome("x@y.com", 'Prefeitura de "Picos" via CidadeIA')).toBe("Prefeitura de Picos via CidadeIA <x@y.com>");
  });
});
