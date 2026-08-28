"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  gerarSugestoes,
  aprovarSugestao,
  descartarSugestao,
} from "@/app/dashboard/actions";

type Sugestao = {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: string;
  secretaria: string | null;
  justificativa: string;
};

const PRIORIDADE_LABEL: Record<string, string> = {
  urgente: "🔴 Urgente",
  medio: "🟠 Médio",
  info: "🟢 Informação",
};

export default function SugestoesAlertasIA({
  sugestoes,
}: {
  sugestoes: Sugestao[];
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function gerar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await gerarSugestoes();
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      router.refresh();
    });
  }

  function aprovar(id: string) {
    startTransition(async () => {
      await aprovarSugestao(id);
      router.refresh();
    });
  }

  function descartar(id: string) {
    startTransition(async () => {
      await descartarSugestao(id);
      router.refresh();
    });
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <span
              className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{ background: "var(--gradient-hero)" }}
            >
              IA
            </span>
            Sugestões da IA
          </h2>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            A IA analisa os dados já cadastrados e sugere alertas — nada vira
            oficial sem você aprovar.
          </p>
        </div>
        <button
          type="button"
          onClick={gerar}
          disabled={pending}
          className="shrink-0 border border-brand text-brand hover:bg-brand-tint text-xs font-semibold rounded-full px-4 py-2 transition disabled:opacity-60"
        >
          {pending ? "Gerando..." : "Gerar sugestões agora"}
        </button>
      </div>

      {erro && (
        <p className="text-sm rounded-lg px-3 py-2 border" style={{ color: "var(--urgente)", background: "var(--urgente-tint)", borderColor: "var(--urgente-borda)" }}>
          {erro}
        </p>
      )}

      {sugestoes.length > 0 && (
        <div className="space-y-2">
          {sugestoes.map((s) => (
            <div
              key={s.id}
              className="rounded-lg border border-accent/40 bg-accent-tint/60 px-4 py-3 text-sm space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{s.titulo}</p>
                  {s.descricao && (
                    <p className="text-xs opacity-80 mt-0.5">{s.descricao}</p>
                  )}
                  {s.secretaria && (
                    <p className="text-xs opacity-70 mt-0.5">
                      Secretaria: {s.secretaria}
                    </p>
                  )}
                  <p className="text-xs text-muted italic mt-1.5">
                    {s.justificativa}
                  </p>
                </div>
                <span className="text-xs font-semibold shrink-0">
                  {PRIORIDADE_LABEL[s.prioridade]}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => aprovar(s.id)}
                  disabled={pending}
                  className="text-xs font-semibold text-brand hover:underline disabled:opacity-60"
                >
                  Aprovar → virar alerta
                </button>
                <button
                  type="button"
                  onClick={() => descartar(s.id)}
                  disabled={pending}
                  className="text-xs font-semibold text-muted hover:text-foreground disabled:opacity-60"
                >
                  Descartar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
