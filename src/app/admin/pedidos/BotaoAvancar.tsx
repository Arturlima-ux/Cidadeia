"use client";

import { useState, useTransition } from "react";
import { avancarPedido } from "./actions";
import { PROXIMO_STATUS, STATUS_PEDIDO, type StatusPedido } from "@/lib/pedidos";

export default function BotaoAvancar({
  pedidoId,
  status,
  temConta,
}: {
  pedidoId: string;
  status: StatusPedido;
  temConta: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "erro" | "aviso"; texto: string } | null>(null);
  const proximo = PROXIMO_STATUS[status];
  if (!proximo) {
    return (
      <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
        Módulos ativos
      </p>
    );
  }

  const rotulo =
    proximo === "contratado" ? "Contrato assinado → ativar módulos" : `Marcar: ${STATUS_PEDIDO[proximo].rotulo.toLowerCase()}`;
  const bloqueado = proximo === "contratado" && !temConta;

  return (
    <div className="flex flex-col items-start md:items-end gap-2">
      <button
        disabled={pendente || bloqueado}
        title={bloqueado ? "O cliente precisa criar a conta antes" : undefined}
        onClick={() => {
          if (proximo === "contratado" && !confirm("Ativar os módulos deste pedido na conta do cliente?")) return;
          setMsg(null);
          iniciar(async () => {
            const r = await avancarPedido(pedidoId);
            if (!r.ok) setMsg({ tipo: "erro", texto: r.erro });
            else if (r.aviso) setMsg({ tipo: "aviso", texto: r.aviso });
          });
        }}
        className="text-sm font-bold bg-brand hover:bg-brand-dark text-white rounded-xl px-4 py-2.5 transition disabled:opacity-50 whitespace-nowrap"
      >
        {pendente ? "Salvando…" : rotulo}
      </button>
      {msg && (
        <p
          className="text-xs max-w-[36ch] md:text-right"
          style={{ color: msg.tipo === "erro" ? "var(--urgente)" : "var(--medio)" }}
        >
          {msg.texto}
        </p>
      )}
    </div>
  );
}
