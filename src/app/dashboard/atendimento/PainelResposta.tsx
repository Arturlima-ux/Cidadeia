"use client";

import { useState, useTransition } from "react";
import type { ResultadoAcao } from "./actions";

export default function PainelResposta({
  acao,
  id,
  statusAtual,
}: {
  acao: (fd: FormData) => Promise<ResultadoAcao>;
  id: string;
  statusAtual: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await acao(formData);
      if (r.ok) setAberto(false);
      else setErro(r.erro);
    });
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-3 text-xs font-semibold text-brand hover:underline"
      >
        Responder →
      </button>
    );
  }

  return (
    <form action={enviar} className="mt-4 pt-4 border-t border-border space-y-3">
      <input type="hidden" name="id" value={id} />

      <div>
        <label className="block text-xs font-medium mb-1">Resposta ao cidadão</label>
        <textarea
          name="resposta"
          required
          rows={4}
          maxLength={5000}
          placeholder="O cidadão verá esta resposta ao consultar o protocolo no portal."
          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Novo status</label>
          <select
            name="status"
            defaultValue={statusAtual === "aberto" ? "respondido" : statusAtual}
            className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="em_analise">Em análise</option>
            <option value="respondido">Respondido</option>
            <option value="encerrado">Encerrado</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-5 py-2 transition disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Enviar resposta"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-sm text-muted hover:text-foreground transition"
        >
          Cancelar
        </button>
      </div>

      {erro && (
        <p
          className="text-sm rounded-lg px-3 py-2 border"
          style={{
            color: "var(--urgente)",
            background: "var(--urgente-tint)",
            borderColor: "var(--urgente-borda)",
          }}
        >
          {erro}
        </p>
      )}
    </form>
  );
}
