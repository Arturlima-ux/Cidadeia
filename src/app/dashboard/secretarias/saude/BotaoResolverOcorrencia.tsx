"use client";

import { useState, useTransition } from "react";
import { resolverOcorrencia } from "./rede-actions";

export default function BotaoResolverOcorrencia({ id }: { id: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div className="shrink-0">
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await resolverOcorrencia(id);
            if (!r.ok) setErro(r.erro);
          })
        }
        className="text-sm font-semibold border border-border rounded-full px-4 py-1.5 hover:border-brand hover:text-brand transition disabled:opacity-60"
      >
        {pendente ? "…" : "Resolvida"}
      </button>
      {erro && <p className="text-xs mt-1" style={{ color: "var(--urgente)" }}>{erro}</p>}
    </div>
  );
}
