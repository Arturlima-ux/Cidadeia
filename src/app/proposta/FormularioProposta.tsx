"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { enviarPedidoProposta } from "./actions";
import { IconCheck } from "@/components/icons";

/**
 * O pedido de proposta, enviado pelo sistema.
 *
 * Era um "mailto:" — dependia do programa de e-mail do visitante, que numa
 * máquina de prefeitura muitas vezes não existe, e a pessoa clicava e "não
 * acontecia nada". Agora: quatro campos, um botão, e o pedido é gravado e
 * enviado pelo servidor. O que ela montou no simulador já vem preenchido e
 * aparece ao lado, para conferir.
 */
export default function FormularioProposta({
  codigoIbge,
  modulos,
}: {
  codigoIbge: string;
  modulos: string[];
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<{ texto: string; campo?: string } | null>(null);
  const [enviado, setEnviado] = useState<{ protocolo: string; emailEnviado: boolean } | null>(null);

  function aoEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const f = new FormData(e.currentTarget);
    iniciar(async () => {
      const r = await enviarPedidoProposta({
        codigoIbge,
        modulos,
        nome: f.get("nome"),
        cargo: f.get("cargo"),
        email: f.get("email"),
        telefone: f.get("telefone"),
        observacao: f.get("observacao"),
      });
      if (r.ok) setEnviado({ protocolo: r.protocolo, emailEnviado: r.emailEnviado });
      else setErro({ texto: r.erro, campo: r.campo });
    });
  }

  if (enviado) {
    return (
      <div
        className="rounded-2xl border p-6"
        style={{ background: "var(--accent-tint)", borderColor: "var(--info-borda)" }}
      >
        <p className="font-serif text-xl font-bold flex items-center gap-2">
          <IconCheck className="w-5 h-5 shrink-0" style={{ color: "var(--accent)" }} strokeWidth={3} />
          Pedido recebido
        </p>
        <p className="text-sm text-muted mt-3 leading-relaxed">
          Protocolo <strong className="text-foreground font-mono">{enviado.protocolo}</strong>. A
          proposta e o termo de referência vão para o e-mail informado em até um dia útil.
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 text-sm font-semibold">
          <Link href="/kit" className="text-brand hover:underline">
            Enquanto isso, baixe o kit de contratação →
          </Link>
          <Link href="/" className="text-muted hover:text-foreground transition">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  const campo = (nome: string) =>
    `w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-brand transition ${
      erro?.campo === nome ? "border-[color:var(--urgente)]" : "border-border"
    }`;

  return (
    <form onSubmit={aoEnviar} className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-elevated">
      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="nome">
          Seu nome
        </label>
        <input id="nome" name="nome" required autoComplete="name" className={campo("nome")} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="cargo">
            Cargo
          </label>
          <input
            id="cargo"
            name="cargo"
            placeholder="Prefeito(a), secretário(a), assessor(a)…"
            autoComplete="organization-title"
            className={campo("cargo")}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="telefone">
            Telefone <span className="text-muted font-normal">(opcional)</span>
          </label>
          <input id="telefone" name="telefone" type="tel" autoComplete="tel" className={campo("telefone")} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="email">
          E-mail para receber a proposta
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={campo("email")} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="observacao">
          Alguma observação? <span className="text-muted font-normal">(opcional)</span>
        </label>
        <textarea
          id="observacao"
          name="observacao"
          rows={3}
          placeholder="Prazo, situação atual, o que a prefeitura usa hoje…"
          className={campo("observacao")}
        />
      </div>

      {erro && (
        <p
          className="text-sm rounded-lg px-3 py-2 border leading-relaxed"
          style={{ color: "var(--urgente)", background: "var(--urgente-tint)", borderColor: "var(--urgente-borda)" }}
        >
          {erro.texto}
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="w-full bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-5 py-3.5 transition shadow-elevated disabled:opacity-60"
      >
        {pendente ? "Enviando…" : "Pedir a proposta e o termo de referência  →"}
      </button>
      <p className="text-xs text-muted leading-relaxed">
        Sem cartão, sem compromisso. A proposta vem com o termo de referência
        pronto para o jurídico conferir.
      </p>
    </form>
  );
}
