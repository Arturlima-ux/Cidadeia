"use client";

import { useState, useTransition } from "react";
import { sincronizarRedeCnes } from "./rede-actions";

export default function BotaoSincronizarCnes({ destaque }: { destaque: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  return (
    <div className={destaque ? "" : "flex flex-col items-end gap-1"}>
      <button
        type="button"
        disabled={pendente}
        onClick={() => {
          setMsg(null);
          iniciar(async () => {
            const r = await sincronizarRedeCnes();
            if (r.ok) {
              setMsg({
                tipo: "ok",
                texto: `${r.total} unidade(s) na rede do município: ${r.novas} nova(s), ${r.atualizadas} atualizada(s)${r.desativadas ? `, ${r.desativadas} não constam mais no CNES` : ""}. ${r.ignoradas ? `${r.ignoradas} estabelecimento(s) privado(s) sem SUS ficaram de fora.` : ""}`,
              });
            } else setMsg({ tipo: "erro", texto: r.erro });
          });
        }}
        className={
          destaque
            ? "bg-brand hover:bg-brand-dark text-white text-sm font-bold rounded-xl px-5 py-3 transition disabled:opacity-60"
            : "text-sm font-semibold border border-border rounded-full px-4 py-2 hover:border-brand hover:text-brand transition disabled:opacity-60 whitespace-nowrap"
        }
      >
        {pendente ? "Consultando o CNES…" : destaque ? "Importar a rede do CNES agora  →" : "Atualizar pelo CNES"}
      </button>
      {msg && (
        <p role={msg.tipo === "erro" ? "alert" : "status"} className="text-xs mt-2 max-w-md" style={{ color: msg.tipo === "erro" ? "var(--urgente)" : "var(--accent)" }}>
          {msg.texto}
        </p>
      )}
    </div>
  );
}
