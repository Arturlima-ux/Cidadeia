"use client";

import { useState, useTransition } from "react";
import { atualizarEmendas } from "./actions";

export default function BotaoAtualizar() {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  return (
    <div className="flex flex-col gap-2 items-start">
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await atualizarEmendas();
            setMsg(
              r.ok
                ? { ok: true, texto: r.quantidade ? `${r.quantidade} emenda(s) lida(s) agora no Transferegov.` : "Nenhuma emenda Pix encontrada para o CNPJ da prefeitura." }
                : { ok: false, texto: r.erro }
            );
          })
        }
        className="inline-flex items-center gap-2 border border-border hover:border-brand text-sm font-semibold rounded-lg px-4 py-2 transition disabled:opacity-50"
      >
        {pendente ? "Consultando o Transferegov…" : "Atualizar agora"}
      </button>
      {msg && (
        <p className="text-xs" role="status" style={{ color: msg.ok ? "var(--info)" : "var(--urgente)" }}>
          {msg.texto}
        </p>
      )}
    </div>
  );
}
