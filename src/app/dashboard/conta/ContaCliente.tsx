"use client";

import { useState, useTransition } from "react";
import type { ResultadoAcao } from "./actions";

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export function FormularioFoto({
  acao,
  nome,
  fotoUrlInicial,
}: {
  acao: (formData: FormData) => Promise<ResultadoAcao>;
  nome: string;
  fotoUrlInicial: string | null;
}) {
  const [fotoUrl, setFotoUrl] = useState(fotoUrlInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErro(null);
    const fd = new FormData();
    fd.set("foto", arquivo);
    startTransition(async () => {
      const resultado = await acao(fd);
      if (resultado.ok) {
        setFotoUrl(URL.createObjectURL(arquivo));
      } else {
        setErro(resultado.erro);
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className="w-16 h-16 rounded-full text-white flex items-center justify-center text-lg font-bold shrink-0 overflow-hidden bg-cover bg-center"
        style={
          fotoUrl
            ? { backgroundImage: `url(${fotoUrl})` }
            : { background: "var(--gradient-hero)" }
        }
      >
        {!fotoUrl && iniciais(nome)}
      </div>
      <div>
        <label className="inline-block text-xs font-semibold text-brand hover:underline cursor-pointer">
          {pending ? "Enviando..." : "Trocar foto"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={pending}
            onChange={enviar}
          />
        </label>
        <p className="text-[11px] text-muted mt-0.5">JPG, PNG ou WEBP até 3MB.</p>
        {erro && <p className="text-xs text-danger mt-1">{erro}</p>}
      </div>
    </div>
  );
}

export function FormularioPerfil({
  acao,
  nomeInicial,
  celularInicial,
  emailInicial,
}: {
  acao: (formData: FormData) => Promise<ResultadoAcao>;
  nomeInicial: string;
  celularInicial: string;
  emailInicial: string;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [celular, setCelular] = useState(celularInicial);
  const [email, setEmail] = useState(emailInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [pending, startTransition] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(false);
    const fd = new FormData();
    fd.set("nome", nome);
    fd.set("celular", celular);
    fd.set("email", email);
    startTransition(async () => {
      const resultado = await acao(fd);
      if (resultado.ok) setSucesso(true);
      else setErro(resultado.erro);
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <div>
        <label className="block text-xs font-medium mb-1">Nome</label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">E-mail</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="voce@exemplo.com"
          className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
        />
        <p className="text-[11px] text-muted mt-1">Usado só para recuperar sua senha.</p>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Celular</label>
        <input
          value={celular}
          onChange={(e) => setCelular(e.target.value)}
          placeholder="(85) 99999-9999"
          className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
        />
      </div>
      {erro && <p className="text-xs text-danger">{erro}</p>}
      {sucesso && <p className="text-xs text-brand-legivel">Salvo.</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-4 py-1.5 transition disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}

export function FormularioSenha({
  acao,
}: {
  acao: (formData: FormData) => Promise<ResultadoAcao>;
}) {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [pending, startTransition] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(false);
    const fd = new FormData();
    fd.set("senhaAtual", senhaAtual);
    fd.set("senhaNova", senhaNova);
    fd.set("confirmacao", confirmacao);
    startTransition(async () => {
      const resultado = await acao(fd);
      if (resultado.ok) {
        setSenhaAtual("");
        setSenhaNova("");
        setConfirmacao("");
        setSucesso(true);
      } else {
        setErro(resultado.erro);
      }
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <div>
        <label className="block text-xs font-medium mb-1">Senha atual</label>
        <input
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
          type="password"
          className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Nova senha</label>
        <input
          value={senhaNova}
          onChange={(e) => setSenhaNova(e.target.value)}
          type="password"
          placeholder="Mín. 8 caracteres, com letras e números"
          className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Confirmar nova senha</label>
        <input
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          type="password"
          className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
          required
        />
      </div>
      {erro && <p className="text-xs text-danger">{erro}</p>}
      {sucesso && <p className="text-xs text-brand-legivel">Senha alterada.</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-4 py-1.5 transition disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Trocar senha"}
      </button>
    </form>
  );
}
