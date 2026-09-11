"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { concluirImplantacao } from "./actions";

/**
 * Encerra a lista e leva ao painel. Existe em duas versões de texto: quando
 * tudo que depende só da prefeitura está feito, é a conclusão natural;
 * quando ainda falta passo interno, é uma saída explícita — a pessoa pode
 * preferir ver o painel antes, e a lista continua no menu.
 */
export default function BotaoConcluir({ tudoPronto }: { tudoPronto: boolean }) {
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  function concluir() {
    iniciar(async () => {
      await concluirImplantacao();
      router.push("/dashboard");
    });
  }

  return (
    <button
      type="button"
      onClick={concluir}
      disabled={pendente}
      className={
        tudoPronto
          ? "bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full px-5 py-2.5 transition disabled:opacity-50"
          : "text-sm font-semibold text-muted hover:text-brand transition disabled:opacity-50"
      }
    >
      {pendente ? "Abrindo o painel…" : tudoPronto ? "Ir para o painel →" : "Ir para o painel mesmo assim →"}
    </button>
  );
}
