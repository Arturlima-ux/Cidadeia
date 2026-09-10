import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { enviarEmail } from "@/lib/email";

// ── POR QUE ESTE ARQUIVO EXISTE ──
// As três maneiras de o e-mail não sair chegavam à tela como uma frase só, e
// a frase nomeava apenas uma delas: "o envio não está configurado". Com a
// chave certa e o provedor recusando, a tela acusava configuração faltando —
// mandando procurar o problema onde ele não estava. O que estes testes
// travam é a DISTINÇÃO entre as causas, não o texto de cada uma.

const CARTA = { para: "alguem@exemplo.gov.br", assunto: "Teste", html: "<p>oi</p>" };

describe("enviarEmail", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sem chave configurada, aponta o servidor", async () => {
    const r = await enviarEmail(CARTA);
    expect(r.enviado).toBe(false);
    if (!r.enviado) expect(r.causa).toBe("nao-configurado");
  });

  it("faltando só o remetente, ainda é falta de configuração", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_qualquer_coisa");
    const r = await enviarEmail(CARTA);
    expect(r.enviado).toBe(false);
    if (!r.enviado) expect(r.causa).toBe("nao-configurado");
  });

  it("provedor recusando NÃO é reportado como falta de configuração", async () => {
    // É o caso real do plano gratuito: com remetente sem domínio próprio, a
    // Resend só entrega para o dono da conta e devolve 403 para os demais.
    vi.stubEnv("RESEND_API_KEY", "re_qualquer_coisa");
    vi.stubEnv("RESEND_FROM_EMAIL", "onboarding@resend.dev");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("forbidden", { status: 403 }))
    );

    const r = await enviarEmail(CARTA);
    expect(r.enviado).toBe(false);
    if (!r.enviado) expect(r.causa).toBe("falha-no-envio");
  });

  it("rede caindo também é falha de envio, não de configuração", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_qualquer_coisa");
    vi.stubEnv("RESEND_FROM_EMAIL", "onboarding@resend.dev");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("getaddrinfo ENOTFOUND api.resend.com");
      })
    );

    const r = await enviarEmail(CARTA);
    expect(r.enviado).toBe(false);
    if (!r.enviado) expect(r.causa).toBe("falha-no-envio");
  });

  it("envio aceito não devolve causa nenhuma", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_qualquer_coisa");
    vi.stubEnv("RESEND_FROM_EMAIL", "onboarding@resend.dev");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ id: "abc" }, { status: 200 }))
    );

    expect(await enviarEmail(CARTA)).toEqual({ enviado: true });
  });

  it("nunca deixa a chave vazar no motivo mostrado ao usuário", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_segredo_que_nao_pode_aparecer");
    vi.stubEnv("RESEND_FROM_EMAIL", "onboarding@resend.dev");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("invalid api key: re_segredo_que_nao_pode_aparecer", { status: 401 }))
    );

    const r = await enviarEmail(CARTA);
    expect(r.enviado).toBe(false);
    if (!r.enviado) expect(r.motivo).not.toContain("re_segredo");
  });
});
