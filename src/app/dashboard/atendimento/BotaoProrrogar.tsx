"use client";

import { useState, useTransition } from "react";
import { prorrogarPrazo } from "./actions";

/**
 * Pede confirmação antes de registrar a prorrogação.
 *
 * Não é zelo com o clique errado: prorrogar sem justificar e sem comunicar o
 * cidadão é descumprir a lei do mesmo jeito, só que com o painel dizendo que
 * está tudo certo. A confirmação existe para o servidor lembrar do que a
 * prorrogação exige DELE antes de o prazo mudar na tela.
 */
export default function BotaoProrrogar({ id, diasExtras }: { id: string; diasExtras: number }) {
  const [pendente, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function confirmar() {
    setErro(null);
    iniciar(async () => {
      const r = await prorrogarPrazo(id);
      if (!r.ok) setErro(r.erro);
      else setConfirmando(false);
    });
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="text-xs font-semibold text-brand hover:underline mt-2"
      >
        Prorrogar +{diasExtras} dias
      </button>
    );
  }

  return (
    <div className="mt-2 text-left max-w-[15rem]">
      <p className="text-xs text-muted leading-relaxed">
        A prorrogação exige justificativa expressa comunicada ao cidadão. Já
        fez isso?
      </p>
      <div className="flex gap-3 mt-1.5">
        <button
          type="button"
          onClick={confirmar}
          disabled={pendente}
          className="text-xs font-bold text-brand hover:underline disabled:opacity-50"
        >
          {pendente ? "Registrando…" : "Sim, registrar"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="text-xs font-semibold text-muted hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
      {erro && (
        <p className="text-xs mt-1.5" style={{ color: "var(--urgente)" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
