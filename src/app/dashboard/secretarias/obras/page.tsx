import { contextoDashboard } from "@/lib/contexto-dashboard";
import { insightInicial } from "@/lib/ia";
import { buscarObras, atualizarProgressoObra, excluirObra } from "./actions";
import FormularioNovaObra from "./FormularioNovaObra";
import PainelObras, { type ObraNaTela } from "./PainelObras";
import { lerObra, pedeAtencao, ehObraOuEngenharia } from "@/lib/obra-prazo";
import { buscarDecisoes } from "./actions";
import { resumoDaDecisao, decisaoAindaVale } from "@/lib/decisao-obra";
import { buscarContratos } from "@/app/dashboard/secretarias/licitacoes/contratos-actions";
import BotaoExcluir from "@/components/BotaoExcluir";

import MapaSecretariaClient from "@/components/MapaSecretariaClient";
import ObrasFederais from "@/components/ObrasFederais";
import ObrasParadasNoPortal from "@/components/ObrasParadasNoPortal";
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

  // ── A LEITURA DE PRAZO, FEITA NO SERVIDOR ──
  //
  // Vai pronta para a tela: o cliente não recalcula prazo. Duas cópias da mesma
  // conta acabam discordando, e discordar sobre prazo de obra na tela que o
  // prefeito mostra à câmara é caro.
  const agora = new Date();
  const contratosDeObra = (await buscarContratos(ctx.sessao.prefeituraId)).filter((c) =>
    ehObraOuEngenharia(c.categoria)
  );
  const jaImportadas = new Set(
    listaObras.map((o) => o.numeroControlePncpContrato).filter((x): x is string => !!x)
  );
  const aImportar = contratosDeObra.filter(
    (c) => c.numeroControlePncp && !jaImportadas.has(c.numeroControlePncp)
  ).length;

  // A decisão mais recente de cada obra. Decisão com previsão vencida não
  // conta: o alerta precisa voltar, senão bastaria registrar qualquer coisa
  // para a obra sumir da tela para sempre.
  const decisoes = await buscarDecisoes(ctx.sessao.prefeituraId);

  const todasLidas: ObraNaTela[] = listaObras
    .map((o) => ({
      id: o.id,
      nome: o.nome,
      fornecedorNome: o.fornecedorNome,
      valorContrato: o.valorContrato,
      origem: o.origem,
      decisao: decisoes.get(o.id) ?? null,
      resumoDecisao: decisoes.has(o.id) ? resumoDaDecisao(decisoes.get(o.id)!, agora) : null,
      leitura: lerObra(
        {
          id: o.id,
          objeto: o.nome,
          fornecedorNome: o.fornecedorNome,
          valorInicial: o.valorContrato,
          valorGlobal: o.valorContrato,
          vigenciaInicio: o.vigenciaInicio,
          vigenciaFim: o.vigenciaFim,
          progressoInformado: o.progressoAtual,
          progressoAtualizadoEm: o.atualizadoEm,
        },
        agora
      ),
    }))
    .filter((o) => pedeAtencao(o.leitura.situacao))
    .sort((a, b) => a.leitura.peso - b.leitura.peso);

  // ── DUAS LISTAS, E NÃO UM FILTRO ──
  //
  // Obra com decisão registrada e ainda válida não pede decisão nova. Mas
  // sumir com ela seria pior: o gestor não teria como distinguir a obra que
  // alguém tratou da obra que ninguém olhou, e a decisão registrada ficaria
  // invisível justo para quem precisa conferir se já foi tratada.
  //
  // A decisão VENCIDA volta para a primeira lista. É o que impede o registro
  // de virar um jeito de calar o sistema para sempre.
  const temDecisaoValida = (o: ObraNaTela) =>
    o.decisao !== null && decisaoAindaVale(o.decisao, agora);

  const obrasQuePedemDecisao = todasLidas.filter((o) => !temDecisaoValida(o));
  const obrasDecididas = todasLidas.filter(temDecisaoValida);

  // ── O ESPERADO SAI DO PRAZO ──
  // Com início e término, quanto a obra já deveria ter andado é a fração do
  // prazo consumida (lib/obra-prazo.ts), recalculada todo dia. O número
  // digitado à mão (progressoEsperado) só vale para obra antiga sem datas.
  const esperadoDe = (o: (typeof listaObras)[number]): number | null => {
    if (o.vigenciaInicio && o.vigenciaFim) {
      const l = lerObra(
        { id: o.id, objeto: o.nome, fornecedorNome: o.fornecedorNome, valorInicial: o.valorContrato, valorGlobal: o.valorContrato, vigenciaInicio: o.vigenciaInicio, vigenciaFim: o.vigenciaFim, progressoInformado: o.progressoAtual, progressoAtualizadoEm: o.atualizadoEm },
        agora
      );
      return l.prazoConsumido === null ? (l.situacao === "nao_comecou" ? 0 : null) : Math.round(l.prazoConsumido);
    }
    return o.progressoEsperado > 0 ? o.progressoEsperado : null;
  };
  const esperados = new Map(listaObras.map((o) => [o.id, esperadoDe(o)]));
  const atrasadas = listaObras.filter((o) => {
    const e = esperados.get(o.id);
    return o.status !== "concluida" && o.progressoAtual !== null && e !== null && e !== undefined && o.progressoAtual < e - 10;
  });
  const dataBr = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : null);

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Obras</h1>
          <p className="text-muted text-sm mt-1.5">
            As obras dos contratos entram sozinhas. Para cada obra, o painel compara o progresso
            medido com quanto ela já deveria ter andado pelo prazo, e avisa quando ficar mais de
            10 pontos para trás.
          </p>
        </div>
        {/* Download de PDF gerado por rota de API: o Link tentaria navegar
            no cliente (e pré-carregar o arquivo). */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/relatorios/secretaria/obras"
          className="group shrink-0 flex items-center gap-2 border border-border rounded-full px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand transition"
        >
          <IconDownload className="w-4 h-4 transition-transform duration-200 group-hover:translate-y-0.5" />
          Baixar relatório (PDF)
        </a>
      </div>

      <PainelObras
        obras={obrasQuePedemDecisao}
        decididas={obrasDecididas}
        total={listaObras.length}
        temContratosDeObra={aImportar}
        prefeituraId={ctx.sessao.prefeituraId}
      />

      <InsightIA
        acao={gerarInsightIA}
        modulo="obras"
        inicial={await insightInicial(ctx.sessao.prefeituraId, "obras", { cargo: ctx.sessao.cargo, secretaria: ctx.sessao.secretaria })}
      />

      {atrasadas.length > 0 && (
        <Aviso
          nivel="urgente"
          titulo={`${atrasadas.length} obra${atrasadas.length > 1 ? "s" : ""} com progresso abaixo do esperado`}
          itens={atrasadas.map(
            (o) =>
              `${o.nome}: ${o.progressoAtual}% concluído, e pelo prazo já deveria estar em ${esperados.get(o.id)}%`
          )}
        />
      )}

      <ObrasParadasNoPortal prefeituraId={ctx.sessao.prefeituraId} obras={listaObras} decisoes={decisoes} />

      <ObrasFederais prefeituraId={ctx.sessao.prefeituraId} uf={ctx.prefeitura.estado} />

      <div>
        <h2 className="font-semibold text-sm text-muted mb-3">
          Mapa das obras
        </h2>
        <MapaSecretariaClient
          corDestaque="var(--serie-2)"
          pontos={listaObras
            .filter((o) => o.latitude !== null && o.longitude !== null)
            .map((o) => ({
              id: o.id,
              nome: o.nome,
              latitude: o.latitude as number,
              longitude: o.longitude as number,
              descricao:
                o.progressoAtual === null
                  ? `${LABEL_STATUS[o.status]} · sem medição`
                  : `${LABEL_STATUS[o.status]} · ${o.progressoAtual}% concluído`,
            }))}
        />
      </div>

      <div>
        <h2 className="font-semibold text-sm text-muted mb-3">
          Nova obra
        </h2>
        <FormularioNovaObra />
      </div>

      <div>
        <h2 className="font-semibold text-sm text-muted mb-3">
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
                    style={{ width: `${o.progressoAtual ?? 0}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mt-1.5 text-xs text-muted">
                  <span>
                    {o.progressoAtual === null ? "sem medição registrada" : `${o.progressoAtual}% concluído`}
                    {esperados.get(o.id) !== null && o.status !== "concluida" && ` · pelo prazo, ${esperados.get(o.id)}%`}
                    {o.vigenciaFim && ` · término ${dataBr(o.vigenciaFim)}`}
                  </span>
                  {o.valorContrato !== null && <span>{formatarMoeda(o.valorContrato)}</span>}
                </div>

                <details className="mt-2">
                  <summary className="text-xs font-semibold text-brand hover:underline cursor-pointer list-none">
                    Atualizar medição ou prazo
                  </summary>
                  <form
                    action={atualizarProgressoObra}
                    className="flex flex-wrap gap-2 items-end mt-2"
                  >
                    <input type="hidden" name="id" value={o.id} />
                    <div>
                      <label htmlFor={`obra-progressoAtual-${o.id}`} className="block text-xs font-medium mb-1">
                        Novo progresso (%)
                      </label>
                      <input
                        id={`obra-progressoAtual-${o.id}`}
                        name="progressoAtual"
                        type="number"
                        min={0}
                        max={100}
                        inputMode="numeric"
                        placeholder={o.progressoAtual === null ? "não medido" : `${o.progressoAtual}`}
                        className="w-28 rounded-lg border border-border px-2 py-2 text-sm outline-none focus:border-brand"
                      />
                    </div>
                    {!o.vigenciaInicio && (
                      <div>
                        <label htmlFor={`obra-vigenciaInicio-${o.id}`} className="block text-xs font-medium mb-1">Início</label>
                        <input id={`obra-vigenciaInicio-${o.id}`} name="vigenciaInicio" type="date" className="rounded-lg border border-border px-2 py-2 text-sm outline-none focus:border-brand" />
                      </div>
                    )}
                    <div>
                      <label htmlFor={`obra-vigenciaFim-${o.id}`} className="block text-xs font-medium mb-1">{o.vigenciaFim ? "Novo término (prorrogação)" : "Término previsto"}</label>
                      <input id={`obra-vigenciaFim-${o.id}`} name="vigenciaFim" type="date" min={o.vigenciaInicio?.slice(0, 10)} className="rounded-lg border border-border px-2 py-2 text-sm outline-none focus:border-brand" />
                    </div>
                    <div>
                      <label htmlFor={`obra-status-${o.id}`} className="block text-xs font-medium mb-1">Status</label>
                      <select
                        id={`obra-status-${o.id}`}
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
                <div className="mt-2 flex justify-end">
                  <BotaoExcluir id={o.id} nome={o.nome} acao={excluirObra} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
