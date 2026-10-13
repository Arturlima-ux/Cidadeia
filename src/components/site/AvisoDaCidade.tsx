"use client";

import { useState, useTransition } from "react";
import { inscreverAvisoDaCidade } from "@/app/_atendimento/aviso-actions";
import { CARGOS_LEAD } from "@/lib/leads";

// ── O AVISO GRÁTIS DA CIDADE ──
// Três campos e a promessa que o sistema cumpre: um e-mail quando o RREO ou o
// RGF da cidade estiver para vencer, vencer ou for entregue. Ver
// lib/aviso-da-cidade.ts.

export default function AvisoDaCidade({ codigoIbge, municipio }: { codigoIbge: string; municipio: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<{ texto: string; campo?: string } | null>(null);
  const [feito, setFeito] = useState<{ ja: boolean } | null>(null);

  function enviar(form: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await inscreverAvisoDaCidade({
        codigoIbge,
        nome: form.get("nome"),
        cargo: form.get("cargo"),
        email: form.get("email"),
      });
      if (r.ok) setFeito({ ja: r.jaInscrito });
      else setErro({ texto: r.erro, campo: r.campo });
    });
  }

  const campo = (n: string) =>
    `w-full rounded-xl border bg-transparent px-4 py-3 text-base ${erro?.campo === n ? "border-[color:var(--urgente)]" : "border-border"}`;

  return (
    <div className="rounded-[22px] border border-border p-5 sm:p-6" style={{ background: "var(--card)" }}>
      {feito ? (
        <div aria-live="polite">
          <p className="font-semibold">{feito.ja ? `Você já recebe o aviso de ${municipio}.` : `Aviso de ${municipio} ativado.`}</p>
          <p className="text-sm text-muted mt-1.5 leading-relaxed">
            {feito.ja
              ? "Nada mudou: o próximo e-mail sai quando houver novidade no Tesouro."
              : "O primeiro e-mail, com a situação de hoje, chega amanhã de manhã. Depois, só quando houver novidade."}
          </p>
        </div>
      ) : (
        <form action={enviar} className="grid gap-3">
          <div>
            <p className="font-semibold">Avise-me sobre {municipio}. Grátis.</p>
            <p className="text-sm text-muted mt-1 leading-relaxed">
              Um e-mail quando o RREO ou o RGF estiver a 7 dias do prazo sem entrega, vencer ou for entregue no Tesouro.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-2.5">
            <label className="grid gap-1 text-xs text-muted">
              Nome
              <input name="nome" required autoComplete="name" className={campo("nome")} />
            </label>
            <label className="grid gap-1 text-xs text-muted">
              Você é
              <select name="cargo" required defaultValue="" className={campo("cargo")} style={{ background: "var(--card)" }}>
                <option value="" disabled>
                  Escolha
                </option>
                {CARGOS_LEAD.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs text-muted">
              E-mail
              <input name="email" type="email" required autoComplete="email" className={campo("email")} />
            </label>
          </div>
          {erro && (
            <p className="text-sm rounded-xl px-4 py-2.5" style={{ background: "var(--urgente-tint)", color: "var(--urgente)" }}>
              {erro.texto}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="submit"
              disabled={pendente}
              className="rounded-full border px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60"
              style={{ borderColor: "color-mix(in oklab, var(--brand) 50%, var(--border))", color: "var(--brand-claro)", background: "var(--brand-tint)" }}
            >
              {pendente ? "Ativando…" : "Ativar o aviso"}
            </button>
            <span className="text-xs text-muted">Só quando houver novidade. Para parar, um clique no fim de qualquer aviso.</span>
          </div>
        </form>
      )}
    </div>
  );
}
