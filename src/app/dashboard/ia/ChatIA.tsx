"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { enviarPerguntaIA } from "./actions";

type Mensagem = { papel: "user" | "assistant"; texto: string; erro?: boolean };

const SUGESTOES = [
  "Quais alertas estão em aberto agora?",
  "Como está o saldo financeiro da prefeitura?",
  "Alguma obra está com progresso abaixo do esperado?",
  "Existe alguma licitação com risco sinalizado?",
];

export default function ChatIA() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [pending, startTransition] = useTransition();
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  function enviar(texto: string) {
    const pergAtual = texto.trim();
    if (!pergAtual || pending) return;

    const historico = mensagens.map((m) => ({ papel: m.papel, texto: m.texto }));
    setMensagens((atual) => [...atual, { papel: "user", texto: pergAtual }]);
    setPergunta("");

    startTransition(async () => {
      const resultado = await enviarPerguntaIA(historico, pergAtual);
      if (resultado.ok) {
        setMensagens((atual) => [
          ...atual,
          { papel: "assistant", texto: resultado.texto },
        ]);
      } else {
        setMensagens((atual) => [
          ...atual,
          { papel: "assistant", texto: resultado.erro, erro: true },
        ]);
      }
    });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {mensagens.length === 0 && (
          <div>
            <p className="text-sm text-muted mb-3">
              Pergunte algo sobre os dados reais da sua prefeitura. Experimente:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="text-xs border border-border rounded-full px-3 py-1.5 hover:border-brand hover:text-brand transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensagens.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.papel === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words leading-relaxed ${
                m.papel === "user"
                  ? "bg-brand text-white"
                  : m.erro
                    ? "border"
                    : "bg-sutil text-foreground"
              }`}
              style={
                m.erro
                  ? {
                      color: "var(--urgente)",
                      background: "var(--urgente-tint)",
                      borderColor: "var(--urgente-borda)",
                    }
                  : undefined
              }
            >
              {m.texto}
            </div>
          </div>
        ))}

        {pending && (
          <div className="flex justify-start">
            <div className="bg-sutil rounded-2xl px-4 py-2.5 text-sm text-muted">
              Analisando os dados...
            </div>
          </div>
        )}
        <div ref={fimRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(pergunta);
        }}
        className="border-t border-border p-3 flex gap-2"
      >
        <input
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Pergunte qualquer coisa sobre sua prefeitura..."
          className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm outline-none focus:border-brand transition"
        />
        <button
          type="submit"
          disabled={pending || !pergunta.trim()}
          className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-5 py-2.5 transition disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
