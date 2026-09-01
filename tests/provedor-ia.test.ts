import { describe, it, expect, afterEach, vi } from "vitest";
import { provedorIA, MODELO_ANTHROPIC_PADRAO, ESFORCO_PADRAO } from "@/lib/provedor-ia";

// Nenhum teste aqui chama API de verdade: os caminhos da Anthropic exercitados
// são só os de configuração (que retornam antes de qualquer requisição) e o
// provedor compatível com OpenAI roda contra um `fetch` substituído. Além de
// não gastar dinheiro, isso mantém a suíte rodando offline.

const VARIAVEIS = [
  "IA_PROVEDOR",
  "IA_MODELO",
  "IA_BASE_URL",
  "IA_API_KEY",
  "IA_TIMEOUT_MS",
  "ANTHROPIC_API_KEY",
] as const;

const ORIGINAIS = Object.fromEntries(
  VARIAVEIS.map((nome) => [nome, process.env[nome]])
) as Record<(typeof VARIAVEIS)[number], string | undefined>;

function definir(valores: Partial<Record<(typeof VARIAVEIS)[number], string>>) {
  for (const nome of VARIAVEIS) delete process.env[nome];
  for (const [nome, valor] of Object.entries(valores)) process.env[nome] = valor;
}

/** `fetch` que falha o teste se for chamado — é assim que se prova que um
 * caminho de erro de configuração nunca chegou a sair da máquina. */
function fetchProibido() {
  const espiao = vi.fn((_url: string, _init: RequestInit) => {
    throw new Error("nenhuma chamada de rede deveria acontecer aqui");
  });
  vi.stubGlobal("fetch", espiao);
  return espiao;
}

/** Resposta bem-formada no formato OpenAI, com o texto que se quiser. Os
 * parâmetros são declarados só para que `mock.calls` venha tipado. */
function fetchRespondendo(texto: string | null) {
  const espiao = vi.fn((_url: string, _init: RequestInit) =>
    Promise.resolve(Response.json({ choices: [{ message: { content: texto } }] }))
  );
  vi.stubGlobal("fetch", espiao);
  return espiao;
}

afterEach(() => {
  vi.unstubAllGlobals();
  for (const nome of VARIAVEIS) {
    delete process.env[nome];
    if (ORIGINAIS[nome] !== undefined) process.env[nome] = ORIGINAIS[nome];
  }
});

describe("seleção do provedor", () => {
  it("fica desligado quando IA_PROVEDOR não está definida", () => {
    definir({});
    expect(provedorIA().nome).toBe("nenhum");
  });

  it("não liga a IA só porque existe ANTHROPIC_API_KEY", () => {
    // Mudança de comportamento consciente na migração: a chave sozinha não
    // basta mais, IA_PROVEDOR precisa ser explícita.
    definir({ ANTHROPIC_API_KEY: "sk-ant-teste" });
    expect(provedorIA().nome).toBe("nenhum");
  });

  it("escolhe a Anthropic quando pedido", () => {
    definir({ IA_PROVEDOR: "anthropic", ANTHROPIC_API_KEY: "sk-ant-teste" });
    expect(provedorIA().nome).toBe("anthropic");
  });

  it("escolhe o endpoint compatível com OpenAI quando pedido", () => {
    definir({
      IA_PROVEDOR: "compativel-openai",
      IA_BASE_URL: "http://localhost:11434/v1",
      IA_MODELO: "llama3.1",
    });
    expect(provedorIA().nome).toBe("compativel-openai");
  });

  it("aceita variável com espaço em volta e caixa alta", () => {
    // O campo da Vercel é textarea e copiar/colar traz espaço junto.
    definir({ IA_PROVEDOR: "  ANTHROPIC \n", ANTHROPIC_API_KEY: "sk-ant-teste" });
    expect(provedorIA().nome).toBe("anthropic");
  });

  it("cai no desligado quando o valor é vazio ou desconhecido", () => {
    definir({ IA_PROVEDOR: "   ", ANTHROPIC_API_KEY: "sk-ant-teste" });
    expect(provedorIA().nome).toBe("nenhum");
    definir({ IA_PROVEDOR: "gemini", ANTHROPIC_API_KEY: "sk-ant-teste" });
    expect(provedorIA().nome).toBe("nenhum");
  });
});

describe("modelo resolvido", () => {
  it("usa Opus 5 por padrão na Anthropic", () => {
    definir({ IA_PROVEDOR: "anthropic", ANTHROPIC_API_KEY: "sk-ant-teste" });
    expect(provedorIA().modelo).toBe("claude-opus-5");
    expect(MODELO_ANTHROPIC_PADRAO).toBe("claude-opus-5");
  });

  it("deixa IA_MODELO sobrescrever o padrão", () => {
    definir({
      IA_PROVEDOR: "anthropic",
      ANTHROPIC_API_KEY: "sk-ant-teste",
      IA_MODELO: "claude-sonnet-5",
    });
    expect(provedorIA().modelo).toBe("claude-sonnet-5");
  });
});

