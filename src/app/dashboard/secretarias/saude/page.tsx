import { contextoDashboard } from "@/lib/contexto-dashboard";
import {
  buscarUnidadesSaude,
  buscarUltimoIndicadorSaude,
  criarUnidadeSaude,
  atualizarIndicadorSaude,
  excluirUnidadeSaude,
} from "./actions";
import BotaoExcluir from "@/components/BotaoExcluir";
import { LIMITES_BRASIL } from "@/lib/coordenadas";

import MapaSecretariaClient from "@/components/MapaSecretariaClient";
import BloqueioPlano from "@/components/BloqueioPlano";
import EstadoVazio from "@/components/EstadoVazio";
import PilulaStatus from "@/components/PilulaStatus";
import InsightIA from "@/components/InsightIA";
import { gerarInsightIA } from "@/app/dashboard/insight-actions";
import { IconDownload } from "@/components/icons";

const LABEL_TIPO: Record<string, string> = {
  ubs: "UBS",
  posto: "Posto de Saúde",
  hospital: "Hospital",
  samu: "SAMU",
};

export default async function SaudePage() {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("saude")) return <BloqueioPlano plano="saude" />;

  const [unidades, indicador] = await Promise.all([
    buscarUnidadesSaude(ctx.sessao.prefeituraId),
    buscarUltimoIndicadorSaude(ctx.sessao.prefeituraId),
  ]);

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-bold">Secretaria da Saúde</h1>
          <p className="text-muted text-sm mt-1.5">
            Unidades de saúde e indicadores registrados manualmente por enquanto —
            a integração com E-SUS (mapa em tempo real, filas por especialidade)
            ainda depende de acesso à API do sistema, que só a prefeitura consegue
            liberar.
          </p>
        </div>
        <a
          href="/api/relatorios/secretaria/saude"
          className="group shrink-0 flex items-center gap-2 border border-border rounded-full px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand transition"
        >
          <IconDownload className="w-4 h-4 transition-transform duration-200 group-hover:translate-y-0.5" />
          Baixar relatório (PDF)
        </a>
      </div>

      <InsightIA acao={gerarInsightIA} modulo="saude" />

      {/* Indicadores */}
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
              label="Tempo médio de atendimento"
              valor={
                indicador.tempoMedioAtendimentoMin !== null
                  ? `${indicador.tempoMedioAtendimentoMin} min`
                  : "—"
              }
            />
            <Card
              label="Médicos ativos"
              valor={indicador.medicosAtivos?.toString() ?? "—"}
            />
            <Card
              label="Faltas"
              valor={
                indicador.faltasPercentual !== null
                  ? `${indicador.faltasPercentual}%`
                  : "—"
              }
            />
            <Card
              label="Estoque de medicamentos"
              valor={
                indicador.estoqueMedicamentosPercentual !== null
                  ? `${indicador.estoqueMedicamentosPercentual}%`
                  : "—"
              }
            />
          </div>
        ) : (
          <EstadoVazio
            icone="indicadores"
            titulo="Nenhum indicador registrado ainda."
            descricao="Use “Atualizar indicadores” acima para adicionar os primeiros números da Saúde."
          />
        )}
      </div>

      {/* Mapa */}
      <div>
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">
          Mapa das unidades
        </h2>
        <MapaSecretariaClient
          pontos={unidades
            .filter((u) => u.latitude !== null && u.longitude !== null)
            .map((u) => ({
              id: u.id,
              nome: u.nome,
              latitude: u.latitude as number,
              longitude: u.longitude as number,
              descricao: `${LABEL_TIPO[u.tipo]}${u.bairro ? " · " + u.bairro : ""}`,
            }))}
        />
      </div>

      {/* Unidades */}
      <div>
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">
          Unidades de saúde ({unidades.length})
        </h2>

        <form
          action={criarUnidadeSaude}
          className="bg-card border border-border rounded-2xl p-4 flex flex-wrap gap-3 items-end mb-4"
        >
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium mb-1">Nome</label>
            <input
              name="nome"
              required
              placeholder="UBS Centro"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Tipo</label>
            <select
              name="tipo"
              className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="ubs">UBS</option>
              <option value="posto">Posto de Saúde</option>
              <option value="hospital">Hospital</option>
              <option value="samu">SAMU</option>
            </select>
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
              min={LIMITES_BRASIL.latitude.min}
              max={LIMITES_BRASIL.latitude.max}
              title="Latitude no Brasil: entre -34 e 6"
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
              min={LIMITES_BRASIL.longitude.min}
              max={LIMITES_BRASIL.longitude.max}
              title="Longitude no Brasil: entre -74 e -28"
              placeholder="-38.5267"
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

        {unidades.length === 0 ? (
          <EstadoVazio
            icone="saude"
            titulo="Nenhuma unidade cadastrada ainda."
            descricao="Use o formulário acima para adicionar a primeira UBS, posto, hospital ou SAMU."
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {unidades.map((u) => (
              <div
                key={u.id}
                className="card-interactive bg-card arco-card-sm border border-border px-4 py-3 text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium break-words">{u.nome}</p>
                  {u.bairro && <p className="text-xs text-muted">{u.bairro}</p>}
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  <PilulaStatus label={LABEL_TIPO[u.tipo]} tom="andamento" />
                  <BotaoExcluir id={u.id} nome={u.nome} acao={excluirUnidadeSaude} />
                </div>
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
        action={atualizarIndicadorSaude}
        className="absolute right-0 z-10 mt-2 w-72 bg-card border border-border rounded-xl p-4 shadow-lg space-y-3"
      >
        <div>
          <label className="block text-xs font-medium mb-1">
            Tempo médio de atendimento (min)
          </label>
          <input
            name="tempoMedioAtendimentoMin"
            type="number"
            step="0.1"
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Médicos ativos</label>
          <input
            name="medicosAtivos"
            type="number"
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Faltas (%)</label>
          <input
            name="faltasPercentual"
            type="number"
            step="0.1"
            min={0}
            max={100}
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">
            Estoque de medicamentos (%)
          </label>
          <input
            name="estoqueMedicamentosPercentual"
            type="number"
            step="0.1"
            min={0}
            max={100}
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
