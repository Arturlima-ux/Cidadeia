"use client";

import { useEffect, useState, useTransition } from "react";
import { IconIA } from "./icons";
import type { ModuloInsight, RespostaIA } from "@/lib/ia";

/**
 * Insight automático por módulo — dispara sozinho ao entrar na página (é
 * só leitura/análise, nunca cria ou muda dado nenhum, então não tem o
 * mesmo risco de "IA agindo sozinha" que os alertas sugeridos têm).
 * Fica invisível (não polui a tela) quando a IA ainda não está configurada.
 */
export default function InsightIA({
  acao,
  modulo,
}: {
  acao: (modulo: ModuloInsight, forcar?: boolean) => Promise<RespostaIA>;
  modulo: ModuloInsight;
}) {
  const [resultado, setResultado] = useState<RespostaIA | null>(null);
  const [pending, startTransition] = useTransition();

  // Ao entrar na página, aproveita o cache (não gasta chamada de API se
  // um insight recente já existe).
  useEffect(() => {
    startTransition(async () => {
      const r = await acao(modulo);
      setResultado(r);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulo]);

  // "Atualizar" é pedido explícito do usuário — aí sim ignora o cache.
  function atualizar() {
    startTransition(async () => {
      const r = await acao(modulo, true);
      setResultado(r);
    });
  }

  if (resultado && !resultado.ok && resultado.erro.includes("ANTHROPIC_API_KEY")) {
    return null;
  }

  return (
    <div className="rounded-xl border border-brand/20 bg-brand-tint/50 p-4 flex gap-3 items-start animate-fade-in-up">
      <div
        className="w-8 h-8 rounded-lg text-white flex items-center justify-center shrink-0"
        style={{ background: "var(--gradient-hero)" }}
      >
        <IconIA className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-dark">
            Insight da IA
          </p>
          <button
            onClick={atualizar}
            disabled={pending}
            className="text-[11px] font-semibold text-brand hover:underline disabled:opacity-50 shrink-0"
          >
            {pending ? "Analisando..." : "Atualizar"}
          </button>
        </div>
        {pending && !resultado ? (
          <div className="space-y-1.5 mt-2.5">
            <div className="h-2.5 bg-brand/15 rounded animate-pulse-soft w-4/5" />
            <div className="h-2.5 bg-brand/15 rounded animate-pulse-soft w-3/5" />
          </div>
        ) : resultado?.ok ? (
          <p className="text-sm mt-1.5 leading-relaxed whitespace-pre-line">{resultado.texto}</p>
        ) : resultado && !resultado.ok ? (
          <p className="text-sm text-muted mt-1.5">{resultado.erro}</p>
        ) : null}
      </div>
    </div>
  );
}
