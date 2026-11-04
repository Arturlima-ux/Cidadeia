"use client";

import { useState } from "react";

// Copia o link marcado (lib/links-de-campanha.ts) para colar na mensagem.
// Sem área de transferência (navegador antigo, página sem https), o link
// fica selecionado no campo ao lado para copiar à mão.
export default function CopiarLink({ link, rotulo = "Copiar link" }: { link: string; rotulo?: string }) {
  const [copiado, setCopiado] = useState(false);
  const [mostrar, setMostrar] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setMostrar(true);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2 min-w-0 max-w-full">
      <button
        type="button"
        onClick={copiar}
        className="whitespace-nowrap rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-brand transition"
        aria-live="polite"
      >
        {copiado ? "Copiado" : rotulo}
      </button>
      {mostrar && (
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          autoFocus
          aria-label="Link para copiar"
          className="min-w-0 w-full max-w-[28rem] rounded-lg border border-border bg-background px-2 py-1 text-xs"
        />
      )}
    </span>
  );
}
