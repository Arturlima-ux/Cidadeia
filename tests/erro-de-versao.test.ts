import { describe, it, expect, beforeEach, vi } from "vitest";
import { ehErroDeVersao, recarregarPorVersao } from "@/lib/erro-de-versao";

// Este erro aparece quando uma aba fica aberta durante um deploy: os pedaços
// de JavaScript mudam de nome e os antigos somem. O código está certo dos dois
// lados — só desencontrado no tempo.
//
// O que o torna grave é a reação. "Tentar de novo" remonta o MESMO bundle
// quebrado e falha igual, para sempre; o usuário conclui que o sistema caiu.
// Estes testes existem para o reconhecimento não silenciar quando alguém mexer
// na lista de mensagens.

describe("reconhecimento", () => {
  it("pega o nome que o Chrome usa", () => {
    const e = new Error("Loading chunk 42 failed.");
    e.name = "ChunkLoadError";
    expect(ehErroDeVersao(e)).toBe(true);
  });

  it("pega as frases de Firefox e Safari", () => {
    // Nenhum navegador expõe uma classe estável para isto, e cada um escreve
    // de um jeito. Casar pelo texto é frágil por natureza — daí a lista ampla.
    const frases = [
      "Failed to fetch dynamically imported module: https://x/_next/static/chunk.js",
      "error loading dynamically imported module",
      "Importing a module script failed.",
      "Unable to preload CSS for /_next/static/css/abc.css",
      "Loading CSS chunk 7 failed",
    ];
    for (const f of frases) {
      expect(ehErroDeVersao(new Error(f)), f).toBe(true);
    }
  });

  it("ignora maiúsculas e minúsculas", () => {
    expect(ehErroDeVersao(new Error("LOADING CHUNK 3 FAILED"))).toBe(true);
  });

  it("não confunde erro comum com erro de versão", () => {
    // Um falso positivo aqui recarrega a página em vez de mostrar o problema,
    // e o usuário entra num ciclo de recargas sem nunca ler o erro real.
    expect(ehErroDeVersao(new Error("Sessão expirada"))).toBe(false);
    expect(ehErroDeVersao(new Error("connect ETIMEDOUT"))).toBe(false);
    expect(ehErroDeVersao(null)).toBe(false);
    expect(ehErroDeVersao(undefined)).toBe(false);
  });
});

describe("recarga", () => {
  const recarregar = vi.fn();

  beforeEach(() => {
    recarregar.mockClear();
    const guardado = new Map<string, string>();
    vi.stubGlobal("window", {
      location: { reload: recarregar },
      sessionStorage: {
        getItem: (k: string) => guardado.get(k) ?? null,
        setItem: (k: string, v: string) => void guardado.set(k, v),
      },
    });
  });

  it("recarrega na primeira vez", () => {
    expect(recarregarPorVersao()).toBe(true);
    expect(recarregar).toHaveBeenCalledOnce();
  });

  it("não recarrega duas vezes seguidas", () => {
    // A trava é o que separa "resolver" de "laço infinito de recargas". Se a
    // falha não for de versão e ainda assim casar com a lista, sem isto o
    // usuário nunca consegue ler a tela nem clicar em nada.
    recarregarPorVersao();
    expect(recarregarPorVersao()).toBe(false);
    expect(recarregar).toHaveBeenCalledOnce();
  });

  it("desiste quando o armazenamento está bloqueado", () => {
    // Aba anônima ou política do sistema. Sem poder gravar a trava não dá para
    // garantir uma recarga só — e um laço infinito é pior que a tela de erro.
    // Melhor devolver o controle ao usuário, pelo botão.
    vi.stubGlobal("window", {
      location: { reload: recarregar },
      sessionStorage: {
        getItem: () => {
          throw new Error("acesso negado");
        },
        setItem: () => {
          throw new Error("acesso negado");
        },
      },
    });
    expect(recarregarPorVersao()).toBe(false);
    expect(recarregar).not.toHaveBeenCalled();
  });

  it("no servidor não faz nada", () => {
    vi.stubGlobal("window", undefined);
    expect(recarregarPorVersao()).toBe(false);
  });
});
