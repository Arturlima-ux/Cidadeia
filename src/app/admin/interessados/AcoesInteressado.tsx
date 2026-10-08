"use client";

import { useTransition } from "react";
import { marcarInteressado } from "./actions";

export default function AcoesInteressado({ leadId, situacao }: { leadId: string; situacao: string }) {
  const [pendente, iniciar] = useTransition();
  const marcar = (acao: "contatado" | "descartado" | "virou_pedido") => {
    const nota = acao === "descartado" ? window.prompt("Por que descartar? (opcional)") ?? "" : "";
    iniciar(async () => {
      await marcarInteressado(leadId, acao, nota);
    });
  };
  const botao = "rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-brand transition disabled:opacity-50";
  return (
    <div className="flex flex-wrap gap-1.5">
      {situacao !== "contatado" && (
        <button type="button" disabled={pendente} onClick={() => marcar("contatado")} className={botao}>
          Contatei
        </button>
      )}
      {situacao !== "virou_pedido" && (
        <button type="button" disabled={pendente} onClick={() => marcar("virou_pedido")} className={botao}>
          Virou pedido
        </button>
      )}
      {situacao !== "descartado" && (
        <button type="button" disabled={pendente} onClick={() => marcar("descartado")} className={`${botao} text-muted`}>
          Descartar
        </button>
      )}
    </div>
  );
}
