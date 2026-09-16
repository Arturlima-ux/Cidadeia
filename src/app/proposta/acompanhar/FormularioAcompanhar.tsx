"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { acompanharPedido, type Acompanhamento } from "./actions";

export default function FormularioAcompanhar({ protocoloInicial }: { protocoloInicial: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<{ texto: string; campo?: string } | null>(null);
  const [pedido, setPedido] = useState<Acompanhamento | null>(null);

  function aoEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const f = new FormData(e.currentTarget);
    iniciar(async () => {
      const r = await acompanharPedido({ protocolo: f.get("protocolo"), email: f.get("email") });
      if (r.ok) setPedido(r.pedido);
      else {
        setPedido(null);
        setErro({ texto: r.erro, campo: r.campo });
      }
    });
  }

  const campo = (nome: string) =>
    `w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-brand transition ${
      erro?.campo === nome ? "border-[color:var(--urgente)]" : "border-border"
    }`;

  return (
    <div className="space-y-5">
      <form onSubmit={aoEnviar} className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-elevated">
        <div className="grid sm:grid-cols-[180px_1fr] gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="protocolo">
              Protocolo
            </label>
            <input
              id="protocolo"
              name="protocolo"
              required
              defaultValue={protocoloInicial}
              placeholder="4D436F83"
              className={`${campo("protocolo")} font-mono uppercase`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="email">
              E-mail usado no pedido
            </label>
            <input id="email" name="email" type="email" required autoComplete="email" className={campo("email")} />
          </div>
        </div>
        {erro && (
          <p
            className="text-sm rounded-lg px-3 py-2 border"
            style={{ color: "var(--urgente)", background: "var(--urgente-tint)", borderColor: "var(--urgente-borda)" }}
          >
            {erro.texto}
          </p>
        )}
        <button
          type="submit"
          disabled={pendente}
          className="bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-5 py-3 transition shadow-elevated disabled:opacity-60"
        >
          {pendente ? "Consultando…" : "Ver o andamento  →"}
        </button>
      </form>

      {pedido && (
        <div className="rounded-2xl border border-border p-6" style={{ background: "var(--card)" }}>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-serif text-xl font-bold">
              {pedido.municipio}/{pedido.uf}
            </p>
            <span
              className="text-[11px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border"
              style={{ color: "var(--accent)", background: "var(--accent-tint)", borderColor: "var(--info-borda)" }}
            >
              {pedido.rotulo}
            </span>
          </div>
          <p className="text-sm text-muted mt-2">
            {pedido.modulos.join(" + ") || "sem módulos marcados"} · protocolo{" "}
            <span className="font-mono text-foreground">{pedido.protocolo}</span>
          </p>
          <p className="text-sm mt-4 leading-relaxed">{pedido.mensagem}</p>

          {pedido.linkCadastro ? (
            <div className="mt-5 rounded-xl border border-border p-4">
              <p className="font-semibold text-sm">Crie a conta da prefeitura</p>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                É nela que os módulos são ativados quando o contrato for assinado. Já vem preenchida
                com o que você informou.
              </p>
              <Link
                href={pedido.linkCadastro}
                className="inline-block mt-3 bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-5 py-2.5 transition"
              >
                Criar a conta&nbsp;&nbsp;→
              </Link>
            </div>
          ) : (
            <p className="text-sm mt-4">
              Conta: <strong>{pedido.contaNome}</strong>.{" "}
              <Link href="/login" className="font-semibold text-brand hover:underline">
                Entrar no painel →
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
