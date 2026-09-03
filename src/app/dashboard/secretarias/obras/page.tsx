import { contextoDashboard } from "@/lib/contexto-dashboard";
import { buscarObras, criarObra, atualizarProgressoObra } from "./actions";
import MapaSecretariaClient from "@/components/MapaSecretariaClient";
import BloqueioPlano from "@/components/BloqueioPlano";
import EstadoVazio from "@/components/EstadoVazio";
import Aviso from "@/components/Aviso";
import PilulaStatus, { type TomStatus } from "@/components/PilulaStatus";
import InsightIA from "@/components/InsightIA";
import { gerarInsightIA } from "@/app/dashboard/insight-actions";
import { IconDownload } from "@/components/icons";

const LABEL_STATUS: Record<string, string> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  atrasada: "Atrasada",
  concluida: "Concluída",
  paralisada: "Paralisada",
};

const TOM_STATUS: Record<string, TomStatus> = {
  planejada: "neutro",
  em_andamento: "andamento",
  atrasada: "negativo",
  concluida: "positivo",
  paralisada: "atencao",
};

function formatarMoeda(v: number | null) {
  if (v === null) return null;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ObrasPage() {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("obras")) return <BloqueioPlano plano="obras" />;

  const listaObras = await buscarObras(ctx.sessao.prefeituraId);

  const atrasadas = listaObras.filter(
    (o) => o.status !== "concluida" && o.progressoAtual < o.progressoEsperado - 10
  );

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-bold">Obras</h1>
          <p className="text-muted text-sm mt-1.5">
            Progresso registrado manualmente por enquanto. O alerta de atraso
            abaixo é um cálculo simples (progresso atual bem abaixo do esperado)
            — não é uma previsão da IA.
          </p>
        </div>
        <a
          href="/api/relatorios/secretaria/obras"
          className="group shrink-0 flex items-center gap-2 border border-border rounded-full px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand transition"
        >
          <IconDownload className="w-4 h-4 transition-transform duration-200 group-hover:translate-y-0.5" />
          Baixar relatório (PDF)
        </a>
      </div>

      <InsightIA acao={gerarInsightIA} modulo="obras" />

      {atrasadas.length > 0 && (
        <Aviso
          nivel="urgente"
          titulo={`${atrasadas.length} obra${atrasadas.length > 1 ? "s" : ""} com progresso abaixo do esperado`}
          itens={atrasadas.map(
            (o) => `${o.nome}: ${o.progressoAtual}% concluído (esperado: ${o.progressoEsperado}%)`
          )}
        />
      )}

      <div>
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">
          Mapa das obras
        </h2>
        <MapaSecretariaClient
          corDestaque="#8a2b2b"
          pontos={listaObras
            .filter((o) => o.latitude !== null && o.longitude !== null)
            .map((o) => ({
              id: o.id,
              nome: o.nome,
              latitude: o.latitude as number,
              longitude: o.longitude as number,
              descricao: `${LABEL_STATUS[o.status]} · ${o.progressoAtual}% concluído`,
            }))}
        />
      </div>

      <div>
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">
          Nova obra
        </h2>
        <form
          action={criarObra}
          className="bg-card border border-border rounded-2xl p-4 grid sm:grid-cols-2 gap-3"
        >
          <div>
            <label className="block text-xs font-medium mb-1">Nome</label>
            <input
              name="nome"
              required
              placeholder="Reforma da Praça Central"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Bairro</label>
            <input
              name="bairro"
              placeholder="Centro"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Latitude</label>
            <input
              name="latitude"
              type="number"
              step="any"
              placeholder="-3.7327"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Longitude</label>
            <input
              name="longitude"
              type="number"
              step="any"
              placeholder="-38.5267"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Progresso atual (%)
            </label>
            <input
              name="progressoAtual"
              type="number"
              min={0}
              max={100}
              defaultValue={0}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Progresso esperado até hoje (%)
            </label>
            <input
              name="progressoEsperado"
              type="number"
              min={0}
              max={100}
              defaultValue={0}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Valor do contrato (R$)
            </label>
            <input
              name="valorContrato"
              type="number"
              step="0.01"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Status</label>
            <select
              name="status"
              defaultValue="planejada"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {Object.entries(LABEL_STATUS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-5 py-2 transition"
            >
              Adicionar obra
            </button>
          </div>
        </form>
      </div>

      <div>
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">
          Todas as obras ({listaObras.length})
        </h2>
        {listaObras.length === 0 ? (
          <EstadoVazio
            icone="obras"
            titulo="Nenhuma obra cadastrada ainda."
            descricao="Use o formulário acima para adicionar a primeira obra."
          />
        ) : (
          <div className="space-y-2">
            {listaObras.map((o) => (
              <div key={o.id} className="card-interactive bg-card border border-border arco-card-sm p-4">
                <div className="flex flex-col gap-2 mb-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm break-words">{o.nome}</p>
                    {o.bairro && <p className="text-xs text-muted">{o.bairro}</p>}
                  </div>
                  <PilulaStatus
                    label={LABEL_STATUS[o.status]}
                    tom={TOM_STATUS[o.status] ?? "neutro"}
                    className="self-start shrink-0"
                  />
                </div>
                <div className="w-full h-2 bg-sutil rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full"
                    style={{ width: `${o.progressoAtual}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mt-1.5 text-xs text-muted">
                  <span>
                    {o.progressoAtual}% concluído (esperado: {o.progressoEsperado}%)
                  </span>
                  {o.valorContrato !== null && <span>{formatarMoeda(o.valorContrato)}</span>}
                </div>

                <details className="mt-2">
                  <summary className="text-xs font-semibold text-brand hover:underline cursor-pointer list-none">
                    Atualizar progresso
                  </summary>
                  <form
                    action={atualizarProgressoObra}
                    className="flex flex-wrap gap-2 items-end mt-2"
                  >
                    <input type="hidden" name="id" value={o.id} />
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Novo progresso (%)
                      </label>
                      <input
                        name="progressoAtual"
                        type="number"
                        min={0}
                        max={100}
                        defaultValue={o.progressoAtual}
                        className="w-24 rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:border-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Status</label>
                      <select
                        name="status"
                        defaultValue={o.status}
                        className="rounded-lg border border-border px-2 py-1.5 text-sm outline-none focus:border-brand"
                      >
                        {Object.entries(LABEL_STATUS).map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="bg-brand hover:bg-brand-dark text-white text-xs font-semibold rounded-full px-4 py-1.5 transition"
                    >
                      Salvar
                    </button>
                  </form>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
