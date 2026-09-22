"use client";

import { useRef, useState, useTransition } from "react";
import { registrarOcorrencia } from "./rede-actions";
import { TIPOS_OCORRENCIA } from "@/lib/ocorrencias-saude";

// Feito para o celular: tipo, gravidade, uma frase, enviar. Dez segundos.
export default function FormularioOcorrencia({ unidadeId }: { unidadeId: string }) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [tipo, setTipo] = useState<string>("sem_medico");
  const form = useRef<HTMLFormElement>(null);
  const exemplo = TIPOS_OCORRENCIA.find((t) => t.chave === tipo)?.exemplo ?? "";

  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setMsg(null);
        iniciar(async () => {
          const r = await registrarOcorrencia(fd);
          if (r.ok) {
            setMsg({ tipo: "ok", texto: "Registrado." });
            form.current?.reset();
            setTipo("sem_medico");
          } else setMsg({ tipo: "erro", texto: r.erro });
        });
      }}
      className="bg-card border border-border rounded-2xl p-4 grid gap-3 sm:grid-cols-[1fr_auto]"
    >
      <input type="hidden" name="unidadeId" value={unidadeId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="oc-tipo" className="block text-xs font-medium mb-1">O que aconteceu</label>
          <select
            id="oc-tipo"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-brand"
          >
            {TIPOS_OCORRENCIA.map((t) => (
              <option key={t.chave} value={t.chave}>{t.rotulo}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="oc-gravidade" className="block text-xs font-medium mb-1">Gravidade</label>
          <select id="oc-gravidade" name="gravidade" defaultValue="atencao" className="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-brand">
            <option value="atencao">Atenção — dá para esperar o dia</option>
            <option value="urgente">Urgente — atendimento parado ou em risco</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="oc-descricao" className="block text-xs font-medium mb-1">Em uma frase</label>
          <input
            id="oc-descricao"
            name="descricao"
            required
            maxLength={500}
            placeholder={exemplo || "Descreva em poucas palavras"}
            className="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
        </div>
      </div>
      <div className="flex sm:flex-col sm:justify-end gap-2">
        <button
          type="submit"
          disabled={pendente}
          className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition disabled:opacity-60 whitespace-nowrap"
        >
          {pendente ? "Registrando…" : "Registrar"}
        </button>
      </div>
      {msg && (
        <p role={msg.tipo === "erro" ? "alert" : "status"} className="text-xs sm:col-span-2" style={{ color: msg.tipo === "erro" ? "var(--urgente)" : "var(--accent)" }}>
          {msg.texto}
        </p>
      )}
    </form>
  );
}
