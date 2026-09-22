"use client";

import { useRef, useState, useTransition } from "react";
import { lancarResultadoAps, removerResultadoAps } from "../aps-actions";
import { INDICADORES_APS, NOME_BLOCO, rotuloQuadrimestre, type BlocoAps } from "@/lib/aps";

export default function FormularioAps({
  quadrimestres,
  selecionado,
}: {
  quadrimestres: { ano: number; numero: 1 | 2 | 3 }[];
  selecionado: { ano: number; numero: number };
}) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const [quadri, setQuadri] = useState(`${selecionado.ano}-${selecionado.numero}`);
  const [ano, numero] = quadri.split("-");
  const campo = "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand";
  const blocos = ["esf_eap", "esb", "emulti"] as BlocoAps[];

  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setMsg(null);
        iniciar(async () => {
          const r = await lancarResultadoAps(fd);
          if (r.ok) {
            setMsg({ tipo: "ok", texto: "Resultado lançado." });
            form.current?.reset();
          } else setMsg({ tipo: "erro", texto: r.erro });
        });
      }}
      className="bg-card border border-border rounded-2xl p-4 grid gap-3 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label htmlFor="aps-indicador" className="block text-xs font-medium mb-1">
          Indicador
        </label>
        <select id="aps-indicador" name="indicador" required className={campo} defaultValue="acesso">
          {blocos.map((b) => (
            <optgroup key={b} label={NOME_BLOCO[b]}>
              {INDICADORES_APS.filter((i) => i.bloco === b).map((i) => (
                <option key={i.chave} value={i.chave}>
                  {i.nome}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="aps-quadri" className="block text-xs font-medium mb-1">
          Quadrimestre
        </label>
        <select id="aps-quadri" required className={campo} value={quadri} onChange={(e) => setQuadri(e.target.value)}>
          {quadrimestres.map((q) => (
            <option key={`${q.ano}-${q.numero}`} value={`${q.ano}-${q.numero}`}>
              {rotuloQuadrimestre(q)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="aps-equipe" className="block text-xs font-medium mb-1">
          Equipe (INE ou nome) — deixe vazio para o município
        </label>
        <input id="aps-equipe" name="equipe" maxLength={80} className={campo} placeholder="ESF Centro" />
      </div>
      <div>
        <label htmlFor="aps-resultado" className="block text-xs font-medium mb-1">
          Resultado (%)
        </label>
        <input id="aps-resultado" name="resultado" type="number" step="0.1" min={0} max={1000} required inputMode="decimal" className={campo} />
      </div>
      <div>
        <label htmlFor="aps-meta" className="block text-xs font-medium mb-1">
          Meta pactuada (%) — opcional
        </label>
        <input id="aps-meta" name="meta" type="number" step="0.1" min={0} max={1000} inputMode="decimal" className={campo} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="aps-obs" className="block text-xs font-medium mb-1">
          Observação — opcional
        </label>
        <input id="aps-obs" name="observacao" maxLength={300} className={campo} placeholder="ex: equipe ficou sem médico em março" />
      </div>
      {/* O select junta ano e quadrimestre; a ação espera os dois separados. */}
      <input type="hidden" name="ano" value={ano} readOnly />
      <input type="hidden" name="quadrimestre" value={numero} readOnly />
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pendente} className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition disabled:opacity-60">
          {pendente ? "Lançando…" : "Lançar resultado"}
        </button>
        <p className="text-xs text-muted">
          O número sai do painel do SIAPS; a meta, da ficha técnica do indicador. Lançar de novo o mesmo
          indicador no mesmo quadrimestre corrige o valor.
        </p>
      </div>
      {msg && (
        <p role={msg.tipo === "erro" ? "alert" : "status"} className="text-sm sm:col-span-2" style={{ color: msg.tipo === "erro" ? "var(--urgente)" : "var(--accent)" }}>
          {msg.texto}
        </p>
      )}
    </form>
  );
}

export function BotaoRemoverAps({ id }: { id: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => {
        if (!confirm("Remover este lançamento?")) return;
        iniciar(async () => {
          await removerResultadoAps(id);
        });
      }}
      className="text-xs text-muted hover:text-[color:var(--urgente)] transition"
      aria-label="Remover lançamento"
    >
      ×
    </button>
  );
}
