"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ehErroDeVersao, recarregarPorVersao } from "@/lib/erro-de-versao";

export default function DashboardErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const [recarregando, setRecarregando] = useState(false);

  useEffect(() => {
    console.error(error);

    // Mesmo motivo da fronteira raiz: aba velha depois de um deploy pede
    // pedaços de JavaScript que já não existem, e remontar o mesmo bundle
    // falha para sempre. Ver lib/erro-de-versao.ts.
    if (ehErroDeVersao(error) && recarregarPorVersao()) {
      setRecarregando(true);
    }
  }, [error]);

  // Sem `tema-noite` aqui: esta fronteira só pega erro DENTRO do painel, que
  // já está envolvido pelo tema no layout. Herdar é o certo — declarar de novo
  // criaria dois lugares para manter em sincronia.
  return (
    <div className="max-w-md mx-auto mt-16 text-center bg-card border border-border rounded-2xl p-6 shadow-sm">
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
          <h1 className="font-serif text-xl font-bold mb-2">
            Não foi possível carregar esta página
          </h1>
          <p className="text-sm text-muted mb-5 leading-relaxed">
            Ocorreu um erro inesperado ao carregar este módulo. Tente novamente —
            se persistir, volte à visão geral.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                if (ehErroDeVersao(error)) window.location.reload();
                else unstable_retry();
              }}
              className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-4 py-2 transition"
            >
              Tentar de novo
            </button>
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-muted hover:text-brand transition"
            >
              Voltar à visão geral
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
