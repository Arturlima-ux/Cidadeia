"use client";

import { useState, useTransition } from "react";
import { pedirModuloDoPainel } from "./actions";

export default function BotaoPedirModulo({ modulo, nome }: { modulo: string; nome: string }) {
  const [pendente, iniciar] = useTransition();
  const [estado, setEstado] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  if (estado?.tipo === "ok") {
    return (
      <p className="mt-4 text-xs leading-relaxed rounded-lg px-3 py-2 border" style={{ color: "var(--info)", background: "var(--info-tint)", borderColor: "var(--info-borda)" }}>
        {estado.texto}
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <button
        type="button"
        disabled={pendente}
        onClick={() => {
          if (!confirm(`Pedir a proposta do módulo ${nome} para a sua prefeitura?`)) return;
          setEstado(null);
          iniciar(async () => {
            const r = await pedirModuloDoPainel(modulo);
            if (r.ok) {
              setEstado({
                tipo: "ok",
                texto: `Pedido ${r.protocolo} registrado. ${
                  r.confirmacaoEnviada
                    ? "A confirmação já está no seu e-mail; a proposta chega em até um dia útil."
                    : "A proposta chega no seu e-mail em até um dia útil. Acompanhe em 'Sua proposta', acima."
                }`,
              });
            } else {
              setEstado({ tipo: "erro", texto: r.erro });
            }
          });
        }}
        className="text-center bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-4 py-2 transition disabled:opacity-60"
      >
        {pendente ? "Enviando…" : "Pedir este módulo"}
      </button>
      {estado?.tipo === "erro" && (
        <p className="text-xs leading-relaxed" style={{ color: "var(--urgente)" }}>
          {estado.texto}
        </p>
      )}
    </div>
  );
}
