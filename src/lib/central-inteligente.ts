import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { db } from "@/db";
import { centralInteligente } from "@/db/schema";
import { eq } from "drizzle-orm";
import { montarContexto, gerarDeteccoesAutomaticas } from "@/lib/ia";
import type { DeteccaoAutomatica } from "@/lib/deteccao-automatica";

const HORAS_VALIDADE_CACHE = 24;

export type ItemCentral = {
  titulo: string;
  texto: string;
  prioridade: "urgente" | "medio" | "info";
  modulos: string[];
  automatico: boolean;
};

export type ConteudoCentral = {
  resumo: string;
  itens: ItemCentral[];
  geradoEm: string;
};

export type RespostaCentral =
  | { ok: true; central: ConteudoCentral; deCache: boolean }
  | { ok: false; erro: string };

const LABEL_SECRETARIA: Record<string, string> = {
  saude: "Saúde",
  educacao: "Educação",
  obras: "Obras",
  licitacoes: "Licitações",
};

function deteccaoParaItem(d: DeteccaoAutomatica): ItemCentral {
  return {
    titulo: d.titulo,
    texto: d.descricao,
    prioridade: d.prioridade,
    modulos: d.secretaria ? [LABEL_SECRETARIA[d.secretaria] ?? d.secretaria] : ["Financeiro"],
    automatico: true,
  };
}

const schemaCentralIA = z.object({
  resumo: z.string(),
  itens: z.array(
    z.object({
      titulo: z.string(),
      texto: z.string(),
      prioridade: z.enum(["urgente", "medio", "info"]),
      modulos: z.array(z.string()),
    })
  ),
});

async function gerarViaIA(
  prefeituraId: string,
  deteccoes: DeteccaoAutomatica[]
): Promise<{ resumo: string; itens: ItemCentral[] } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  let contexto: string;
  try {
    contexto = await montarContexto(prefeituraId);
  } catch (e) {
    console.error("[Central Inteligente] falha ao montar contexto:", e);
    return null;
  }

  const client = new Anthropic({ apiKey });
  const jaDetectado =
    deteccoes.length > 0
      ? `\n\nJá foram detectados automaticamente por regra (não repita, mas pode conectá-los a outro achado seu): ${deteccoes.map((d) => d.titulo).join("; ")}.`
      : "";

  try {
    const resposta = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      system: `${contexto}\n\nVocê é a IA Central da CidadeIA analisando TODAS as secretarias contratadas por esta prefeitura de uma vez, não uma de cada vez. Use só os dados reais fornecidos acima — nunca invente número, nome ou evento. Se um dado não existir, não mencione.`,
      messages: [
        {
          role: "user",
          content:
            "Procure conexões ENTRE módulos diferentes que só fazem sentido olhando " +
            "duas ou mais áreas juntas (ex: uma obra de reforma escolar atrasada " +
            "relacionada à evasão de uma escola; queda no orçamento coincidindo com " +
            "obras paradas). Se não houver conexão real nos dados, é normal — não " +
            "force uma relação que não existe. Retorne um resumo geral de 1-2 frases " +
            "sobre a saúde da gestão, e até 5 itens priorizados. Cada item deve citar " +
            "o(s) módulo(s) envolvido(s). Se não houver nada relevante além do que já " +
            "foi detectado automaticamente, retorne uma lista de itens vazia." +
            jaDetectado,
        },
      ],
      tools: [
        {
          name: "registrar_central",
          description: "Registra o resumo e os itens priorizados da central inteligente.",
          input_schema: {
            type: "object",
            properties: {
              resumo: { type: "string" },
              itens: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    titulo: { type: "string" },
                    texto: { type: "string" },
                    prioridade: { type: "string", enum: ["urgente", "medio", "info"] },
                    modulos: { type: "array", items: { type: "string" } },
                  },
                  required: ["titulo", "texto", "prioridade", "modulos"],
                },
              },
            },
            required: ["resumo", "itens"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "registrar_central" },
    });

    const bloco = resposta.content.find((b) => b.type === "tool_use");
    if (!bloco || bloco.type !== "tool_use") return null;

    const parsed = schemaCentralIA.safeParse(bloco.input);
    if (!parsed.success) {
      console.error("[Central Inteligente] resposta fora do formato esperado:", parsed.error);
      return null;
    }

    return {
      resumo: parsed.data.resumo,
      itens: parsed.data.itens.map((i) => ({ ...i, automatico: false })),
    };
  } catch (e) {
    console.error("[Central Inteligente] falha na chamada à API:", e);
    return null;
  }
}

/**
 * Central automática cruzando todos os módulos — cacheada por prefeitura e
 * recalculada sozinha quando fica velha (padrão: 24h), sem precisar de
 * clique. Só disponível pra prefeito/admin (cargo já checado pelo chamador).
 */
export async function obterCentralInteligente(
  prefeituraId: string,
  forcar = false
): Promise<RespostaCentral> {
  if (!forcar) {
    const [linha] = await db
      .select()
      .from(centralInteligente)
      .where(eq(centralInteligente.prefeituraId, prefeituraId))
      .limit(1);

    if (linha) {
      const horasDesde = (Date.now() - new Date(linha.geradoEm).getTime()) / 3600000;
      if (horasDesde < HORAS_VALIDADE_CACHE) {
        try {
          const conteudo = JSON.parse(linha.conteudo) as ConteudoCentral;
          return { ok: true, central: conteudo, deCache: true };
        } catch {
          // cache corrompido — cai pra regeneração abaixo
        }
      }
    }
  }

  let deteccoes: DeteccaoAutomatica[] = [];
  try {
    deteccoes = await gerarDeteccoesAutomaticas(prefeituraId);
  } catch (e) {
    console.error("[Central Inteligente] falha nas detecções automáticas:", e);
  }

  const viaIA = await gerarViaIA(prefeituraId, deteccoes);

  const central: ConteudoCentral = {
    resumo:
      viaIA?.resumo ??
      (deteccoes.length > 0
        ? `${deteccoes.length} ponto(s) detectado(s) automaticamente que merecem atenção.`
        : "Nenhum ponto crítico detectado nos dados registrados até agora."),
    itens: [...deteccoes.map(deteccaoParaItem), ...(viaIA?.itens ?? [])],
    geradoEm: new Date().toISOString(),
  };

  try {
    await db
      .insert(centralInteligente)
      .values({ prefeituraId, conteudo: JSON.stringify(central), geradoEm: central.geradoEm })
      .onConflictDoUpdate({
        target: centralInteligente.prefeituraId,
        set: { conteudo: JSON.stringify(central), geradoEm: central.geradoEm },
      });
  } catch (e) {
    console.error("[Central Inteligente] falha ao salvar cache:", e);
  }

  return { ok: true, central, deCache: false };
}