describe("effort por tipo de chamada", () => {
  it("gasta onde a pergunta é aberta e economiza onde a tarefa é mecânica", () => {
    // O chat é o único ponto em que a resposta vira decisão de gestão; o
    // insight roda a cada abertura de tela e é o de maior volume.
    expect(ESFORCO_PADRAO.chat).toBe("high");
    expect(ESFORCO_PADRAO.insight).toBe("low");
    expect(ESFORCO_PADRAO.sugestaoAlertas).toBe("medium");
  });
});

describe("provedor nenhum", () => {
  it("recusa dizendo qual variável falta, sem tocar na rede", async () => {
    const espiao = fetchProibido();
    definir({});

    const provedor = provedorIA();
    const r = await provedor.conversar({
      sistema: "prompt",
      mensagens: [{ papel: "user", texto: "e aí?" }],
      maxTokens: 100,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("IA_PROVEDOR");
    expect(provedor.modelo).toBeNull();
    expect(espiao).not.toHaveBeenCalled();
  });
});

describe("configuração incompleta", () => {
  it("Anthropic sem chave aponta ANTHROPIC_API_KEY", async () => {
    const espiao = fetchProibido();
    definir({ IA_PROVEDOR: "anthropic" });

    const r = await provedorIA().conversar({
      sistema: "prompt",
      mensagens: [{ papel: "user", texto: "e aí?" }],
      maxTokens: 100,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("ANTHROPIC_API_KEY");
    expect(espiao).not.toHaveBeenCalled();
  });

  it("endpoint OpenAI sem IA_BASE_URL aponta IA_BASE_URL", async () => {
    const espiao = fetchProibido();
    definir({ IA_PROVEDOR: "compativel-openai", IA_MODELO: "llama3.1" });

    const r = await provedorIA().conversar({
      sistema: "prompt",
      mensagens: [{ papel: "user", texto: "e aí?" }],
      maxTokens: 100,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("IA_BASE_URL");
    expect(espiao).not.toHaveBeenCalled();
  });

  it("endpoint OpenAI sem IA_MODELO aponta IA_MODELO", async () => {
    const espiao = fetchProibido();
    definir({ IA_PROVEDOR: "compativel-openai", IA_BASE_URL: "http://localhost:11434/v1" });

    const r = await provedorIA().conversar({
      sistema: "prompt",
      mensagens: [{ papel: "user", texto: "e aí?" }],
      maxTokens: 100,
    });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("IA_MODELO");
    expect(espiao).not.toHaveBeenCalled();
  });
});

describe("requisição montada para a Anthropic", () => {
  // O SDK da Anthropic usa o `fetch` global, então substituí-lo intercepta a
  // requisição inteira sem mockar o módulo e sem sair da máquina.
  function fetchAnthropic() {
    const espiao = vi.fn((_url: string, _init: RequestInit) =>
      Promise.resolve(
        Response.json({
          id: "msg_teste",
          type: "message",
          role: "assistant",
          model: "claude-opus-5",
          content: [{ type: "text", text: "resposta" }],
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 5 },
        })
      )
    );
    vi.stubGlobal("fetch", espiao);
    return espiao;
  }

  async function corpoEnviado(maxTokens: number, esforco?: "low" | "medium" | "high") {
    const espiao = fetchAnthropic();
    definir({ IA_PROVEDOR: "anthropic", ANTHROPIC_API_KEY: "sk-ant-teste" });

    const r = await provedorIA().conversar({
      sistema: "REGRAS: use só os dados reais.",
      mensagens: [{ papel: "user", texto: "Qual o saldo?" }],
      maxTokens,
      esforco,
    });

    expect(r).toEqual({ ok: true, texto: "resposta" });
    return JSON.parse(String(espiao.mock.calls[0][1].body));
  }

  it("marca o bloco de sistema para cache — é o que corta a maior parte da conta", async () => {
    const corpo = await corpoEnviado(800, "high");
    expect(corpo.system).toEqual([
      {
        type: "text",
        text: "REGRAS: use só os dados reais.",
        cache_control: { type: "ephemeral" },
      },
    ]);
  });

  it("manda thinking adaptativo, nunca budget_tokens (removido no Opus 5)", async () => {
    const corpo = await corpoEnviado(800, "high");
    expect(corpo.thinking).toEqual({ type: "adaptive" });
    expect(corpo.thinking).not.toHaveProperty("budget_tokens");
    expect(corpo.model).toBe("claude-opus-5");
  });

  it("repassa o effort pedido em output_config", async () => {
    expect((await corpoEnviado(300, "low")).output_config).toEqual({ effort: "low" });
    expect((await corpoEnviado(1500, "medium")).output_config).toEqual({ effort: "medium" });
  });

  it("usa effort high quando nada é pedido, igual ao padrão da API", async () => {
    expect((await corpoEnviado(800)).output_config).toEqual({ effort: "high" });
  });

  it("levanta max_tokens baixo demais para caber raciocínio e resposta", async () => {
    // Com thinking ligado, os 300 do insight se esgotariam antes da primeira
    // frase e a chamada voltaria sem bloco de texto — insight sumindo da tela
    // sem erro nenhum aparecer.
    expect((await corpoEnviado(300)).max_tokens).toBe(2048);
    // Teto já folgado passa intacto.
    expect((await corpoEnviado(4000)).max_tokens).toBe(4000);
  });
});

describe("provedor compatível com OpenAI", () => {
  function configurar(extra: Partial<Record<(typeof VARIAVEIS)[number], string>> = {}) {
    definir({
      IA_PROVEDOR: "compativel-openai",
      IA_BASE_URL: "http://localhost:11434/v1",
      IA_MODELO: "llama3.1",
      ...extra,
    });
  }

  const pedido = {
    sistema: "REGRAS: use só os dados reais.",
    mensagens: [{ papel: "user" as const, texto: "Qual o saldo?" }],
    maxTokens: 800,
  };

  it("manda o prompt de sistema como primeira mensagem e devolve o texto", async () => {
    const espiao = fetchRespondendo("O saldo é positivo.");
    configurar();

    const r = await provedorIA().conversar(pedido);

    expect(r).toEqual({ ok: true, texto: "O saldo é positivo." });
    const [url, init] = espiao.mock.calls[0];
    expect(url).toBe("http://localhost:11434/v1/chat/completions");
    const corpo = JSON.parse(String(init.body));
    expect(corpo.model).toBe("llama3.1");
    expect(corpo.max_tokens).toBe(800);
    expect(corpo.messages).toEqual([
      { role: "system", content: "REGRAS: use só os dados reais." },
      { role: "user", content: "Qual o saldo?" },
    ]);
  });

  it("ignora o effort em vez de inventar um campo que o servidor rejeitaria", async () => {
    const espiao = fetchRespondendo("ok");
    configurar();

    await provedorIA().conversar({ ...pedido, esforco: "low" });

    const corpo = JSON.parse(String(espiao.mock.calls[0][1].body));
    expect(corpo).not.toHaveProperty("output_config");
    expect(corpo).not.toHaveProperty("effort");
  });

  it("não deixa barra dupla quando IA_BASE_URL termina com barra", async () => {
    const espiao = fetchRespondendo("ok");
    configurar({ IA_BASE_URL: "http://localhost:11434/v1//" });

    await provedorIA().conversar(pedido);

    expect(espiao.mock.calls[0][0]).toBe("http://localhost:11434/v1/chat/completions");
  });

  it("omite o Authorization quando não há IA_API_KEY", async () => {
    // Ollama local responde 401 se receber um Bearer vazio.
    const espiao = fetchRespondendo("ok");
    configurar();

    await provedorIA().conversar(pedido);

    const init = espiao.mock.calls[0][1];
    expect(init.headers).not.toHaveProperty("authorization");
  });

  it("manda o Bearer quando IA_API_KEY existe", async () => {
    const espiao = fetchRespondendo("ok");
    configurar({ IA_API_KEY: "chave-do-provedor" });

    await provedorIA().conversar(pedido);

    const init = espiao.mock.calls[0][1];
    expect(init.headers).toMatchObject({ authorization: "Bearer chave-do-provedor" });
  });

  it("traduz credencial recusada apontando IA_API_KEY", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no key", { status: 401 })));
    configurar();

    const r = await provedorIA().conversar(pedido);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("IA_API_KEY");
  });

  it("não vaza detalhe de erro do servidor para o gestor", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("stack trace interna", { status: 500 }))
    );
    configurar();

    const r = await provedorIA().conversar(pedido);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).not.toContain("stack trace");
  });

  it("recusa corpo fora do formato esperado em vez de confiar nele", async () => {
    // Proxy mal configurado devolvendo HTML com status 200 é o caso real.
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ erro: "sei lá" })));
    configurar();

    const r = await provedorIA().conversar(pedido);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("formato inesperado");
  });

  it("trata resposta sem texto como falha, não como resposta vazia", async () => {
    fetchRespondendo(null);
    configurar();

    const r = await provedorIA().conversar(pedido);

    expect(r.ok).toBe(false);
  });

  it("nem chega a sair da máquina quando não há pergunta", async () => {
    const espiao = fetchProibido();
    configurar();

    const r = await provedorIA().conversar({ ...pedido, mensagens: [] });

    expect(r.ok).toBe(false);
    expect(espiao).not.toHaveBeenCalled();
  });

  it("traduz falha de rede sem deixar a exceção escapar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      })
    );
    configurar();

    const r = await provedorIA().conversar(pedido);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain("IA_BASE_URL");
  });
});
