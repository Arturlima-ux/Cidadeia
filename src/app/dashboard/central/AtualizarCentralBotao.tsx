"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { carregarCentralInteligente } from "./actions";

export default function AtualizarCentralBotao() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function atualizar() {
    startTransition(async () => {
      const resultado = await carregarCentralInteligente(true);
      if (resultado.ok) router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={atualizar}
      disabled={pending}
      className="text-xs font-semibold text-brand hover:underline disabled:opacity-60 shrink-0"
    >
      {pending ? "Atualizando..." : "Atualizar agora"}
    </button>
  );
}
