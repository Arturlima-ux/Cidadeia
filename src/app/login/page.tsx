"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { fazerLogin } from "./actions";

export default function LoginPage() {
  const [documento, setDocumento] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sessaoExpirada = useSearchParams().get("sessao") === "expirada";

  function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    startTransition(async () => {
      const resultado = await fazerLogin({ documento, senha });
      if (!resultado.ok) {
        setErro(resultado.erro);
      }
    });
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 overflow-hidden">
      {/* Eram dois círculos com `blur-3xl` e `animate-blob`: transformar um
          elemento borrado obriga o navegador a repintar a camada desfocada a
          cada quadro, e a animação é infinita — o computador nunca descansa
          enquanto a tela de login estiver aberta, que costuma ser o tempo todo
          num balcão de prefeitura.

          Gradiente radial dá a mesma mancha, parado e sem filtro. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 w-[28rem] h-[28rem]"
        style={{
          background:
            "radial-gradient(circle at center, var(--brand) 0%, transparent 65%)",
          opacity: 0.28,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-24 w-[26rem] h-[26rem]"
        style={{
          background:
            "radial-gradient(circle at center, var(--accent) 0%, transparent 65%)",
          opacity: 0.18,
        }}
      />

      <div className="relative w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Cidade
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-hero)" }}
            >
              IA
            </span>
          </h1>
          <p className="text-sm text-muted mt-2">
            Inteligência Artificial para Gestão Pública
          </p>
        </div>

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
              name="documento"
              autoComplete="username"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="000.000.000-00"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand transition"
              required
            />
          </div>

          {/* Quem chega de /sessao-encerrada foi devolvido porque a prefeitura
              da sessão não existe mais. Sem esta linha ele reaparece no
              formulário sem motivo aparente, o que parece defeito — e é
              exatamente a impressão que este caso já causou uma vez. */}
          {sessaoExpirada && !erro && (
            <p
              className="text-sm rounded-lg px-3 py-2 border leading-relaxed"
              style={{
                color: "var(--medio)",
                background: "var(--medio-tint)",
                borderColor: "var(--medio-borda)",
              }}
            >
              Sua sessão foi encerrada porque o cadastro da prefeitura mudou.
              Entre novamente.
            </p>
          )}

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
            {pending ? "Entrando..." : "Entrar"}
          </button>

          <div className="text-center">
            <Link
              href="/login/esqueci-senha"
              className="text-xs text-muted hover:text-brand transition"
            >
              Esqueceu sua senha?
            </Link>
          </div>
        </form>

        <div className="mt-6 text-center border-t border-border pt-6">
          <p className="text-sm text-muted mb-3">Primeiro acesso?</p>
          <Link
            href="/cadastro"
            className="inline-block w-full rounded-full border border-brand text-brand font-semibold text-sm py-2.5 hover:bg-brand-tint transition"
          >
            Cadastrar Prefeitura
          </Link>
        </div>
      </div>
    </div>
  );
}
