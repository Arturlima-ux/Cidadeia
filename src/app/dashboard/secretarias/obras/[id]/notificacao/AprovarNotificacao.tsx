"use client";

import { useState, useTransition } from "react";
import { aprovarNotificacaoObra } from "../../notificacao-actions";

/**
 * O único botão que grava nesta tela. Exige marcar que conferiu, pelo mesmo
 * motivo de AprovarRascunho na renovação: aprovação sem leitura dá aparência
 * de conferência a um texto que ninguém leu.
 */
export default function AprovarNotificacao({
  obraId,
  impressao,
  pendencias,
}: {
  obraId: string;
  impressao: string;
  pendencias: number;
}) {
  const [conferi, setConferi] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, iniciar] = useTransition();

  function aprovar() {
    setErro(null);
    iniciar(async () => {
      const r = await aprovarNotificacaoObra(obraId, impressao);
      if (!r.ok) setErro(r.erro);
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <label className="flex items-start gap-2.5 text-sm leading-relaxed cursor-pointer">
        <input
          type="checkbox"
          checked={conferi}
          onChange={(e) => setConferi(e.target.checked)}
          className="mt-1 w-4 h-4 shrink-0 accent-[var(--brand)]"
        />
        <span>
          Conferi os dados da obra e do contrato e os dois documentos abaixo.
          {pendencias > 0 && ` Os ${pendencias} campos entre colchetes serão preenchidos no processo, por quem tem a informação.`}
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={aprovar}
          disabled={!conferi || gravando}
          className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-lg px-5 py-2.5 min-h-11 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {gravando ? "Registrando…" : "Aprovar para envio"}
        </button>
        <span className="text-xs text-muted">Fica registrado com seu nome, cargo e horário.</span>
      </div>
      {erro && (
        <p role="alert" className="text-sm rounded-lg px-4 py-3 leading-relaxed" style={{ background: "var(--urgente-tint)", color: "var(--urgente)" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
