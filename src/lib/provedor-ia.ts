// ── DE ONDE VEM A IA ──
//
// Até aqui o código só sabia falar com a Anthropic. Como o único caminho era
// esse, "não ter dinheiro para pagar a API" virava "não ter IA nenhuma" — e a
// Central de IA, os insights por secretaria e as sugestões de alerta caíam
// juntos. Esta camada existe só para separar "qual modelo responde" de "o que
// o produto pergunta", para que trocar de backend seja mudar variável de
// ambiente, e não reescrever regra de negócio.
//
// VARIÁVEIS DE AMBIENTE
//
//   IA_PROVEDOR        "anthropic" | "compativel-openai" | "nenhum"
//                      Padrão: "nenhum". O padrão é desligado de propósito:
//                      um ambiente mal configurado deve falhar dizendo o que
//                      falta, nunca mandar dado de cidadão para um endpoint
//                      que ninguém revisou. ATENÇÃO na migração: só ter
//                      ANTHROPIC_API_KEY no .env não liga mais a IA — é
//                      preciso definir IA_PROVEDOR=anthropic também.
//
//   IA_MODELO          Nome do modelo. Sem valor, o provedor "anthropic" usa
//                      claude-opus-5; "compativel-openai" exige o nome
//                      explícito (não há padrão razoável para um endpoint
//                      arbitrário). Se você trocar o modelo da Anthropic aqui,
//                      escolha um que aceite thinking adaptativo e
//                      `output_config.effort` (família Opus 5 / Sonnet 5 para
//                      cima) — modelo anterior a isso recusa a requisição com
//                      400, e a mensagem de erro aponta esta variável.
//
//   IA_TIMEOUT_MS      Teto de espera do provedor "compativel-openai".
//                      Padrão: 60000. `fetch` não tem timeout próprio, e um
//                      modelo local numa máquina fraca trava a server action
//                      indefinidamente sem isto.
//
//   ANTHROPIC_API_KEY  Chave da Anthropic (provedor "anthropic").
//
//   IA_BASE_URL        Base do endpoint OpenAI-compatível, INCLUINDO o /v1 —
//                      ex.: http://localhost:11434/v1 (Ollama) ou
//                      http://localhost:1234/v1 (LM Studio). O caminho não é
//                      adivinhado porque provedores alternativos usam prefixos
//                      diferentes.
//
//   IA_API_KEY         Chave do endpoint OpenAI-compatível. Opcional: modelo
//                      local rodando na própria máquina normalmente não pede.
//
// ── LGPD: LEIA ANTES DE APONTAR ISTO PARA QUALQUER LUGAR ──
//
// O contexto que sobe para o modelo carrega dado pessoal e dado pessoal
// SENSÍVEL de cidadão: denúncia de ouvidoria (que identifica denunciante e
// denunciado) e informação de saúde vinda das unidades. Na Lei 13.709/2018 o
// município é CONTROLADOR e quem processa esse dado é OPERADOR — o que exige
// contrato, finalidade determinada e vedação de uso para outra coisa.
//
// Consequência prática: camada gratuita que treina modelo em cima do que você
// envia é INCOMPATÍVEL com este produto, por mais tentador que seja o preço.
// Treinar é uso para finalidade própria do fornecedor, fora do contrato do
// município — e não tem como desfazer depois que o dado entrou no modelo.
// Antes de preencher IA_BASE_URL, confirme que o destino tem retenção zero (ou
// contratualmente limitada) e não usa a entrada para treino. Modelo rodando na
// infraestrutura do próprio município é o caminho seguro por construção; API
// paga com essa cláusula no contrato também serve. O resto, não.

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
// Tipos importados de ia.ts de propósito, e só como tipo (o `import type` é
// apagado na compilação, então não cria dependência circular em runtime): o
// contrato de erro precisa ser exatamente o mesmo que a UI já sabe tratar.
// Quando ia.ts passar a usar esta camada, a definição deveria mudar de casa
// para cá e ia.ts reexportá-la — aí a seta aponta para o lado certo.
import type { MensagemChat, RespostaIA } from "@/lib/ia";

export type { MensagemChat, RespostaIA };

export type NomeProvedor = "anthropic" | "compativel-openai" | "nenhum";

/**
 * Modelo padrão da Anthropic para as chamadas deste produto.
 *
 * Decisão do dono do produto: o melhor modelo disponível, com a diferença de
 * custo analisada e aceita. O botão de custo aqui é o `esforco` abaixo, não a
 * troca de modelo — ajustar effort por tipo de chamada preserva a qualidade
 * onde ela vira decisão de gestão e economiza onde a tarefa é mecânica.
 */
