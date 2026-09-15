"use client";

import { useState, useTransition } from "react";
import { registrarLeadRaioX } from "@/app/raio-x/lead-actions";
import { CARGOS_LEAD } from "@/lib/leads";
import { IconCheck } from "@/components/icons";

/**
 * "Receba este Raio-X por e-mail, com a leitura de cada número."
 *
 * A mensagem de sucesso depende do que aconteceu de verdade: "enviado para
 * o seu e-mail" só quando o servidor entregou; senão, "recebido — chega em
 * até um dia útil", e a equipe encaminha. Ver lead-actions.ts.
 */
export default function CapturaLeadRaioX({ codigoIbge, municipio }: { codigoIbge: string; municipio: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<{ texto: string; campo?: string } | null>(null);
  const [feito, setFeito] = useState<{ enviado: boolean; email: string } | null>(null);

  function aoEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "");
    iniciar(async () => {
      const r = await registrarLeadRaioX({
        codigoIbge,
        nome: f.get("nome"),
        cargo: f.get("cargo"),
        email,
      });
      if (r.ok) setFeito({ enviado: r.enviadoParaVoce, email });
      else setErro({ texto: r.erro, campo: r.campo });
    });
  }

  if (feito) {
    return (
      <div className="rounded-2xl border p-5" style={{ background: "var(--accent-tint)", borderColor: "var(--info-borda)" }}>
        <p className="font-semibold text-sm flex items-center gap-2">
          <IconCheck className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} strokeWidth={3} />
          {feito.enviado ? `Enviado para ${feito.email}.` : "Recebido."}
        </p>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          {feito.enviado
            ? "O Raio-X de " + municipio + " com a leitura de cada número está na sua caixa de entrada (confira o spam)."
            : "O Raio-X de " + municipio + " com a leitura de cada número chega em " + feito.email + " em até um dia útil."}
        </p>
      </div>
    );
  }

  const campo = (nome: string) =>
    `w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand transition ${
      erro?.campo === nome ? "border-[color:var(--urgente)]" : "border-border"
    }`;

  return (
    <form onSubmit={aoEnviar} className="rounded-2xl border border-border p-5 sm:p-6" style={{ background: "var(--card)" }}>
      <h3 className="font-serif text-lg font-bold">Receba este Raio-X por e-mail</h3>
      <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-[60ch]">
        Com a leitura de cada número — o que ele diz, o que não diz, e o que perguntar à
        prefeitura. Sem cadastro, sem cartão.
      </p>
      <div className="grid sm:grid-cols-[1fr_1fr] gap-3 mt-4">
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="lead-nome">Nome</label>
          <input id="lead-nome" name="nome" required autoComplete="name" className={campo("nome")} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="lead-cargo">Você é</label>
          <select id="lead-cargo" name="cargo" required defaultValue="" className={campo("cargo")}>
            <option value="" disabled>Escolha…</option>
            {CARGOS_LEAD.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3">
        <label className="block text-xs font-medium mb-1" htmlFor="lead-email">E-mail</label>
        <input id="lead-email" name="email" type="email" required autoComplete="email" className={campo("email")} />
      </div>
      {erro && (
        <p className="text-sm mt-3 rounded-lg px-3 py-2 border" style={{ color: "var(--urgente)", background: "var(--urgente-tint)", borderColor: "var(--urgente-borda)" }}>
          {erro.texto}
        </p>
      )}
      <button
        type="submit"
        disabled={pendente}
        className="mt-4 bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-5 py-3 transition shadow-elevated disabled:opacity-60"
      >
        {pendente ? "Enviando…" : "Quero o Raio-X por e-mail  →"}
      </button>
      <p className="text-[11px] text-muted mt-3 leading-relaxed">
        Usamos o e-mail só para mandar o Raio-X e, se você quiser, falar sobre o CidadeIA.
        Nada de lista de terceiros.
      </p>
    </form>
  );
}
