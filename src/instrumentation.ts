import type { Instrumentation } from "next";

// ── QUANDO O SERVIDOR QUEBRA, ALGUÉM FICA SABENDO ──
//
// Antes, um erro de servidor às 3h da manhã morria no log da Vercel, que
// ninguém abre. Aqui o Next chama esta função a cada erro de servidor
// (página, ação, rota) e a gente manda um e-mail para a equipe com o que
// importa: mensagem, rota, método, e o "digest" que identifica o erro.
//
// ── SEM VIRAR SPAM ──
// Um bug numa página popular geraria centenas de e-mails em minutos. Cada
// erro (pela mensagem + rota) avisa uma vez por hora, por instância. O
// resto vai só para o log, como sempre.
//
// Nada de terceiros: usa o mesmo envio de e-mail do resto do sistema. O
// import é dinâmico porque o módulo de e-mail só existe no runtime Node.

const JANELA_MS = 60 * 60 * 1000;
const ultimoAviso = new Map<string, number>();

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const mensagem = err instanceof Error ? err.message : String(err);
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest?: unknown }).digest) : "";
  const chave = `${request.method} ${request.path} :: ${mensagem.slice(0, 120)}`;

  console.error(`[erro-servidor] ${chave}`, { digest, tipo: context.routeType, fase: context.renderSource });

  const agora = Date.now();
  const anterior = ultimoAviso.get(chave) ?? 0;
  if (agora - anterior < JANELA_MS) return;
  ultimoAviso.set(chave, agora);

  const destino = process.env.PROPOSTA_DESTINO_EMAIL?.trim();
  if (!destino) return;

  try {
    const { enviarEmail } = await import("@/lib/email");
    const { h, montarEmail } = await import("@/lib/email-modelo");
    const pilha = err instanceof Error && err.stack ? err.stack.split("\n").slice(0, 8).join("\n") : "";
    await enviarEmail({
      para: destino,
      assunto: `[CidadeIA] erro no servidor — ${request.method} ${request.path}`,
      html: montarEmail({
        remetente: { tipo: "equipe" },
        previa: mensagem,
        etiqueta: { texto: "Erro no servidor", tom: "urgente" },
        titulo: mensagem.length > 120 ? `${mensagem.slice(0, 117)}…` : mensagem,
        blocos: [
          {
            dados: [
              ["Rota", `${request.method} ${request.path}`],
              ["Tipo", context.routeType],
              ["Fase", context.renderSource ?? "-"],
              ...(digest ? ([["Digest", digest]] as [string, string][]) : []),
              ["Quando", `${new Date(agora).toLocaleString("pt-BR", { timeZone: "America/Fortaleza" })} (Fortaleza)`],
            ],
          },
          pilha ? { citacao: h`<pre style="margin:0;font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-word">${pilha}</pre>`, rotulo: "Pilha" } : null,
          { nota: "Este erro só avisa de novo daqui a uma hora, se continuar. O detalhe completo está nos logs da Vercel." },
        ],
        assinatura: null,
        motivo: "Aviso automático de erro no servidor.",
      }),
    });
  } catch (e) {
    console.error("[erro-servidor] não foi possível avisar por e-mail:", e);
  }
};