export const MODELO_ANTHROPIC_PADRAO = "claude-opus-5";

const TIMEOUT_PADRAO_MS = 60_000;

/** Níveis aceitos por `output_config.effort`. */
export type EsforcoIA = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * Effort recomendado por tipo de chamada. Fica aqui, e não espalhado nos
 * pontos de chamada, para que a conta do mês seja ajustável em um lugar só.
 *
 * - `chat`: a Central de IA é o único ponto em que a pergunta é aberta — o
 *   prefeito cruza financeiro, obras e alertas na mesma frase e a resposta
 *   vira decisão de gestão. É onde raciocínio raso custa caro de verdade, e
 *   `high` já é o padrão da API: não se economiza aqui.
 * - `insight`: 1-2 frases e uma ação sugerida, sobre uma secretaria só, com o
 *   número já calculado no contexto. É priorização, não raciocínio — e roda a
 *   cada abertura de tela, o que faz dela a chamada de maior volume. É
 *   exatamente o perfil em que effort baixo economiza sem aparecer.
 * - `sugestaoAlertas`: varre todas as seções atrás de sinal, o que justifica
 *   mais que `low`; mas as regras determinísticas de deteccao-automatica.ts já
 *   pegaram o óbvio antes, e toda sugestão ainda passa por aprovação humana —
 *   com humano no fim da fila, `medium` é o ponto certo.
 */
export const ESFORCO_PADRAO = {
  chat: "high",
  insight: "low",
  sugestaoAlertas: "medium",
} as const satisfies Record<string, EsforcoIA>;

export type PedidoIA = {
  /** Prompt de sistema já montado. Vai marcado para cache na Anthropic. */
  sistema: string;
  mensagens: MensagemChat[];
  maxTokens: number;
  /** Ver ESFORCO_PADRAO. Omitido, usa `high` — o mesmo padrão da API. */
  esforco?: EsforcoIA;
};

export type ProvedorIA = {
  nome: NomeProvedor;
  /** Modelo resolvido, ou null quando não há provedor ativo. Serve para log. */
  modelo: string | null;
  conversar(pedido: PedidoIA): Promise<RespostaIA>;
};

/**
 * Variável ausente e variável preenchida só com espaço são a mesma coisa aqui
 * — o painel da Vercel deixa salvar campo vazio, e isso já custou um incidente
 * em url-app.ts.
 */
function env(nome: string): string | null {
  const bruto = process.env[nome];
  if (bruto === undefined) return null;
  const limpo = bruto.trim();
  return limpo === "" ? null : limpo;
}

/**
 * Provedor que só sabe explicar por que não funciona.
 *
 * Toda falha de configuração vira isto em vez de exceção: quem chama já trata
 * `{ ok: false }` e mostra a mensagem ao gestor, então o erro chega na tela em
 * vez de virar 500 numa server action.
 */
function indisponivel(nome: NomeProvedor, erro: string): ProvedorIA {
  return {
    nome,
    modelo: null,
    conversar: async () => ({ ok: false, erro }),
  };
}

function lerNomeProvedor(): NomeProvedor {
  const bruto = env("IA_PROVEDOR")?.toLowerCase();
  if (bruto === "anthropic" || bruto === "compativel-openai" || bruto === "nenhum") {
    return bruto;
  }
  // Valor desconhecido (erro de digitação, provedor removido) cai no desligado
  // em vez de tentar adivinhar qual era a intenção.
  return "nenhum";
}

// ── Anthropic ──

/**
 * Piso de `max_tokens` quando o thinking está ligado.
 *
 * `max_tokens` é teto compartilhado entre raciocínio e resposta. Os valores
 * que ia.ts usa hoje (800 no chat, 300 no insight, 1500 nas sugestões) foram
 * escolhidos quando não havia thinking: com ele ligado, os 300 do insight se
 * esgotam antes de sair a primeira frase, e a chamada volta sem bloco de texto
 * — ou seja, o insight simplesmente pararia de aparecer, sem erro visível.
 * Subir o teto não gasta nada por si só (é limite, não meta); o que segura o
 * tamanho da resposta é a instrução de "no máximo 2 frases" no prompt.
 */
const TETO_MINIMO_COM_THINKING = 2048;

function tetoDeTokens(pedido: number): number {
  return Math.max(pedido, TETO_MINIMO_COM_THINKING);
}

