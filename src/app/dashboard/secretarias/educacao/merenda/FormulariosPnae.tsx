"use client";

import { useRef, useState, useTransition } from "react";
import { registrarCompraPnae, registrarRepassePnae, removerCompraPnae } from "../merenda-actions";
import { MODALIDADES_COMPRA, MOTIVOS_DISPENSA_AF } from "@/lib/pnae";

const campo = "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand";

/** O repasse do ano — o denominador dos 30%. Uma linha por ano. */
export function FormularioRepasse({
  ano,
  valorAtual,
  motivoAtual,
}: {
  ano: number;
  valorAtual: number | null;
  motivoAtual: string | null;
}) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setMsg(null);
        iniciar(async () => {
          const r = await registrarRepassePnae(fd);
          setMsg(r.ok ? { tipo: "ok", texto: "Salvo." } : { tipo: "erro", texto: r.erro });
        });
      }}
      className="bg-card border border-border rounded-2xl p-4 grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] items-end"
    >
      <input type="hidden" name="ano" value={ano} />
      <div>
        <label htmlFor="pnae-repasse" className="block text-xs font-medium mb-1">
          Repasse do PNAE recebido em {ano} (R$)
        </label>
        <input
          id="pnae-repasse"
          name="valor"
          type="number"
          min={0}
          step="0.01"
          required
          inputMode="decimal"
          defaultValue={valorAtual ?? ""}
          className={campo}
        />
      </div>
      <div>
        <label htmlFor="pnae-motivo" className="block text-xs font-medium mb-1">
          Se não alcançar os 30%, o motivo legal (art. 14, §2º)
        </label>
        <select id="pnae-motivo" name="motivoDispensa" className={campo} defaultValue={motivoAtual ?? ""}>
          <option value="">— nenhum, a meta deve ser cumprida</option>
          {MOTIVOS_DISPENSA_AF.map((m) => (
            <option key={m.chave} value={m.chave}>
              {m.rotulo}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pendente}
        className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition disabled:opacity-60 whitespace-nowrap"
      >
        {pendente ? "…" : "Salvar"}
      </button>
      <p className="text-[11px] text-muted sm:col-span-3 leading-relaxed">
        O valor sai do extrato da conta do PNAE ou do portal do FNDE. Os 30% da Lei 11.947/2009 são
        calculados <strong>sobre o repasse</strong>, não sobre o total gasto — por isso ele é pedido aqui,
        e não estimado pelo sistema.
      </p>
      {msg && (
        <p role={msg.tipo === "erro" ? "alert" : "status"} className="text-sm sm:col-span-3" style={{ color: msg.tipo === "erro" ? "var(--urgente)" : "var(--accent)" }}>
          {msg.texto}
        </p>
      )}
    </form>
  );
}

/** Cada compra da merenda, com a marca da agricultura familiar. */
export function FormularioCompra({ ano }: { ano: number }) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [af, setAf] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setMsg(null);
        iniciar(async () => {
          const r = await registrarCompraPnae(fd);
          if (r.ok) {
            setMsg({ tipo: "ok", texto: "Compra lançada." });
            form.current?.reset();
            setAf(false);
          } else setMsg({ tipo: "erro", texto: r.erro });
        });
      }}
      className="bg-card border border-border rounded-2xl p-4 grid gap-3 sm:grid-cols-2"
    >
      <input type="hidden" name="ano" value={ano} />
      <div className="sm:col-span-2">
        <label htmlFor="cp-desc" className="block text-xs font-medium mb-1">
          O que foi comprado
        </label>
        <input id="cp-desc" name="descricao" required maxLength={200} className={campo} placeholder="Hortifrúti do 2º bimestre" />
      </div>
      <div>
        <label htmlFor="cp-forn" className="block text-xs font-medium mb-1">
          Fornecedor
        </label>
        <input id="cp-forn" name="fornecedor" maxLength={160} className={campo} placeholder="Cooperativa dos Agricultores de Vila Nova" />
      </div>
      <div>
        <label htmlFor="cp-valor" className="block text-xs font-medium mb-1">
          Valor (R$)
        </label>
        <input id="cp-valor" name="valor" type="number" min={0.01} step="0.01" required inputMode="decimal" className={campo} />
      </div>
      <div>
        <label htmlFor="cp-data" className="block text-xs font-medium mb-1">
          Data da compra
        </label>
        <input id="cp-data" name="dataCompra" type="date" required className={campo} />
      </div>
      <div>
        <label htmlFor="cp-mod" className="block text-xs font-medium mb-1">
          Modalidade
        </label>
        <select
          id="cp-mod"
          name="modalidade"
          className={campo}
          defaultValue="outra"
          onChange={(e) => {
            // Chamada pública é o caminho legal da agricultura familiar
            // (art. 14, §1º): marcar uma coisa sugere a outra.
            if (e.target.value === "chamada_publica") setAf(true);
          }}
        >
          {MODALIDADES_COMPRA.map((m) => (
            <option key={m.chave} value={m.chave}>
              {m.rotulo}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="cp-doc" className="block text-xs font-medium mb-1">
          Nota / contrato — opcional
        </label>
        <input id="cp-doc" name="documento" maxLength={80} className={campo} placeholder="NF 1234" />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2 rounded-xl border border-border px-3 py-2.5">
        <input
          type="checkbox"
          name="agriculturaFamiliar"
          checked={af}
          onChange={(e) => setAf(e.target.checked)}
          className="accent-[var(--brand)]"
        />
        <span>
          <strong>Compra direta da agricultura familiar</strong>
          <span className="block text-xs text-muted">Entra nos 30% do art. 14 da Lei 11.947/2009.</span>
        </span>
      </label>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pendente}
          className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition disabled:opacity-60"
        >
          {pendente ? "Lançando…" : "Lançar compra"}
        </button>
        {msg && (
          <p role={msg.tipo === "erro" ? "alert" : "status"} className="text-sm" style={{ color: msg.tipo === "erro" ? "var(--urgente)" : "var(--accent)" }}>
            {msg.texto}
          </p>
        )}
      </div>
    </form>
  );
}

export function BotaoRemoverCompra({ id }: { id: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => {
        if (!confirm("Remover este lançamento?")) return;
        iniciar(async () => {
          await removerCompraPnae(id);
        });
      }}
      className="text-xs text-muted hover:text-[color:var(--urgente)] transition"
      aria-label="Remover compra"
    >
      ×
    </button>
  );
}
