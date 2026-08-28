"use client";

import { useSearchParams } from "next/navigation";

const CONTATO_EMAIL = "arturmlo2005@gmail.com";

export default function ContatoEmail() {
  const searchParams = useSearchParams();
  const modulo = searchParams.get("modulo");

  const assunto = modulo
    ? `Proposta para o módulo ${modulo}`
    : "Contato via site CidadeIA";
  const mailto = `mailto:${CONTATO_EMAIL}?subject=${encodeURIComponent(assunto)}`;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">E-mail</p>
      <a href={mailto} className="text-brand font-semibold hover:underline">
        {CONTATO_EMAIL}
      </a>
      {modulo && (
        <p className="text-xs text-muted mt-1.5">
          Assunto pré-preenchido: proposta para o módulo <strong>{modulo}</strong>.
        </p>
      )}
    </div>
  );
}
