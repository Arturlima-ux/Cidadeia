"use client";

import { useState, useTransition } from "react";
import { testarEnvioDeEmail } from "./actions";
import type { ResultadoDoCaminho } from "@/lib/email";

const NOME = { gmail: "Gmail", resend: "Resend" } as const;

/** Testa os dois caminhos de envio e mostra, em português, o que falhou. */
export default function TesteDeEnvio() {
  const [pendente, iniciar] = useTransition();
  const [r, setR] = useState<{ para: string; caminhos: ResultadoDoCaminho[] } | "erro" | null>(null);

  return (
    <section className="rounded-2xl border border-border p-5 space-y-4" style={{ background: "var(--card)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Testar o envio</h2>
          <p className="text-sm text-muted mt-1 max-w-[60ch]">
            Manda um e-mail de teste para você por cada caminho, separadamente, e mostra o motivo exato quando algum falha.
          </p>
        </div>
        <button
          type="button"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              const res = await testarEnvioDeEmail();
              setR(res.ok ? { para: res.para, caminhos: res.caminhos } : "erro");
            })
          }
          className="rounded-full bg-brand text-white hover:bg-brand-dark transition px-5 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {pendente ? "Testando…" : "Testar agora"}
        </button>
      </div>
      {r === "erro" && <p className="text-sm text-danger">Só a equipe pode testar.</p>}
      {r && r !== "erro" && (
        <ul className="space-y-3" aria-live="polite">
          {r.caminhos.map((c) => (
            <li key={c.caminho} className="rounded-xl border border-border p-4">
              <p className="font-medium">
                {NOME[c.caminho]}:{" "}
                <span style={{ color: c.enviado ? "var(--info)" : "var(--urgente)" }}>
                  {c.enviado ? `enviado para ${r.para}` : c.configurado ? "falhou" : "não configurado"}
                </span>
              </p>
              {c.remetente && <p className="text-xs text-muted mt-1">Remetente: {c.remetente}</p>}
              {c.erro && <p className="text-xs text-muted mt-2 break-words">Resposta do provedor: {c.erro}</p>}
              {c.explicacao && <p className="text-sm mt-2">{c.explicacao}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
