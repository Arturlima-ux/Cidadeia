import Link from "next/link";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import { ehGestor } from "@/lib/sessao";
import { podeVerAlerta } from "@/lib/alerta-por-area";
import { buscarAlertas, buscarSugestoesAlertasPendentes } from "@/lib/dados-prefeitura";
import { criarAlerta, resolverAlerta } from "../actions";
import EstadoVazio from "@/components/EstadoVazio";
import SugestoesAlertasIA from "@/components/SugestoesAlertasIA";
import BadgePrioridade, { estiloPrioridade } from "@/components/BadgePrioridade";

// Alerta aberto pela vigia (fiscal ou dos módulos), e não à mão.
const daVigia = (id: string) => id.startsWith("regra:") || id.startsWith("fiscal:");

const NOME_AREA: Record<string, string> = {
  saude: "Saúde",
  educacao: "Educação",
  obras: "Obras",
  licitacoes: "Licitações e contratos",
};

export default async function AlertasPage() {
  const ctx = await contextoDashboard();
  // A lista vale para qualquer módulo: a vigia diária abre alerta de Saúde,
  // Educação, Obras e Licitações também. As sugestões da IA seguem no Gestão.
  const comGestao = ctx.temPlano("gestao");
  const gestor = ehGestor(ctx.sessao);

  const [lista, sugestoes] = await Promise.all([
    buscarAlertas(ctx.sessao.prefeituraId),
    comGestao && gestor ? buscarSugestoesAlertasPendentes(ctx.sessao.prefeituraId) : Promise.resolve([]),
  ]);
  // O secretário vê os alertas da secretaria dele; o gabinete vê todos.
  const visiveis = lista.filter((a) => podeVerAlerta(ctx.sessao, a));
  // Urgente primeiro; dentro da mesma prioridade, o mais recente.
  const PESO = { urgente: 0, medio: 1, info: 2 } as const;
  const abertos = visiveis
    .filter((a) => !a.resolvido)
    .sort((a, b) => PESO[a.prioridade] - PESO[b.prioridade] || b.createdAt.localeCompare(a.createdAt));
  const resolvidos = visiveis.filter((a) => a.resolvido);
  const minhaArea = !gestor && ctx.sessao.secretaria ? NOME_AREA[ctx.sessao.secretaria] ?? null : null;

  async function resolver(formData: FormData) {
    "use server";
    await resolverAlerta(String(formData.get("id")));
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Alertas</h1>
        {gestor ? (
          <p className="text-muted text-sm mt-1.5">
            Toda manhã a vigia do CidadeIA passa pelos módulos contratados e abre aqui
            o que achar: prazo vencendo, obra parada, contrato sem tempo de licitar,
            remédio em falta, aluno fora da escola, mínimo constitucional e pessoal.
            Quando o problema deixa de existir, o alerta fecha sozinho. O alerta de
            cada área vai por e-mail ao secretário dela; o prefeito recebe os
            urgentes. Você também pode registrar um à mão, e a{" "}
            <Link href="/dashboard/central" className="font-semibold text-brand hover:underline">
              Central Inteligente
            </Link>{" "}
            cruza tudo com a IA.
          </p>
        ) : (
          <p className="text-muted text-sm mt-1.5">
            Os alertas {minhaArea ? `de ${minhaArea}` : "da sua secretaria"}. Toda manhã a vigia do CidadeIA confere os
            dados da secretaria e abre aqui o que pede ação; você recebe por e-mail o que for novo ou piorar. Quando o
            problema deixa de existir, o alerta fecha sozinho. O prefeito acompanha os urgentes.
          </p>
        )}
      </div>

      <form
        action={criarAlerta}
        className="bg-card border border-border rounded-2xl p-5 space-y-3"
      >
        <h2 className="font-semibold text-sm">Novo alerta</h2>
        <input
          name="titulo"
          aria-label="Título do alerta"
          placeholder="Título do alerta"
          required
          className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand"
        />
        <textarea
          name="descricao"
          aria-label="Descrição (opcional)"
          placeholder="Descrição (opcional)"
          rows={2}
          className="w-full rounded-lg border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand resize-none"
        />
        {/* Em 390px a linha estourava a tela (rolagem horizontal). */}
        <div className="flex flex-wrap gap-3">
          <select
            name="prioridade"
            aria-label="Prioridade"
            defaultValue="info"
            className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
          >
            <option value="urgente">🔴 Urgente</option>
            <option value="medio">🟠 Médio</option>
            <option value="info">🟢 Informação</option>
          </select>
          {gestor ? (
            <input
              name="secretaria"
              aria-label="Secretaria (opcional)"
              placeholder="Secretaria (opcional)"
              className="flex-1 min-w-[200px] rounded-lg border border-border px-3.5 py-2 text-sm outline-none focus:border-brand"
            />
          ) : (
            minhaArea && <span className="self-center text-xs text-muted">Área: {minhaArea}</span>
          )}
        </div>
        <button
          type="submit"
          className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-5 py-2.5 transition"
        >
          Adicionar alerta
        </button>
      </form>

      {comGestao && gestor && <SugestoesAlertasIA sugestoes={sugestoes} />}

      <div>
        <h2 className="font-semibold text-sm text-muted mb-3">
          Em aberto ({abertos.length})
        </h2>
        {abertos.length === 0 ? (
          <EstadoVazio
            icone="alertas"
            titulo="Nenhum alerta em aberto."
            descricao="A vigia confere os módulos de novo amanhã cedo. Se quiser, registre um alerta à mão no formulário acima."
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
                  <p className="text-xs text-muted mt-1">
                    {daVigia(a.id) && (
                      <span className="font-semibold" style={{ color: "var(--brand-claro)" }}>
                        Vigia diária{a.secretaria ? " · " : ""}
                      </span>
                    )}
                    {a.secretaria && <>{NOME_AREA[a.secretaria] ?? a.secretaria}</>}
                  </p>
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
          <h2 className="font-semibold text-sm text-muted mb-3">
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
