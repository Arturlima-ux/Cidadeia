"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h1 className="font-serif text-xl font-bold mb-2">Algo deu errado</h1>
        <p className="text-sm text-muted mb-5 leading-relaxed">
          Ocorreu um erro inesperado. Você pode tentar de novo ou voltar para o
          login.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => unstable_retry()}
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
      </div>
    </div>
  );
}
