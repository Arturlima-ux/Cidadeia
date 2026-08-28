"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto mt-16 text-center bg-card border border-border rounded-2xl p-6 shadow-sm">
      <h1 className="font-serif text-xl font-bold mb-2">
        Não foi possível carregar esta página
      </h1>
      <p className="text-sm text-muted mb-5 leading-relaxed">
        Ocorreu um erro inesperado ao carregar este módulo. Tente novamente —
        se persistir, volte à visão geral.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => unstable_retry()}
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
    </div>
  );
}
