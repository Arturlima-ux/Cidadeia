import { contextoDashboard } from "@/lib/contexto-dashboard";
import Link from "next/link";
import { PLANOS_ADDON, HREF_PLANO_ADDON } from "@/lib/planos";
import AbasModulos from "./AbasModulos";

export default async function MeusModulosPage() {
  const ctx = await contextoDashboard();
  if (ctx.sessao.cargo === "secretario") {
    return (
      <div className="max-w-lg mt-12 text-center border border-dashed border-border rounded-2xl p-8 mx-auto">
        <p className="text-sm text-muted">
          Apenas o prefeito ou um administrador pode gerenciar os módulos
          contratados.
        </p>
      </div>
    );
  }

  const { planosAtivos } = ctx;
  const contratados = PLANOS_ADDON.filter((p) => planosAtivos.includes(p.chave));
  const disponiveis = PLANOS_ADDON.filter((p) => !planosAtivos.includes(p.chave));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Módulos</h1>
        <p className="text-muted text-sm mt-1.5 leading-relaxed">
          Cada área da prefeitura é um módulo independente — ative só o que
          você precisa.
        </p>
      </div>

      <AbasModulos ativa="meus" />

      <div className="grid sm:grid-cols-2 gap-3">
        {contratados.map((p) => (
          <Link
            key={p.chave}
            href={HREF_PLANO_ADDON[p.chave]}
            className="rounded-xl border border-border p-4 hover:border-brand hover:bg-brand-tint/40 transition"
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">{p.nome}</p>
              <span className="text-xs font-semibold rounded-full px-2 py-0.5" style={{ color: "var(--info)", background: "var(--info-tint)" }}>
                Ativo
              </span>
            </div>
            <p className="text-xs text-muted mt-1.5 leading-relaxed">{p.descricao}</p>
            <p className="text-xs font-semibold text-brand mt-3">Abrir módulo →</p>
          </Link>
        ))}
      </div>

      {disponiveis.length > 0 && (
        <div className="rounded-xl border border-dashed border-border p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-sm">
              {disponiveis.length} módulo{disponiveis.length > 1 ? "s" : ""} disponível
              {disponiveis.length > 1 ? "eis" : ""} pra contratar
            </p>
            <p className="text-xs text-muted mt-1">
              {disponiveis.map((p) => p.nome).join(", ")}
            </p>
          </div>
          <Link
            href="/dashboard/modulos/marketplace"
            className="shrink-0 bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-4 py-2 transition"
          >
            Ver marketplace →
          </Link>
        </div>
      )}
    </div>
  );
}
