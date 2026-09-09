"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { solicitarRecuperacao } from "./actions";

export default function EsqueciSenhaPage() {
  const [documento, setDocumento] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    startTransition(async () => {
      const resultado = await solicitarRecuperacao({ documento });
      if (resultado.ok) {
        setEnviado(true);
      } else {
        setErro(resultado.erro);
      }
    });
  }

  return (
    <div className="tema-noite min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-2xl font-bold text-center mb-6">
          Recuperar senha
        </h1>

        {enviado ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
            <p className="text-sm leading-relaxed">
              Se este CPF/CNPJ tiver um e-mail cadastrado, enviamos um link para
              redefinir a senha. Confira sua caixa de entrada (e o spam).
            </p>
            <Link
              href="/login"
              className="inline-block text-sm font-semibold text-brand hover:underline"
            >
              ← Voltar para o login
            </Link>
          </div>
        ) : (
          <form
            onSubmit={aoEnviar}
            className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="documento">
                CPF/CNPJ
              </label>
              <input
                id="documento"
                autoComplete="username"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand transition"
                required
              />
            </div>

            {erro && (
              <p className="text-sm rounded-lg px-3 py-2 border" style={{ color: "var(--urgente)", background: "var(--urgente-tint)", borderColor: "var(--urgente-borda)" }}>
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full py-2.5 transition disabled:opacity-60"
            >
              {pending ? "Enviando..." : "Enviar link de recuperação"}
            </button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-xs text-muted hover:text-brand transition"
              >
                ← Voltar para o login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