function provedorAnthropic(): ProvedorIA {
  const apiKey = env("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return indisponivel(
      "anthropic",
      "A IA está configurada para usar a Anthropic (IA_PROVEDOR=anthropic), mas falta a variável ANTHROPIC_API_KEY no .env."
    );
  }

  const modelo = env("IA_MODELO") ?? MODELO_ANTHROPIC_PADRAO;
  const cliente = new Anthropic({ apiKey });

  return {
    nome: "anthropic",
    modelo,
    async conversar(pedido) {
      if (pedido.mensagens.length === 0) {
        return { ok: false, erro: "Nenhuma pergunta foi enviada à IA." };
      }

      try {
        const resposta = await cliente.messages.create({
          model: modelo,
          max_tokens: tetoDeTokens(pedido.maxTokens),
          // Thinking adaptativo declarado explicitamente em vez de omitido: no
          // Opus 5 omitir dá no mesmo, mas em modelos anteriores omitir
          // DESLIGA o raciocínio — e IA_MODELO é configurável. Deixar escrito
          // impede que uma troca de modelo mude o comportamento em silêncio.
          // `budget_tokens` e `{ type: "disabled" }` não entram aqui: o
          // primeiro foi removido no Opus 5 (400), e o segundo tem modo de
          // falha conhecido em que a resposta sai com marcação interna
          // vazando. Quem quiser gastar menos mexe em `effort`, não aqui.
          thinking: { type: "adaptive" },
          output_config: { effort: pedido.esforco ?? "high" },
          // O bloco de sistema vai como array de um item só para caber o
          // cache_control. São ~3.500 tokens reenviados a cada pergunta; ler do
          // cache custa ~0,1x do preço normal — e com Opus 5 essa conta importa
          // mais do que importaria num modelo barato, porque é 0,1x de um preço
          // maior. É a maior economia disponível sem tocar na qualidade.
          //
          // Cache é casamento de PREFIXO: a ordem em que ia.ts monta o prompt
          // (constante fixa primeiro, contexto da prefeitura depois) é o que
          // faz isso valer, e qualquer byte volátil — data, hora, id de
          // requisição — colocado antes deste ponto zera o cache sem avisar.
          // Hoje o prompt de ia.ts não tem nada disso; se alguém acrescentar,
          // o cache some sem erro nenhum aparecer.
          //
          // Um `effort` diferente no meio de uma conversa também invalida o
          // cache — por isso ESFORCO_PADRAO é fixo por tipo de chamada, e não
          // ajustado pergunta a pergunta.
          system: [
            {
              type: "text",
              text: pedido.sistema,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: pedido.mensagens.map((m) => ({
            role: m.papel,
            content: m.texto,
          })),
        });

        const bloco = resposta.content.find((b) => b.type === "text");
        if (!bloco || bloco.type !== "text") {
          return { ok: false, erro: "A IA não retornou uma resposta em texto." };
        }
        return { ok: true, texto: bloco.text };
      } catch (e) {
        return { ok: false, erro: traduzirErroAnthropic(e) };
      }
    },
  };
}

/**
 * Classifica pela classe tipada do SDK, nunca pelo texto da mensagem: o texto
 * muda entre versões do SDK e não é contrato de nada. Da mais específica para
 * a mais genérica, porque todas descendem de APIError.
 */
function traduzirErroAnthropic(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) {
    console.error("[Provedor IA/anthropic] chave recusada:", e.status, e.message);
    return "A chave da API de IA foi recusada. Verifique ANTHROPIC_API_KEY no ambiente.";
  }
  if (e instanceof Anthropic.RateLimitError) {
    console.error("[Provedor IA/anthropic] limite de uso atingido:", e.message);
    return "O limite de uso da IA foi atingido. Tente de novo em alguns instantes.";
  }
  if (e instanceof Anthropic.BadRequestError) {
    // Quase sempre configuração errada nossa (modelo inexistente em IA_MODELO,
    // max_tokens fora da faixa), então o log precisa carregar o detalhe.
    console.error("[Provedor IA/anthropic] pedido inválido:", e.message);
    return "A configuração da IA está inválida neste ambiente. Confira IA_MODELO.";
  }
  if (e instanceof Anthropic.APIConnectionError) {
    console.error("[Provedor IA/anthropic] falha de conexão:", e.message);
    return "Não foi possível alcançar o serviço de IA. Verifique a conexão do servidor.";
  }
  if (e instanceof Anthropic.APIError) {
    console.error("[Provedor IA/anthropic] erro da API:", e.status, e.message);
    return "Não foi possível falar com a IA agora. Tente novamente em instantes.";
  }
  console.error("[Provedor IA/anthropic] falha inesperada:", e);
  return "Não foi possível falar com a IA agora. Tente novamente em instantes.";
}

// ── Compatível com OpenAI (modelo local, provedor alternativo) ──

