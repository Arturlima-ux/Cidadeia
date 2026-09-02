"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { cadastrarPrefeitura } from "./actions";
import { validarCpfOuCnpj, formatarCpfCnpj } from "@/lib/documento";

type FormState = {
  nomePrefeitura: string;
  estado: string;
  municipio: string;
  cnpj: string;
  nomeResponsavel: string;
  documentoLogin: string;
  emailResponsavel: string;
  senha: string;
  confirmarSenha: string;
  // Honeypot — campo invisível pra humano, só bot preenche.
  site: string;
};

const ESTADO_INICIAL: FormState = {
  nomePrefeitura: "",
  estado: "",
  municipio: "",
  cnpj: "",
  nomeResponsavel: "",
  documentoLogin: "",
  emailResponsavel: "",
  senha: "",
  confirmarSenha: "",
  site: "",
};

const classeInput =
  "w-full rounded-lg border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand transition";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function CadastroPage() {
  const [form, setForm] = useState<FormState>(ESTADO_INICIAL);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function atualizar<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function validar(): string | null {
    if (!form.nomePrefeitura.trim()) return "Informe o nome da prefeitura.";
    if (form.estado.trim().length !== 2) return "Informe a sigla do estado (ex: CE).";
    if (!form.municipio.trim()) return "Informe o município.";
    if (!validarCpfOuCnpj(form.cnpj)) return "CNPJ inválido.";
    if (!form.nomeResponsavel.trim()) return "Informe seu nome.";
    if (!validarCpfOuCnpj(form.documentoLogin)) return "CPF/CNPJ de login inválido.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailResponsavel))
      return "Informe um e-mail válido (usado para recuperar sua senha).";
    if (form.senha.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
    if (form.senha !== form.confirmarSenha) return "As senhas não coincidem.";
    return null;
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }
    setErro(null);
    startTransition(async () => {
      const resultado = await cadastrarPrefeitura(form);
      // Se chegou aqui e resultado existe, deu erro (sucesso já fez redirect no server)
      if (resultado && !resultado.ok) {
        setErro(resultado.erro);
      }
    });
  }

  return (
    <div className="relative min-h-screen bg-background px-4 py-10 overflow-hidden">
      {/* Mesma troca do login: gradiente radial parado no lugar de um círculo
          borrado em animação infinita, que repintava a camada desfocada a cada
          quadro enquanto a página estivesse aberta. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 w-[26rem] h-[26rem]"
        style={{
          background:
            "radial-gradient(circle at center, var(--brand) 0%, transparent 65%)",
          opacity: 0.18,
        }}
      />

      <div className="relative max-w-md mx-auto animate-fade-in-up">
        <div className="text-center mb-8">
          <Link href="/login" className="font-serif text-2xl font-bold text-foreground">
            Cidade
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-hero)" }}
            >
              IA
            </span>
          </Link>
          <p className="text-sm text-muted mt-3 max-w-md mx-auto leading-relaxed">
            Leva menos de um minuto. Você ativa os módulos que quiser depois, direto no painel.
          </p>
        </div>

        <form onSubmit={enviar} className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
          <input
            type="text"
            name="site"
            value={form.site}
            onChange={(e) => atualizar("site", e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] w-px h-px opacity-0"
          />
          <Campo label="Nome da prefeitura">
            <input
              className={classeInput}
              value={form.nomePrefeitura}
              onChange={(e) => atualizar("nomePrefeitura", e.target.value)}
              placeholder="Prefeitura Municipal de..."
              required
            />
          </Campo>

          <div className="grid grid-cols-2 gap-4">
            <Campo label="Estado">
              <input
                className={classeInput}
                value={form.estado}
                maxLength={2}
                onChange={(e) => atualizar("estado", e.target.value.toUpperCase())}
                placeholder="CE"
                required
              />
            </Campo>
            <Campo label="Município">
              <input
                className={classeInput}
                value={form.municipio}
                onChange={(e) => atualizar("municipio", e.target.value)}
                placeholder="Fortaleza"
                required
              />
            </Campo>
          </div>

          <Campo label="CNPJ">
            <input
              className={classeInput}
              value={form.cnpj}
              onChange={(e) => atualizar("cnpj", formatarCpfCnpj(e.target.value))}
              placeholder="00.000.000/0001-00"
              required
            />
          </Campo>

          <div className="border-t border-border pt-5">
            <h2 className="font-semibold text-sm mb-4">Seu acesso</h2>
            <div className="space-y-4">
              <Campo label="Seu nome">
                <input
                  className={classeInput}
                  value={form.nomeResponsavel}
                  onChange={(e) => atualizar("nomeResponsavel", e.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </Campo>
              <Campo label="CPF/CNPJ (usado para login)">
                <input
                  className={classeInput}
                  value={form.documentoLogin}
                  onChange={(e) => atualizar("documentoLogin", formatarCpfCnpj(e.target.value))}
                  placeholder="000.000.000-00"
                  required
                />
              </Campo>
              <Campo label="E-mail (usado para recuperar sua senha)">
                <input
                  className={classeInput}
                  type="email"
                  value={form.emailResponsavel}
                  onChange={(e) => atualizar("emailResponsavel", e.target.value)}
                  placeholder="voce@exemplo.com"
                  required
                />
              </Campo>
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Senha">
                  <input
                    className={classeInput}
                    type="password"
                    value={form.senha}
                    onChange={(e) => atualizar("senha", e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                  />
                </Campo>
                <Campo label="Confirmar senha">
                  <input
                    className={classeInput}
                    type="password"
                    value={form.confirmarSenha}
                    onChange={(e) => atualizar("confirmarSenha", e.target.value)}
                    required
                  />
                </Campo>
              </div>
            </div>
          </div>

          {erro && (
            <p className="text-sm rounded-lg px-3 py-2 border" style={{ color: "var(--urgente)", background: "var(--urgente-tint)", borderColor: "var(--urgente-borda)" }}>
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full py-3 transition disabled:opacity-60"
          >
            {pending ? "Criando sua conta..." : "Criar conta"}
          </button>

          <p className="text-xs text-muted text-center">
            Já tem conta?{" "}
            <Link href="/login" className="font-semibold text-brand hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
