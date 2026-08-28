"use client";

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { redefinirSenha } from "./actions";

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <Formulario />
    </Suspense>
  );
}

function Formulario() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [pending, startTransition] = useTransition();

  function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!token) {
      setErro("Link inválido — falta o token de recuperação.");
      return;
    }
    if (novaSenha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    startTransition(async () => {
      const resultado = await redefinirSenha({ token, novaSenha });
      if (resultado.ok) {
        setSucesso(true);
      } else {
        setErro(resultado.erro);
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-2xl font-bold text-center mb-6">
          Criar nova senha
        </h1>

        {sucesso ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
            <p className="text-sm">Senha alterada com sucesso.</p>
            <Link
              href="/login"
              className="inline-block text-sm font-semibold text-brand hover:underline"
            >
              Ir para o login →
            </Link>
          </div>
        ) : (
          <form
            onSubmit={aoEnviar}
            className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="novaSenha">
                Nova senha
              </label>
              <input
                id="novaSenha"
                type="password"
                autoComplete="new-password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres, com letras e números"
                className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand transition"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="confirmar">
                Confirmar nova senha
              </label>
              <input
                id="confirmar"
                type="password"
                autoComplete="new-password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
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
              {pending ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