// Só o que o produto usa. `safeParse` em vez de cast porque a resposta vem de
// um servidor que não é nosso e pode ser qualquer coisa — inclusive um HTML de
// erro de proxy devolvido com status 200.
const respostaChat = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullable() }),
      })
    )
    .min(1),
});

function provedorCompativelOpenai(): ProvedorIA {
  const base = env("IA_BASE_URL")?.replace(/\/+$/, "");
  if (!base) {
    return indisponivel(
      "compativel-openai",
      "A IA está configurada para um endpoint compatível com OpenAI (IA_PROVEDOR=compativel-openai), mas falta a variável IA_BASE_URL no .env — ex.: http://localhost:11434/v1."
    );
  }

  const modelo = env("IA_MODELO");
  if (!modelo) {
    return indisponivel(
      "compativel-openai",
      "A IA está configurada para um endpoint compatível com OpenAI, mas falta a variável IA_MODELO no .env com o nome do modelo a usar."
    );
  }

  const apiKey = env("IA_API_KEY");
  const timeoutMs = Number(env("IA_TIMEOUT_MS")) || TIMEOUT_PADRAO_MS;

  return {
    nome: "compativel-openai",
    modelo,
    async conversar(pedido) {
      if (pedido.mensagens.length === 0) {
        return { ok: false, erro: "Nenhuma pergunta foi enviada à IA." };
      }

      let resposta: Response;
      try {
        resposta = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            // Servidor local costuma não exigir chave, e mandar um
            // Authorization vazio faz alguns deles responderem 401.
            ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: modelo,
            // Aqui não há equivalente ao cache_control nem ao `effort` da
            // Anthropic: o prompt de sistema inteiro é reprocessado a cada
            // chamada e `pedido.esforco` é ignorado de propósito — o formato
            // OpenAI não tem esse controle, e inventar um parâmetro faria o
            // servidor rejeitar a requisição. Em modelo local o custo disso é
            // latência, não dinheiro.
            //
            // `max_tokens` e não `max_completion_tokens`: o campo novo da
            // OpenAI ainda não é aceito pela maior parte dos servidores que
            // apenas imitam o formato (Ollama, LM Studio, vLLM).
            max_tokens: pedido.maxTokens,
            messages: [
              { role: "system", content: pedido.sistema },
              ...pedido.mensagens.map((m) => ({ role: m.papel, content: m.texto })),
            ],
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (e) {
        // Inclui o abort do timeout acima. Sem ele, servidor local que engasga
        // deixa a tela do gestor girando até o limite da plataforma.
        console.error("[Provedor IA/compativel-openai] falha de rede:", e);
        return {
          ok: false,
          erro: "Não foi possível alcançar o serviço de IA configurado em IA_BASE_URL.",
        };
      }

      if (!resposta.ok) {
        const detalhe = await resposta.text().catch(() => "");
        console.error(
          "[Provedor IA/compativel-openai] resposta HTTP",
          resposta.status,
          detalhe.slice(0, 500)
        );
        return resposta.status === 401 || resposta.status === 403
          ? { ok: false, erro: "O serviço de IA recusou a credencial. Verifique IA_API_KEY." }
          : {
              ok: false,
              erro: "Não foi possível falar com a IA agora. Tente novamente em instantes.",
            };
      }

      let corpo: unknown;
      try {
        corpo = await resposta.json();
      } catch (e) {
        console.error("[Provedor IA/compativel-openai] corpo não é JSON:", e);
        return { ok: false, erro: "A IA retornou um formato inesperado." };
      }

      const validado = respostaChat.safeParse(corpo);
      if (!validado.success) {
        console.error("[Provedor IA/compativel-openai] formato inesperado:", validado.error);
        return { ok: false, erro: "A IA retornou um formato inesperado." };
      }

      const texto = validado.data.choices[0].message.content;
      if (texto === null || texto.trim() === "") {
        return { ok: false, erro: "A IA não retornou uma resposta em texto." };
      }
      return { ok: true, texto };
    },
  };
}

// ── Seleção ──

/**
 * Lê o ambiente a cada chamada, em vez de resolver uma vez no import: em
 * desenvolvimento as variáveis mudam sem reiniciar o processo, e é isso que
 * torna a seleção testável sem recarregar o módulo.
 */
export function provedorIA(): ProvedorIA {
  switch (lerNomeProvedor()) {
    case "anthropic":
      return provedorAnthropic();
    case "compativel-openai":
      return provedorCompativelOpenai();
    case "nenhum":
      return indisponivel(
        "nenhum",
        "A IA ainda não está configurada neste ambiente: falta definir IA_PROVEDOR no .env (valores aceitos: anthropic, compativel-openai). Veja o README para as variáveis de cada provedor."
      );
  }
}
