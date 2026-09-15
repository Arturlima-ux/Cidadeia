"use client";

import { useState, useTransition } from "react";
import { consultarRaioX } from "./actions";
import { ESTADOS } from "@/lib/estados";
import type { RaioX } from "@/lib/raio-x";
import RaioXResultado from "@/components/site/RaioXResultado";

const classeInput =
  "w-full border border-border rounded-xl px-4 py-3 text-base bg-transparent focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition";


export default function FormularioRaioX() {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [raioX, setRaioX] = useState<RaioX | null>(null);

  function enviar(formData: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await consultarRaioX(formData);
      if (r.ok) setRaioX(r.raioX);
      else {
        setErro(r.erro);
        setRaioX(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <form action={enviar} className="vidro rounded-2xl p-6 sm:p-7">
        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3">
          <div>
            <label htmlFor="municipio" className="block text-sm font-medium mb-1.5">
              Seu município
            </label>
            <input
              id="municipio"
              name="municipio"
              required
              placeholder="Nome do município"
              className={classeInput}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="uf" className="block text-sm font-medium mb-1.5">
              Estado
            </label>
            <select id="uf" name="uf" defaultValue="" required className={classeInput}>
              <option value="" disabled>
                UF
              </option>
              {ESTADOS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={pendente}
              className="w-full sm:w-auto bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-7 py-3.5 transition shadow-elevated disabled:opacity-60"
            >
              {pendente ? "Consultando…" : "Ver o raio-X"}
            </button>
          </div>
        </div>

        <p className="text-xs text-muted mt-4 leading-relaxed">
          A consulta vai ao Tesouro Nacional na hora. Leva alguns segundos —
          são várias chamadas, uma por bimestre.
        </p>
      </form>

      {erro && (
        <div
          className="border rounded-2xl px-5 py-4"
          style={{ background: "var(--urgente-tint)", borderColor: "var(--urgente-borda)" }}
        >
          <p className="text-sm" style={{ color: "var(--urgente)" }}>
            {erro}
          </p>
        </div>
      )}

      {raioX && <RaioXResultado raioX={raioX} />}
    </div>
  );
}
