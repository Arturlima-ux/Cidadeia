"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { criarContaEquipe } from "./actions";

const CAMPOS = [
  { nome: "nome", rotulo: "Seu nome", tipo: "text", auto: "name" },
  { nome: "documento", rotulo: "Seu CPF", tipo: "text", auto: "off", ajuda: "É com ele que você entra no login." },
  { nome: "email", rotulo: "E-mail", tipo: "email", auto: "email", ajuda: "O mesmo que está em ADMIN_EMAILS." },
  { nome: "senha", rotulo: "Senha", tipo: "password", auto: "new-password", ajuda: "Pelo menos 8 caracteres, com letras e números." },
  { nome: "codigo", rotulo: "Código de criação", tipo: "password", auto: "off", ajuda: "O valor de EQUIPE_CODIGO, na Vercel." },
] as const;

export default function FormularioEquipe() {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<{ texto: string; campo?: string } | null>(null);

  return (
    <form
      className="flex flex-col gap-5"
      action={(fd) => {
        setErro(null);
        iniciar(async () => {
          const r = await criarContaEquipe(Object.fromEntries(fd.entries()));
          if (r && !r.ok) setErro({ texto: r.erro, campo: r.campo });
        });
      }}
    >
      {CAMPOS.map((c) => (
        <div key={c.nome}>
          <label htmlFor={`equipe-${c.nome}`} className="block text-sm font-medium mb-1.5">
            {c.rotulo}
          </label>
          <input
            id={`equipe-${c.nome}`}
            name={c.nome}
            type={c.tipo}
            autoComplete={c.auto}
            required
            className="w-full rounded-xl border bg-transparent px-4 py-3 text-sm outline-none focus:border-brand"
            style={{ borderColor: erro?.campo === c.nome ? "var(--urgente)" : "var(--border)" }}
          />
          {"ajuda" in c && <p className="text-xs text-muted mt-1.5">{c.ajuda}</p>}
        </div>
      ))}

      {erro && (
        <p role="alert" className="text-sm" style={{ color: "var(--urgente)" }}>
          {erro.texto}
        </p>
      )}

      <button
        disabled={pendente}
        className="bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full px-6 py-3.5 transition disabled:opacity-50"
      >
        {pendente ? "Criando…" : "Criar conta da equipe"}
      </button>
      <p className="text-sm text-muted text-center">
        Já tem conta?{" "}
        <Link href="/login" className="text-brand-claro hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
