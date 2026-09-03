"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ehErroDeVersao, recarregarPorVersao } from "@/lib/erro-de-versao";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const [recarregando, setRecarregando] = useState(false);

  useEffect(() => {
    console.error(error);

    // Aba velha depois de um deploy: os pedaços de JavaScript que ela pede não
    // existem mais. `unstable_retry` remontaria o MESMO bundle quebrado e
    // falharia igual, para sempre — o usuário fica preso achando que o sistema
    // caiu. Só recarregar de verdade busca os nomes novos.
    if (ehErroDeVersao(error) && recarregarPorVersao()) {
      setRecarregando(true);
    }
  }, [error]);

  return (
    // `tema-noite` porque o produto inteiro é escuro. Sem isto a tela de erro
    // aparece branca no meio de um sistema escuro, e o susto do erro vem
    // acompanhado da impressão de que a página nem é do mesmo site.
    <div className="tema-noite min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center bg-card border border-border rounded-2xl p-6 shadow-sm">
        {recarregando ? (
          <>
            <h1 className="font-serif text-xl font-bold mb-2">Atualizando…</h1>
            <p className="text-sm text-muted leading-relaxed">
              Saiu uma versão nova enquanto esta aba estava aberta. Recarregando
              para pegar a atual.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-serif text-xl font-bold mb-2">Algo deu errado</h1>
            <p className="text-sm text-muted mb-5 leading-relaxed">
              Ocorreu um erro inesperado. Você pode tentar de novo ou voltar para o
              login.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  // Recarga de verdade em vez de remontar: cobre também o caso
                  // em que a recarga automática não pôde rodar — aba anônima,
                  // armazenamento bloqueado — e nunca é pior que `retry`.
                  if (ehErroDeVersao(error)) window.location.reload();
                  else unstable_retry();
                }}
                className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-4 py-2 transition"
              >
                Tentar de novo
              </button>
              <Link
                href="/login"
                className="text-sm font-semibold text-muted hover:text-brand transition"
              >
                Ir para o login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
