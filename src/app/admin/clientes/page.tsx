import NavAdmin from "../NavAdmin";
import { notFound, redirect } from "next/navigation";
import { lerSessao } from "@/lib/sessao";
import { emailDaEquipe } from "@/lib/equipe";
import { saudeDosClientes } from "@/lib/saude-do-cliente-servidor";
import { dataDoBanco } from "@/lib/data-do-banco";
import type { Risco } from "@/lib/saude-do-cliente";

export const dynamic = "force-dynamic";

// ── A SAÚDE DOS CLIENTES ──
// Quem está deixando de usar, antes de deixar de pagar (lib/saude-do-cliente.ts).
// Toda segunda a lista dos que pedem ligação também chega por e-mail.

const COR: Record<Risco, string> = { alto: "var(--urgente)", medio: "var(--medio)", baixo: "var(--info)" };
const ROTULO: Record<Risco, string> = { alto: "Risco alto", medio: "Atenção", baixo: "Saudável" };

export default async function ClientesPage() {
  if (!(await lerSessao())) redirect("/login");
  if (!(await emailDaEquipe())) notFound();
  const clientes = await saudeDosClientes();
  const conta = (r: Risco) => clientes.filter((c) => c.risco === r).length;

  return (
    <div className="tema-noite min-h-screen bg-background px-4 sm:px-8 py-10">
      <div className="max-w-[1200px] mx-auto space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.04em]">Clientes</h1>
            <p className="text-sm text-muted mt-2">Quem está deixando de usar, a tempo de ligar.</p>
          </div>
          <NavAdmin atual="/admin/clientes" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(["alto", "medio", "baixo"] as Risco[]).map((r) => (
            <div key={r} className="rounded-2xl border border-border p-5" style={{ background: "var(--card)" }}>
              <p className="text-3xl font-semibold tabular-nums" style={{ color: COR[r] }}>{conta(r)}</p>
              <p className="text-xs text-muted mt-1">{ROTULO[r]}</p>
            </div>
          ))}
        </div>

        {clientes.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma prefeitura com módulo contratado ainda.</p>
        ) : (
          <ul className="space-y-3">
            {clientes.map((c) => (
              <li key={c.id} className="rounded-2xl border border-border p-5 border-l-4" style={{ background: "var(--card)", borderLeftColor: COR[c.risco] }}>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="font-semibold">
                    {c.municipio}/{c.uf}
                  </p>
                  <p className="text-xs text-muted">
                    <span className="font-semibold" style={{ color: COR[c.risco] }}>{ROTULO[c.risco]}</span>
                    {" · "}
                    {c.ultimoAcesso
                      ? `último acesso ${dataDoBanco(c.ultimoAcesso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
                      : "sem acesso registrado"}
                  </p>
                </div>
                {c.sinais.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {c.sinais.map((s) => (
                      <li key={s.texto} className="text-sm text-muted">– {s.texto}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted mt-2">Usando, com dado chegando e alertas sendo resolvidos.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
