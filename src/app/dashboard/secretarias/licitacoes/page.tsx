import { contextoDashboard } from "@/lib/contexto-dashboard";
import { buscarLicitacoes, criarLicitacao } from "./actions";
import BloqueioPlano from "@/components/BloqueioPlano";
import EstadoVazio from "@/components/EstadoVazio";
import Aviso from "@/components/Aviso";
import PilulaStatus, { type TomStatus } from "@/components/PilulaStatus";
import InsightIA from "@/components/InsightIA";
import { gerarInsightIA } from "@/app/dashboard/insight-actions";
import { IconDownload } from "@/components/icons";
import PainelPncp from "./PainelPncp";

const LABEL_STATUS: Record<string, string> = {
  planejamento: "Planejamento",
  publicada: "Publicada",
  em_disputa: "Em disputa",
  homologada: "Homologada",
  cancelada: "Cancelada",
};

const TOM_STATUS: Record<string, TomStatus> = {
  planejamento: "neutro",
  publicada: "andamento",
  em_disputa: "atencao",
  homologada: "positivo",
  cancelada: "negativo",
};

function formatarMoeda(v: number | null) {
  if (v === null) return null;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function LicitacoesPage() {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("licitacoes")) return <BloqueioPlano plano="licitacoes" />;

  const lista = await buscarLicitacoes(ctx.sessao.prefeituraId);
  const comObservacaoRisco = lista.filter((l) => l.observacaoRisco);

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-bold">Licitações</h1>
          <p className="text-muted text-sm mt-1.5">
            Processos registrados manualmente por enquanto. A detecção automática
            de sobrepreço e fornecedores duplicados (mencionada na visão do
            produto) depende de um histórico real de processos e não foi
            implementada — não faz sentido simular isso sem dados de verdade.
          </p>
        </div>
        <a
          href="/api/relatorios/secretaria/licitacoes"
          className="group shrink-0 flex items-center gap-2 border border-border rounded-full px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand transition"
        >
          <IconDownload className="w-4 h-4 transition-transform duration-200 group-hover:translate-y-0.5" />
          Baixar relatório (PDF)
        </a>
      </div>

      <PainelPncp ano={new Date().getFullYear()} />

      <InsightIA acao={gerarInsightIA} modulo="licitacoes" />

      {comObservacaoRisco.length > 0 && (
        <Aviso
          nivel="medio"
          titulo={`${comObservacaoRisco.length} processo${comObservacaoRisco.length > 1 ? "s" : ""} com observação de risco registrada`}
          itens={comObservacaoRisco.map((l) => `${l.numero}: ${l.observacaoRisco}`)}
        />
      )}

      <div>
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">
          Novo processo
        </h2>
        <form
          action={criarLicitacao}
          className="bg-card border border-border rounded-2xl p-4 grid sm:grid-cols-2 gap-3"
        >
          <div>
            <label className="block text-xs font-medium mb-1">Número do processo</label>
            <input
              name="numero"
              required
              placeholder="PE 012/2026"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Modalidade</label>
            <input
              name="modalidade"
              placeholder="Pregão Eletrônico"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">Objeto</label>
            <input
              name="objeto"
              required
              placeholder="Aquisição de merenda escolar"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Valor estimado (R$)</label>
            <input
              name="valorEstimado"
              type="number"
              step="0.01"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Fornecedor</label>
            <input
              name="fornecedor"
              placeholder="(se já homologado)"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Status</label>
            <select
              name="status"
              defaultValue="planejamento"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {Object.entries(LABEL_STATUS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Observação de risco (opcional)
            </label>
            <input
              name="observacaoRisco"
              placeholder="ex: impugnação em análise"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Prazo final (opcional)
            </label>
            <input
              name="prazoFinal"
              type="date"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <p className="text-[11px] text-muted mt-1">
              Usado pra avisar automaticamente quando estiver perto de vencer.
            </p>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-5 py-2 transition"
            >
              Adicionar processo
            </button>
          </div>
        </form>
      </div>

      <div>
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">
          Todos os processos ({lista.length})
        </h2>
        {lista.length === 0 ? (
          <EstadoVazio
            icone="licitacoes"
            titulo="Nenhum processo cadastrado ainda."
            descricao="Use o formulário acima para adicionar o primeiro processo licitatório."
          />
        ) : (
          <div className="space-y-2">
            {lista.map((l) => (
              <div
                key={l.id}
                className="card-interactive bg-card arco-card-sm border border-border px-4 py-3 text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium break-words">
                    {l.numero} — {l.objeto}
                  </p>
                  <p className="text-xs text-muted mt-0.5 break-words">
                    {l.modalidade || "Modalidade não informada"}
                    {l.valorEstimado !== null && ` · ${formatarMoeda(l.valorEstimado)}`}
                    {l.fornecedor && ` · ${l.fornecedor}`}
                  </p>
                </div>
                <PilulaStatus
                  label={LABEL_STATUS[l.status]}
                  tom={TOM_STATUS[l.status] ?? "neutro"}
                  className="self-start shrink-0"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
