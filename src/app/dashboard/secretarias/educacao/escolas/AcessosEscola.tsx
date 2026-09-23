"use client";

import { useRef, useState, useTransition } from "react";
import { criarAcessoEscola, removerAcessoEscola } from "../rede-actions";

// ── ACESSO PRÓPRIO DA DIREÇÃO ──
// O secretário cria aqui; a diretora entra com CPF e senha e cai direto na
// ficha da escola dela — e só nela.

type Acesso = { id: string; nome: string; email: string | null };

export default function AcessosEscola({
  escolaId,
  nomeEscola,
  acessos,
}: {
  escolaId: string;
  nomeEscola: string;
  acessos: Acesso[];
}) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [aberto, setAberto] = useState(acessos.length === 0);
  const form = useRef<HTMLFormElement>(null);
  const campo = "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand";

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">Acesso da direção</h2>
          <p className="text-sm text-muted mt-1 leading-relaxed max-w-2xl">
            Quem dirige {nomeEscola} entra com o próprio CPF e senha e vê só esta ficha — registra o que
            acontece aqui, na hora, sem passar pela secretaria.
          </p>
        </div>
        {!aberto && (
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="text-sm font-semibold border border-border rounded-full px-4 py-2 hover:border-brand hover:text-brand transition"
          >
            Criar acesso
          </button>
        )}
      </div>

      {acessos.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {acessos.map((a) => (
            <li key={a.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">{a.nome}</p>
                {a.email && <p className="text-xs text-muted truncate">{a.email}</p>}
              </div>
              <button
                type="button"
                disabled={pendente}
                onClick={() => {
                  if (!confirm(`Remover o acesso de ${a.nome}?`)) return;
                  iniciar(async () => {
                    const r = await removerAcessoEscola(a.id);
                    if (!r.ok) setMsg({ tipo: "erro", texto: r.erro });
                  });
                }}
                className="text-xs font-semibold text-muted hover:text-[color:var(--urgente)] transition shrink-0"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}

      {aberto && (
        <form
          ref={form}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setMsg(null);
            iniciar(async () => {
              const r = await criarAcessoEscola(fd);
              if (r.ok) {
                setMsg({ tipo: "ok", texto: "Acesso criado. Passe o CPF e a senha para a direção; ela entra em /login e cai direto nesta ficha." });
                form.current?.reset();
                setAberto(false);
              } else setMsg({ tipo: "erro", texto: r.erro });
            });
          }}
          className="grid sm:grid-cols-2 gap-3"
        >
          <input type="hidden" name="escolaId" value={escolaId} />
          <div>
            <label htmlFor="ace-nome" className="block text-xs font-medium mb-1">
              Nome
            </label>
            <input id="ace-nome" name="nome" required className={campo} placeholder="Profa. Carla Mendes" />
          </div>
          <div>
            <label htmlFor="ace-doc" className="block text-xs font-medium mb-1">
              CPF (login)
            </label>
            <input id="ace-doc" name="documento" required inputMode="numeric" className={campo} placeholder="000.000.000-00" />
          </div>
          <div>
            <label htmlFor="ace-email" className="block text-xs font-medium mb-1">
              E-mail (para recuperar a senha)
            </label>
            <input id="ace-email" name="email" type="email" className={campo} />
          </div>
          <div>
            <label htmlFor="ace-senha" className="block text-xs font-medium mb-1">
              Senha inicial
            </label>
            <input id="ace-senha" name="senha" type="password" required minLength={8} autoComplete="new-password" className={campo} />
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={pendente}
              className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition disabled:opacity-60"
            >
              {pendente ? "Criando…" : "Criar acesso"}
            </button>
            {acessos.length > 0 && (
              <button type="button" onClick={() => setAberto(false)} className="text-sm text-muted hover:text-foreground">
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}
      {msg && (
        <p role={msg.tipo === "erro" ? "alert" : "status"} className="text-sm" style={{ color: msg.tipo === "erro" ? "var(--urgente)" : "var(--accent)" }}>
          {msg.texto}
        </p>
      )}
    </section>
  );
}
