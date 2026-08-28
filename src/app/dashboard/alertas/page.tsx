import Link from "next/link";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import { buscarAlertas, buscarSugestoesAlertasPendentes } from "@/lib/dados-prefeitura";
import { criarAlerta, resolverAlerta } from "../actions";
import BloqueioPlano from "@/components/BloqueioPlano";
import EstadoVazio from "@/components/EstadoVazio";
import SugestoesAlertasIA from "@/components/SugestoesAlertasIA";
import BadgePrioridade, { estiloPrioridade } from "@/components/BadgePrioridade";

export default async function AlertasPage() {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("gestao")) return <BloqueioPlano plano="gestao" />;

  const [lista, sugestoes] = await Promise.all([
    buscarAlertas(ctx.sessao.prefeituraId),
    buscarSugestoesAlertasPendentes(ctx.sessao.prefeituraId),
  ]);
  const abertos = lista.filter((a) => !a.resolvido);
  const resolvidos = lista.filter((a) => a.resolvido);

  async function resolver(formData: FormData) {
    "use server";
    await resolverAlerta(String(formData.get("id")));
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-bold">Alertas</h1>
        <p className="text-muted text-sm mt-1.5">
          Registre manualmente ou deixe a{" "}
          <Link href="/dashboard/central" className="font-semibold text-brand hover:underline">
            Central Inteligente
          </Link>{" "}
          detectar prazo vencendo, obra parada, dado desatualizado e saldo negativo
          automaticamente.
        </p>
      </div>

      <form
        action={criarAlerta}
        className="bg-card border border-border rounded-2xl p-5 space-y-3"
      >
        <h2 className="font-semibold text-sm">Novo alerta</h2>
        <input
          name="titulo"
          placeholder="Título do alerta"
          required
          className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand"
        />
        <textarea
          name="descricao"
          placeholder="Descrição (opcional)"
          rows={2}
          className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand resize-none"
        />
        <div className="flex gap-3">
          <select
            name="prioridade"
            defaultValue="info"
            className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="urgente">🔴 Urgente</option>
            <option value="medio">🟠 Médio</option>
            <option value="info">🟢 Informação</option>
          </select>
          <input
            name="secretaria"
            placeholder="Secretaria (opcional)"
            className="flex-1 rounded-lg border border-border px-3.5 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
        <button
          type="submit"
          className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-5 py-2.5 transition"
        >
          Adicionar alerta
        </button>
      </form>

      <SugestoesAlertasIA sugestoes={sugestoes} />

      <div>
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">
          Em aberto ({abertos.length})
        </h2>
        {abertos.length === 0 ? (
          <EstadoVazio
            icone="alertas"
            titulo="Nenhum alerta em aberto."
            descricao="Use o formulário acima para registrar um alerta, ou gere sugestões com a IA logo abaixo."
          />
        ) : (
          <div className="space-y-2">
            {abertos.map((a) => (
              <div
                key={a.id}
                className="card-interactive flex items-center justify-between arco-card-sm border border-border border-l-4 bg-card px-4 py-3 text-sm"
                style={{ borderLeftColor: estiloPrioridade(a.prioridade).cor }}
              >
                <div>
                  <p className="font-medium">{a.titulo}</p>
                  {a.descricao && <p className="text-xs text-muted mt-0.5">{a.descricao}</p>}
                  {a.secretaria && (
                    <p className="text-xs text-muted mt-0.5">Secretaria: {a.secretaria}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <BadgePrioridade prioridade={a.prioridade} />
                  <form action={resolver}>
                    <input type="hidden" name="id" value={a.id} />
                    <button
                      type="submit"
                      className="text-xs font-semibold underline opacity-70 hover:opacity-100"
                    >
                      Resolver
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {resolvidos.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">
            Resolvidos ({resolvidos.length})
          </h2>
          <div className="space-y-2">
            {resolvidos.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm opacity-60"
              >
                <p className="font-medium line-through">{a.titulo}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
