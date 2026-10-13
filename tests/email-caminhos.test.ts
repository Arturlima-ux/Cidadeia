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

  it("nenhum caminho entrega: o e-mail do cliente vai para a caixa de saída", async () => {
    process.env.RESEND_API_KEY = "re_x";
    process.env.RESEND_FROM_EMAIL = "CidadeIA <onboarding@resend.dev>";
    delete process.env.SMTP_USUARIO;
    vi.stubGlobal("fetch", async () => new Response("recusado", { status: 403 }));
    const r = await enviarEmail({ para: "secretaria@picos.pi.gov.br", assunto: "Proposta", html: "<p>Oi</p>", pedidoId: "prop_1234" });
    expect(r.enviado).toBe(false);
    expect(guardados).toHaveLength(1);
    expect(guardados[0]).toMatchObject({ para: "secretaria@picos.pi.gov.br", pedidoId: "prop_1234" });
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
