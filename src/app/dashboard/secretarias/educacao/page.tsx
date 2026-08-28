import { contextoDashboard } from "@/lib/contexto-dashboard";
import {
  buscarEscolas,
  buscarUltimoIndicadorEducacao,
  criarEscola,
  atualizarIndicadorEducacao,
} from "./actions";
import MapaSecretariaClient from "@/components/MapaSecretariaClient";
import BloqueioPlano from "@/components/BloqueioPlano";
import EstadoVazio from "@/components/EstadoVazio";
import PilulaStatus from "@/components/PilulaStatus";
import InsightIA from "@/components/InsightIA";
import { gerarInsightIA } from "@/app/dashboard/insight-actions";
import { IconDownload } from "@/components/icons";

export default async function EducacaoPage() {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("educacao")) return <BloqueioPlano plano="educacao" />;

  const [listaEscolas, indicador] = await Promise.all([
    buscarEscolas(ctx.sessao.prefeituraId),
    buscarUltimoIndicadorEducacao(ctx.sessao.prefeituraId),
  ]);

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-bold">Secretaria da Educação</h1>
          <p className="text-muted text-sm mt-1.5">
            Escolas e indicadores registrados manualmente por enquanto — a
            integração com o sistema de frequência/notas do município ainda
            depende de acesso liberado pela prefeitura.
          </p>
        </div>
        <a
          href="/api/relatorios/secretaria/educacao"
          className="group shrink-0 flex items-center gap-2 border border-border rounded-full px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand transition"
        >
          <IconDownload className="w-4 h-4 transition-transform duration-200 group-hover:translate-y-0.5" />
          Baixar relatório (PDF)
        </a>
      </div>

      <InsightIA acao={gerarInsightIA} modulo="educacao" />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">
            Indicadores
          </h2>
          <FormularioIndicador />
        </div>
        {indicador ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card
              label="Frequência"
              valor={
                indicador.frequenciaPercentual !== null
                  ? `${indicador.frequenciaPercentual}%`
                  : "—"
              }
            />
            <Card
              label="Nota média"
              valor={indicador.notaMedia?.toString() ?? "—"}
            />
            <Card
              label="Alunos no transporte"
              valor={indicador.alunosTransporte?.toString() ?? "—"}
            />
            <Card
              label="Professores ativos"
              valor={indicador.professoresAtivos?.toString() ?? "—"}
            />
          </div>
        ) : (
          <EstadoVazio
            icone="indicadores"
            titulo="Nenhum indicador registrado ainda."
            descricao="Use “Atualizar indicadores” acima para adicionar os primeiros números da Educação."
          />
        )}
      </div>

      <div>
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">
          Mapa das escolas
        </h2>
        <MapaSecretariaClient
          corDestaque="#7a5c1a"
          pontos={listaEscolas
            .filter((e) => e.latitude !== null && e.longitude !== null)
            .map((e) => ({
              id: e.id,
              nome: e.nome,
              latitude: e.latitude as number,
              longitude: e.longitude as number,
              descricao: e.bairro ?? undefined,
            }))}
        />
      </div>

      <div>
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">
          Escolas ({listaEscolas.length})
        </h2>

        <form
          action={criarEscola}
          className="bg-card border border-border rounded-2xl p-4 flex flex-wrap gap-3 items-end mb-4"
        >
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium mb-1">Nome</label>
            <input
              name="nome"
              required
              placeholder="Escola Municipal José Alves"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium mb-1">Bairro</label>
            <input
              name="bairro"
              placeholder="Centro"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium mb-1">Latitude</label>
            <input
              name="latitude"
              type="number"
              step="any"
              placeholder="-3.7327"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium mb-1">Longitude</label>
            <input
              name="longitude"
              type="number"
              step="any"
              placeholder="-38.5267"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium mb-1">Evasão (%)</label>
            <input
              name="evasaoPercentual"
              type="number"
              step="0.1"
              min={0}
              max={100}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <button
            type="submit"
            className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-5 py-2 transition"
          >
            Adicionar
          </button>
        </form>

        {listaEscolas.length === 0 ? (
          <EstadoVazio
            icone="educacao"
            titulo="Nenhuma escola cadastrada ainda."
            descricao="Use o formulário acima para adicionar a primeira escola."
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {listaEscolas.map((e) => (
              <div
                key={e.id}
                className="card-interactive bg-card arco-card-sm border border-border px-4 py-3 text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium break-words">{e.nome}</p>
                  {e.bairro && <p className="text-xs text-muted">{e.bairro}</p>}
                </div>
                {e.evasaoPercentual !== null && (
                  <PilulaStatus
                    label={`Evasão ${e.evasaoPercentual}%`}
                    tom={e.evasaoPercentual > 10 ? "negativo" : "andamento"}
                    className="self-start shrink-0"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-2xl font-serif font-bold">{valor}</p>
      <p className="text-xs text-muted mt-1">{label}</p>
    </div>
  );
}

function FormularioIndicador() {
  return (
    <details className="relative">
      <summary className="text-xs font-semibold text-brand hover:underline cursor-pointer list-none">
        Atualizar indicadores
      </summary>
      <form
        action={atualizarIndicadorEducacao}
        className="absolute right-0 z-10 mt-2 w-72 bg-card border border-border rounded-xl p-4 shadow-lg space-y-3"
      >
        <div>
          <label className="block text-xs font-medium mb-1">Frequência (%)</label>
          <input
            name="frequenciaPercentual"
            type="number"
            step="0.1"
            min={0}
            max={100}
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">
            Nota média (0-10)
          </label>
          <input
            name="notaMedia"
            type="number"
            step="0.1"
            min={0}
            max={10}
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">
            Alunos no transporte escolar
          </label>
          <input
            name="alunosTransporte"
            type="number"
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">
            Professores ativos
          </label>
          <input
            name="professoresAtivos"
            type="number"
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full py-2 transition"
        >
          Salvar
        </button>
      </form>
    </details>
  );
}
