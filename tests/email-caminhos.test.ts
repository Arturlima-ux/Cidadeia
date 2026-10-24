import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const enviados: unknown[] = [];
const guardados: unknown[] = [];
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail: async (m: unknown) => { enviados.push(m); return {}; } }) },
  createTransport: () => ({ sendMail: async (m: unknown) => { enviados.push(m); return {}; } }),
}));
vi.mock("@/lib/caixa-de-saida", () => ({ guardarNaCaixaDeSaida: async (e: unknown) => { guardados.push(e); } }));

import { enviarEmail } from "@/lib/email";
import { htmlParaTexto, linkRascunhoGmail } from "../src/lib/caixa-de-saida-texto";

const ENV = { ...process.env };
beforeEach(() => {
  enviados.length = 0;
  guardados.length = 0;
});
afterEach(() => {
  process.env = { ...ENV };
  vi.unstubAllGlobals();
});

describe("envio de e-mail", () => {
  it("Resend recusa (sem domínio) e o Gmail entrega", async () => {
    process.env.RESEND_API_KEY = "re_x";
    process.env.RESEND_FROM_EMAIL = "CidadeIA <onboarding@resend.dev>";
    process.env.SMTP_USUARIO = "equipe@gmail.com";
    process.env.SMTP_SENHA = "abcd efgh ijkl mnop";
    vi.stubGlobal("fetch", async () => new Response("You can only send testing emails to your own email address", { status: 403 }));
    const r = await enviarEmail({ para: "secretaria@picos.pi.gov.br", assunto: "Proposta", html: "<p>Oi</p>" });
    expect(r.enviado).toBe(true);
    expect(enviados).toHaveLength(1);
    expect(guardados).toHaveLength(0);
  });

  it("sem domínio na Resend, o Gmail vai primeiro, inclusive para a equipe", async () => {
    process.env.RESEND_API_KEY = "re_x";
    process.env.RESEND_FROM_EMAIL = "onboarding@resend.dev";
    process.env.SMTP_USUARIO = "equipe@gmail.com";
    process.env.SMTP_SENHA = "abcd";
    let chamouResend = false;
    vi.stubGlobal("fetch", async () => {
      chamouResend = true;
      return new Response("{}", { status: 200 });
    });
    const r = await enviarEmail({ para: "arturmlo2005@gmail.com", assunto: "Teste", html: "<p>x</p>" });
    expect(r.enviado).toBe(true);
    expect(enviados).toHaveLength(1);
    expect(chamouResend).toBe(false);
  });

  it("com domínio próprio na Resend, ela vai primeiro", async () => {
    process.env.RESEND_API_KEY = "re_x";
    process.env.RESEND_FROM_EMAIL = "CidadeIA <contato@cidadeia.app.br>";
    process.env.SMTP_USUARIO = "equipe@gmail.com";
    process.env.SMTP_SENHA = "abcd";
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 200 }));
    const r = await enviarEmail({ para: "x@picos.pi.gov.br", assunto: "Teste", html: "<p>x</p>" });
    expect(r.enviado).toBe(true);
    expect(enviados).toHaveLength(0);
  });

  it("nenhum caminho entrega: o e-mail comercial que pediu cópia vai para a caixa de saída", async () => {
    process.env.RESEND_API_KEY = "re_x";
    process.env.RESEND_FROM_EMAIL = "CidadeIA <onboarding@resend.dev>";
    delete process.env.SMTP_USUARIO;
    vi.stubGlobal("fetch", async () => new Response("recusado", { status: 403 }));
    const r = await enviarEmail({ para: "secretaria@picos.pi.gov.br", assunto: "Proposta", html: "<p>Oi</p>", pedidoId: "prop_1234", guardarNaCaixaDeSaida: true });
    expect(r.enviado).toBe(false);
    expect(guardados).toHaveLength(1);
    expect(guardados[0]).toMatchObject({ para: "secretaria@picos.pi.gov.br", pedidoId: "prop_1234" });
  });

  it("sem pedir, nada é guardado: remetente novo nasce sem cópia para a equipe", async () => {
    process.env.RESEND_API_KEY = "re_x";
    process.env.RESEND_FROM_EMAIL = "CidadeIA <onboarding@resend.dev>";
    delete process.env.SMTP_USUARIO;
    vi.stubGlobal("fetch", async () => new Response("recusado", { status: 403 }));
    const r = await enviarEmail({ para: "fulano@exemplo.com.br", assunto: "Qualquer coisa", html: "<p>Oi</p>" });
    expect(r.enviado).toBe(false);
    expect(guardados).toHaveLength(0);
  });

  it("código de login, troca de senha e ouvidoria não vão para a caixa de saída da equipe", async () => {
    // A caixa de saída é lida em /admin/saida pela equipe do CidadeIA. Um
    // código de login guardado ali deixa quem lê entrar na conta do outro; a
    // resposta da ouvidoria carrega e-mail e texto do cidadão.
    process.env.RESEND_API_KEY = "re_x";
    process.env.RESEND_FROM_EMAIL = "CidadeIA <onboarding@resend.dev>";
    delete process.env.SMTP_USUARIO;
    vi.stubGlobal("fetch", async () => new Response("recusado", { status: 403 }));
    const r = await enviarEmail({
      para: "cidada@exemplo.com",
      assunto: "CidadeIA: seu código de acesso é 123456",
      html: "<p>123456</p>",
      guardarNaCaixaDeSaida: false,
    });
    expect(r.enviado).toBe(false);
    expect(guardados).toHaveLength(0);
  });

  it("quem manda segredo ou dado do cidadão desliga a caixa de saída", async () => {
    const { readFileSync } = await import("node:fs");
    const semComentario = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const arquivo of [
      "src/lib/ouvidoria-avisos-servidor.ts",
      "src/app/login/actions.ts",
      "src/app/login/esqueci-senha/actions.ts",
    ]) {
      const codigo = semComentario(readFileSync(arquivo, "utf8"));
      const chamadas = codigo.match(/enviarEmail\(/g)?.length ?? 0;
      const desligadas = codigo.match(/guardarNaCaixaDeSaida: false/g)?.length ?? 0;
      expect(chamadas, arquivo).toBeGreaterThan(0);
      expect(desligadas, arquivo).toBe(chamadas);
    }
  });

  it("e-mail para a própria equipe não vai para a caixa de saída", async () => {
    process.env.RESEND_API_KEY = "re_x";
    process.env.RESEND_FROM_EMAIL = "x@resend.dev";
    vi.stubGlobal("fetch", async () => new Response("erro", { status: 500 }));
    await enviarEmail({ para: "arturmlo2005@gmail.com", assunto: "Resumo", html: "<p>x</p>" });
    expect(guardados).toHaveLength(0);
  });
});

describe("caixa de saída", () => {
  it("transforma o HTML em texto com os links por extenso", () => {
    const t = htmlParaTexto('<p>Olá, Ana.</p><ul><li>RGF <a href="https://x/k">abrir o kit</a></li></ul><p>A &amp; B</p>');
    expect(t).toBe("Olá, Ana.\n- RGF abrir o kit (https://x/k)\nA & B");
  });

  it("monta o rascunho do Gmail com destinatário e assunto", () => {
    const l = linkRascunhoGmail({ para: "a@b.gov.br", assunto: "Proposta Picos", texto: "Oi" });
    expect(l).toContain("mail.google.com");
    expect(l).toContain("to=a%40b.gov.br");
    expect(l).toContain("su=Proposta+Picos");
  });
});
