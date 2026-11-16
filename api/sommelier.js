// Sommelier da casa: responde com base apenas no cardápio e na carta.
// Usa o Vercel AI Gateway (autenticação OIDC automática no Vercel, ou AI_GATEWAY_API_KEY).
import { PRATOS, CARTA } from "../assets/data.js";

const MODELOS = (process.env.SOMMELIER_MODEL || "anthropic/claude-haiku-4.5,anthropic/claude-sonnet-4,openai/gpt-4o-mini").split(",");

const carta = [
  ...PRATOS.map(p => `- id:${p.id} | Menu Executivo R$ 79 (${p.etapa}) | ${p.nome}: ${p.desc}`),
  ...CARTA.map(b => `- id:${b.id} | ${b.grupo} | ${b.nome} (R$ ${b.preco})${b.desc ? ": " + b.desc : ""}`),
].join("\n");

const SISTEMA = `Você é o sommelier da Pitanga Gastrobar, em Teresina (PI). Fala português do Brasil, com elegância e calor, como um bom sommelier à mesa: frases curtas, sem jargão excessivo, sem emojis.
Recomende SOMENTE itens desta lista (use os ids exatos). Nunca invente pratos, bebidas, safras, produtores ou preços. Vinhos são garrafas, exceto os de 187 ml (individual), 375 ml (meia garrafa) e o vinho nacional em taça: para uma pessoa só, prefira esses. Os drinks autorais levam nomes de escritoras.
${carta}

Regras:
- Responda em no máximo 3 frases (até 60 palavras).
- Sugira de 1 a 3 itens relevantes.
- Se a pessoa pedir algo que a casa não tem, diga com gentileza e ofereça a alternativa mais próxima da lista.
- Se perguntarem sobre alergias, diga os ingredientes listados e recomende confirmar com o garçom.
- Responda APENAS com JSON válido, sem texto fora dele: {"texto": "...", "sugestoes": ["id1","id2"]}`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  const token = process.env.AI_GATEWAY_API_KEY || req.headers["x-vercel-oidc-token"] || process.env.VERCEL_OIDC_TOKEN;
  if (!token) return res.status(503).json({ erro: "IA indisponível" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const mensagens = (Array.isArray(body.mensagens) ? body.mensagens : []).slice(-8)
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map(m => ({ role: m.role, content: m.content.slice(0, 600) }));
  if (!mensagens.length || mensagens.at(-1).role !== "user") return res.status(400).json({ erro: "Mensagem vazia" });
  const mesa = (Array.isArray(body.mesa) ? body.mesa : []).filter(id => typeof id === "string").slice(0, 20);
  const contexto = `${body.nome ? `Quem fala: ${String(body.nome).slice(0, 24)}. ` : ""}Itens já escolhidos pela mesa (ids): ${mesa.join(", ") || "nenhum ainda"}.`;

  for (const model of MODELOS) {
    try {
      const r = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ model: model.trim(), max_tokens: 300, temperature: 0.6, messages: [{ role: "system", content: SISTEMA + "\n\n" + contexto }, ...mensagens] }),
      });
      if (!r.ok) continue;
      const j = await r.json();
      const bruto = j?.choices?.[0]?.message?.content || "";
      const m = bruto.match(/\{[\s\S]*\}/);
      if (!m) continue;
      const out = JSON.parse(m[0]);
      const ids = new Set([...PRATOS, ...CARTA].map(x => x.id));
      return res.status(200).json({ texto: String(out.texto || "").slice(0, 600), sugestoes: (out.sugestoes || []).filter(id => ids.has(id)).slice(0, 3), modelo: model.trim() });
    } catch { /* tenta o próximo modelo */ }
  }
  return res.status(502).json({ erro: "Sommelier indisponível" });
}
