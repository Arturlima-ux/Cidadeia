"use client";

import { useState, useTransition } from "react";
import type { ResultadoCriarUsuario } from "./actions";
import { formatarCpfCnpj } from "@/lib/documento";

const SECRETARIAS = [
  { valor: "saude", label: "Saúde" },
  { valor: "educacao", label: "Educação" },
  { valor: "obras", label: "Obras" },
  { valor: "licitacoes", label: "Licitações" },
];

export default function FormularioUsuario({
  acao,
}: {
  acao: (formData: FormData) => Promise<ResultadoCriarUsuario>;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [secretaria, setSecretaria] = useState("saude");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData();
    fd.set("nome", nome);
    fd.set("documento", documento);
    fd.set("email", email);
    fd.set("senha", senha);
    fd.set("secretaria", secretaria);

    startTransition(async () => {
      const resultado = await acao(fd);
      if (resultado.ok) {
        setNome("");
        setDocumento("");
        setEmail("");
        setSenha("");
        setAberto(false);
      } else {
        setErro(resultado.erro);
      }
    });
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="text-xs font-semibold text-brand hover:underline"
      >
        + Novo usuário
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setAberto(false)}
        className="text-xs font-semibold text-muted hover:underline"
      >
        Cancelar
      </button>
      <form
        onSubmit={enviar}
        className="absolute right-0 z-10 mt-2 w-72 bg-card border border-border rounded-xl p-4 shadow-lg space-y-3"
      >
        <p className="text-xs font-semibold text-muted">Criar conta de secretário(a)</p>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome completo"
          className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
          required
        />
        <input
          value={documento}
          onChange={(e) => setDocumento(formatarCpfCnpj(e.target.value))}
          placeholder="CPF/CNPJ (login)"
          className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
          required
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="E-mail (opcional — recuperação de senha)"
          className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
        />
        <input
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          type="password"
          placeholder="Senha (mín. 8 caracteres)"
          className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
          required
        />
        <select
          value={secretaria}
          onChange={(e) => setSecretaria(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
        >
          {SECRETARIAS.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.label}
            </option>
          ))}
        </select>

        {erro && <p className="text-xs text-danger">{erro}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full py-2 transition disabled:opacity-60"
        >
          {pending ? "Criando..." : "Criar usuário"}
        </button>
      </form>
    </div>
  );
}
