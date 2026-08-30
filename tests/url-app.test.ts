import { describe, it, expect, afterEach } from "vitest";
import { urlApp, linkApp } from "@/lib/url-app";

const ORIGINAIS = {
  APP_URL: process.env.APP_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

function definir(valores: { APP_URL?: string; NEXT_PUBLIC_APP_URL?: string }) {
  delete process.env.APP_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
  if (valores.APP_URL !== undefined) process.env.APP_URL = valores.APP_URL;
  if (valores.NEXT_PUBLIC_APP_URL !== undefined) {
    process.env.NEXT_PUBLIC_APP_URL = valores.NEXT_PUBLIC_APP_URL;
  }
}

afterEach(() => {
  delete process.env.APP_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
  if (ORIGINAIS.APP_URL !== undefined) process.env.APP_URL = ORIGINAIS.APP_URL;
  if (ORIGINAIS.NEXT_PUBLIC_APP_URL !== undefined) {
    process.env.NEXT_PUBLIC_APP_URL = ORIGINAIS.NEXT_PUBLIC_APP_URL;
  }
});

describe("endereço público da aplicação", () => {
  it("usa APP_URL quando definida", () => {
    definir({ APP_URL: "https://cidadeia.vercel.app" });
    expect(urlApp()).toBe("https://cidadeia.vercel.app");
  });

  it("ainda aceita o nome antigo, para não quebrar ambiente já configurado", () => {
    definir({ NEXT_PUBLIC_APP_URL: "https://antigo.example.com" });
    expect(urlApp()).toBe("https://antigo.example.com");
  });

  it("prefere APP_URL quando as duas existem", () => {
    definir({ APP_URL: "https://novo.example.com", NEXT_PUBLIC_APP_URL: "https://antigo.example.com" });
    expect(urlApp()).toBe("https://novo.example.com");
  });

  it("cai no localhost quando nenhuma está definida", () => {
    definir({});
    expect(urlApp()).toBe("http://localhost:3000");
  });

  it("trata variável vazia como não definida", () => {
    // Foi exatamente esse o estado em produção: a variável existia, mas sem
    // valor — e o e-mail saía apontando para localhost.
    definir({ APP_URL: "" });
    expect(urlApp()).toBe("http://localhost:3000");
    definir({ APP_URL: "   " });
    expect(urlApp()).toBe("http://localhost:3000");
  });

  it("remove espaço e quebra de linha coladas no valor", () => {
    // O campo da Vercel é textarea: dá para salvar com Enter no fim sem notar.
    definir({ APP_URL: "https://cidadeia.vercel.app\n" });
    expect(urlApp()).toBe("https://cidadeia.vercel.app");
  });

  it("remove barra no fim, para o link não sair com barra dupla", () => {
    definir({ APP_URL: "https://cidadeia.vercel.app/" });
    expect(urlApp()).toBe("https://cidadeia.vercel.app");
    definir({ APP_URL: "https://cidadeia.vercel.app///" });
    expect(urlApp()).toBe("https://cidadeia.vercel.app");
  });
});

describe("montagem do link", () => {
  it("junta base e caminho com uma barra só", () => {
    definir({ APP_URL: "https://cidadeia.vercel.app/" });
    expect(linkApp("/login/redefinir-senha?token=abc")).toBe(
      "https://cidadeia.vercel.app/login/redefinir-senha?token=abc"
    );
  });

  it("aceita caminho sem barra inicial", () => {
    definir({ APP_URL: "https://cidadeia.vercel.app" });
    expect(linkApp("dashboard/alertas")).toBe("https://cidadeia.vercel.app/dashboard/alertas");
  });

  it("preserva a query string inteira", () => {
    definir({ APP_URL: "https://cidadeia.vercel.app" });
    expect(linkApp("/x?a=1&b=2")).toBe("https://cidadeia.vercel.app/x?a=1&b=2");
  });
});
