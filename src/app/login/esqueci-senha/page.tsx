"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { solicitarRecuperacao } from "./actions";

export default function EsqueciSenhaPage() {
  const [documento, setDocumento] = useState("");
  const [enviado, setEnviado] = useState(false);
  // Quando o envio de e-mail não está configurado no servidor, a ação avisa.
  // Antes esse aviso era descartado e a tela dizia "enviamos um link" mesmo
  // assim — a pessoa esperava um e-mail que nunca ia chegar.
  const [naoEnviado, setNaoEnviado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    startTransition(async () => {
      const resultado = await solicitarRecuperacao({ documento });
      if (resultado.ok) {
        setEnviado(true);
        setNaoEnviado(resultado.avisoDev ?? null);
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
            {/* ── QUANDO O E-MAIL NÃO SAI, DIZER QUE NÃO SAIU ──
                A ação já avisava que o envio não está configurado, e a tela
                descartava o aviso: mostrava "enviamos um link" de qualquer
                jeito. A pessoa ficava esperando um e-mail que nunca ia chegar,
                sem ter como entrar no sistema e sem saber por quê.

                Dizer a verdade aqui não expõe nada: que o servidor tem ou não
                envio configurado é fato de infraestrutura, não diz se aquele
                CPF existe. A mensagem de sucesso continua ambígua de
                propósito, para a tela não virar consulta de quem tem conta. */}
            {naoEnviado ? (
              <>
                <p
                  className="text-sm leading-relaxed rounded-lg px-3 py-2.5 border text-left"
                  style={{
                    color: "var(--medio)",
                    background: "var(--medio-tint)",
                    borderColor: "var(--medio-borda)",
                  }}
                >
                  <strong>O e-mail não foi enviado.</strong> O envio automático
                  ainda não está configurado neste ambiente, então não adianta
                  esperar na caixa de entrada.
                </p>
                <p className="text-sm text-muted leading-relaxed">
                  Fale com a gente pelo suporte e a senha é redefinida na mão.
                </p>
                <Link
                  href="/suporte?assunto=senha"
                  className="inline-block text-sm font-semibold text-brand hover:underline"
                >
                  Falar com o suporte
                </Link>
              </>
            ) : (
              <p className="text-sm leading-relaxed">
                Se este CPF/CNPJ tiver um e-mail cadastrado, enviamos um link para
                redefinir a senha. Confira sua caixa de entrada (e o spam).
              </p>
            )}
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
