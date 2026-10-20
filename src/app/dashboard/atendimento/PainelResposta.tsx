"use client";

import { useRef, useState, useTransition } from "react";
import type { ResultadoAcao, ResultadoRascunho } from "./actions";

export default function PainelResposta({
  acao,
  id,
  statusAtual,
  respostaAtual,
  sugerir,
}: {
  acao: (fd: FormData) => Promise<ResultadoAcao>;
  /** Rascunho da resposta (lib/rascunho-resposta.ts). */
  sugerir?: (id: string) => Promise<ResultadoRascunho>;
  id: string;
  statusAtual: string;
  /** Para complementar: a resposta nova substitui a anterior, então parte dela. */
  respostaAtual?: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [rascunhando, startRascunho] = useTransition();
  const [origem, setOrigem] = useState<string | null>(null);
  const caixa = useRef<HTMLTextAreaElement>(null);

  function rascunho() {
    if (!sugerir) return;
    setErro(null);
    startRascunho(async () => {
      const r = await sugerir(id);
      if (!r.ok) return setErro(r.erro);
      if (caixa.current) {
        caixa.current.value = r.texto;
        caixa.current.focus();
      }
      setOrigem(
        r.origem === "modelo"
          ? "Rascunho escrito pela IA a partir dos dados do portal. Confira e complete o que está entre [colchetes]."
          : "Rascunho montado com os dados do portal. Confira e complete o que está entre [colchetes]."
      );
    });
  }

  function enviar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await acao(formData);
      if (r.ok) {
        setAberto(false);
        setAviso(r.aviso ?? null);
      } else setErro(r.erro);
    });
  }

  if (!aberto) {
    return (
      <>
      {aviso && <p className="mt-3 text-xs text-muted" role="status">{aviso}</p>}
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-3 text-xs font-semibold text-brand hover:underline"
      >
        {respostaAtual ? "Complementar a resposta →" : "Responder →"}
      </button>
      </>
    );
  }

  return (
    <form action={enviar} className="mt-4 pt-4 border-t border-border space-y-3">
      <input type="hidden" name="id" value={id} />

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <label className="block text-xs font-medium">Resposta ao cidadão</label>
          {sugerir && (
            <button
              type="button"
              onClick={rascunho}
              disabled={rascunhando}
              className="text-xs font-semibold text-brand hover:underline disabled:opacity-60"
            >
              {rascunhando ? "Escrevendo o rascunho…" : "Sugerir rascunho"}
            </button>
          )}
        </div>
        <textarea
          ref={caixa}
          name="resposta"
          required
          defaultValue={respostaAtual ?? undefined}
          rows={origem ? 10 : 4}
          maxLength={5000}
          placeholder="Vai por e-mail ao cidadão (quando ele deixou um) e aparece na consulta do protocolo no portal."
          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
        />
        {origem && <p className="text-[11px] text-muted mt-1">{origem}</p>}
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
