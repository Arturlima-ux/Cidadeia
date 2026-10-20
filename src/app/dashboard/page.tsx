import { contextoDashboard } from "@/lib/contexto-dashboard";
import { insightInicial } from "@/lib/ia";
import { buscarHistoricoSnapshots, buscarAlertas } from "@/lib/dados-prefeitura";
import { atualizarSnapshot } from "./actions";
import Link from "next/link";
import BloqueioPlano from "@/components/BloqueioPlano";
import BadgePrioridade, { estiloPrioridade } from "@/components/BadgePrioridade";
import EstadoVazio from "@/components/EstadoVazio";
import BarraAlertasPrioridade from "@/components/BarraAlertasPrioridade";
import GaugeEficiencia from "@/components/GaugeEficiencia";
import { IconIA, IconDownload, IconSetaCima, IconSetaBaixo } from "@/components/icons";
import ValorAnimado from "@/components/ValorAnimado";
import InsightIA from "@/components/InsightIA";
import { gerarInsightIA } from "./insight-actions";
import { fusoDoEstado, saudacao, dataPorExtenso } from "@/lib/horario";
import PainelAtencao from "@/components/PainelAtencao";
import PainelAntecipacao from "@/components/PainelAntecipacao";
import { antecipacoesDaPrefeitura } from "@/lib/antecipacoes-da-prefeitura";
import { gerarDeteccoesAutomaticas } from "@/lib/ia";
import VisaoDoPrefeito from "@/components/VisaoDoPrefeito";
import { carregarVisaoDoPrefeito } from "@/lib/visao-do-prefeito-servidor";

// A saudação e a data saem de lib/horario.ts, no fuso do estado da
// prefeitura. Calcular aqui com `new Date().getHours()` devolvia a hora do
// servidor da Vercel, que roda em UTC: às 22h no Ceará o painel dizia
// "Bom dia" e exibia a data do dia seguinte.

/** % de variação entre dois valores. null se não der pra calcular. */
function calcularDelta(atual: number | null, anterior: number | null): number | null {
  if (atual === null || anterior === null || anterior === 0) return null;
  // Saldo que trocou de sinal não tem variação percentual que se leia
  // ("↓ 275%" para um saldo que foi de +48 mil a −84 mil): melhor nenhuma.
  if (Math.sign(atual) !== Math.sign(anterior)) return null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

export default async function DashboardPage() {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("gestao")) return <BloqueioPlano plano="gestao" />;

  const { sessao, prefeitura } = ctx;

  // Antes eram dois `await` em sequência — não dependem um do outro.
  //
  // As detecções entram junto: elas passaram a ABRIR o painel, e carregá-las
  // depois faria a lista mais importante da tela ser a última a aparecer.
  const [historico, todosAlertas, achados, antecipacoes] = await Promise.all([
    buscarHistoricoSnapshots(sessao.prefeituraId),
    buscarAlertas(sessao.prefeituraId),
    gerarDeteccoesAutomaticas(sessao.prefeituraId, {
      cargo: sessao.cargo,
      secretaria: sessao.secretaria,
    }).catch((e) => {
      // Falha na detecção não pode derrubar o painel inteiro: o resto da tela
      // continua útil, e a seção mostra o estado vazio em vez de erro.
      console.error("[Painel] falha nas detecções:", e);
      return [];
    }),
    // Antecipações entram no mesmo Promise.all: são duas consultas curtas, e
    // em sequência atrasariam a lista de decisões, que é a primeira coisa da
    // tela. Falha não derruba o painel — a seção some, como quando não há
    // histórico suficiente.
    antecipacoesDaPrefeitura(sessao.prefeituraId).catch((e) => {
      console.error("[Painel] falha nas antecipações:", e);
      return [];
    }),
  ]);

  // O painel do vídeo da home, com o dado da prefeitura. Falha aqui não
  // derruba o resto: sem ele, a tela continua com a lista de decisões.
  const visao = await carregarVisaoDoPrefeito(sessao.prefeituraId, {
    essencial: ctx.temPlano("essencial"),
    obras: ctx.temPlano("obras"),
  }).catch((e) => {
    console.error("[Painel] falha na visão do prefeito:", e);
    return null;
  });
  const snapshot = historico[historico.length - 1] ?? null;
  const anterior = historico.length > 1 ? historico[historico.length - 2] : null;

  const listaAlertas = todosAlertas.filter((a) => !a.resolvido);
  const contagemPorPrioridade = listaAlertas.reduce<Record<string, number>>((acc, a) => {
    acc[a.prioridade] = (acc[a.prioridade] ?? 0) + 1;
    return acc;
  }, {});

  const temDadosFinanceiros =
    snapshot && (snapshot.receita !== null || snapshot.despesas !== null);

  const fuso = fusoDoEstado(prefeitura?.estado);

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted first-letter:uppercase">
            {dataPorExtenso(fuso)}
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.04em] leading-[1.05] mt-2">
            {saudacao(fuso)}, {sessao.cargo === "prefeito" ? `Prefeito(a) ${sessao.nome}` : sessao.nome}.
          </h1>
          {/* A saudação encolheu para uma linha. Ela é cortesia, não conteúdo:
              o que o prefeito precisa ver primeiro está logo abaixo. */}
          <p className="text-muted mt-2">
            {achados.length > 0
              ? `${achados.length} ${achados.length === 1 ? "ponto pede" : "pontos pedem"} sua decisão hoje.`
              : listaAlertas.length > 0
              ? `Sua prefeitura possui ${listaAlertas.length} alerta${listaAlertas.length > 1 ? "s" : ""} em aberto.`
              : "Nenhum alerta em aberto no momento."}
          </p>
        </div>
        <a
          href="/api/relatorios/executivo"
          className="group shrink-0 flex items-center gap-2 border border-border bg-card rounded-full px-5 py-2.5 text-sm font-medium hover:border-brand hover:text-brand-claro transition"
        >
          <IconDownload className="w-4 h-4 transition-transform duration-200 group-hover:translate-y-0.5" />
          Relatório executivo (PDF)
        </a>
      </div>

      {/* O painel do vídeo da home: três números, a despesa com pessoal nas
          linhas da LRF e o aviso antecipado, com o dado desta prefeitura. A
          régua da LRF que ficava aqui virou o gráfico; o primeiro aviso
          antecipado vai no cartão ao lado, e os demais seguem na lista. */}
      {visao && <VisaoDoPrefeito dados={visao} antecipacao={antecipacoes[0] ?? null} />}

      {/* A lista do que exige decisão vem logo depois: é o que pede ação hoje. */}
      <PainelAtencao achados={achados} />

      <PainelAntecipacao antecipacoes={visao ? antecipacoes.slice(1) : antecipacoes} />

      {/* A lista acima é o que se decide HOJE. O que o Tribunal de Contas
          julga no fim do exercício é outra pergunta, e ela tem tela própria —
          esta linha é a ponte, porque um prefeito não adivinha que existe uma
          sétima entrada no menu que responde se o mandato está em risco. */}
      <Link
        href="/dashboard/prestacao"
        className="group inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-dark transition"
      >
        Ver a prestação de contas do exercício
        <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
          →
        </span>
      </Link>

      <InsightIA
        acao={gerarInsightIA}
        modulo="geral"
        inicial={await insightInicial(sessao.prefeituraId, "geral", { cargo: sessao.cargo, secretaria: sessao.secretaria })}
      />

      {/* A IA Central era um cartão grande, com ícone em gradiente e três
          linhas de texto, logo abaixo da lista de decisões — competindo com
          ela pela mesma atenção. Virou um link: continua a um clique, sem
          disputar o primeiro lugar da tela com o que exige ação hoje. */}
      <Link
        href="/dashboard/ia"
        className="group inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-dark transition"
      >
        <IconIA className="w-4 h-4" />
        Perguntar à IA Central sobre estes números
        <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
          →
        </span>
      </Link>

      {/* VISÃO GERAL */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-muted">
            Visão Geral
          </h2>
          <DetalhesSnapshotForm />
        </div>

        {/* Os três números e a eficiência ficavam em quatro blocos separados,
            empilhados, ocupando quase uma tela. São contexto: dizem como está,
            não o que fazer. Cabem num painel só, e a lista de decisões acima
            fica sendo a maior coisa da página — como no material de venda. */}
        {temDadosFinanceiros ? (
          // A largura que manda é a do CARTÃO, não a da tela: com o menu
          // lateral aberto, uma tela de 1024px deixa só ~530px para o cartão,
          // e os três valores ficavam um por cima do outro. Por isso consulta
          // de contêiner (@container), e não breakpoint de tela.
          <div
            className="@container arco-card border border-border p-5 sm:p-6"
            style={{ background: "var(--card)" }}
          >
           <div className="grid gap-6 @3xl:grid-cols-[minmax(0,1fr)_auto] items-center">
            <div className="grid grid-cols-1 divide-y divide-border min-w-0">
              <CardMetrica
                label="Receita"
                valorNumerico={snapshot!.receita}
                tipo="moeda"
                cor="var(--brand)"
                delta={calcularDelta(snapshot!.receita, anterior?.receita ?? null)}
                upEhBom
                semCartao
              />
              <CardMetrica
                label="Despesas"
                valorNumerico={snapshot!.despesas}
                tipo="moeda"
                cor="var(--urgente)"
                delta={calcularDelta(snapshot!.despesas, anterior?.despesas ?? null)}
                upEhBom={false}
                semCartao
              />
              <CardMetrica
                label="Saldo"
                valorNumerico={snapshot!.saldo}
                tipo="moeda"
                cor="var(--accent)"
                delta={calcularDelta(snapshot!.saldo, anterior?.saldo ?? null)}
                upEhBom
                semCartao
              />
            </div>

            {snapshot!.indiceTransparencia !== null && (
              <div className="border-t pt-5 @3xl:pt-0 @3xl:border-t-0 @3xl:border-l border-border @3xl:pl-6 flex items-center gap-4">
                <GaugeEficiencia
                  valor={snapshot!.indiceTransparencia}
                  label="Eficiência da gestão"
                  sublabel="Índice de Transparência mais recente."
                />
                {(() => {
                  const delta = calcularDelta(
                    snapshot!.indiceTransparencia,
                    anterior?.indiceTransparencia ?? null
                  );
                  if (delta === null) return null;
                  return Math.abs(delta) < 0.05 ? (
                    <span className="text-xs font-semibold text-muted">estável</span>
                  ) : (
                    <DeltaBadge percentual={delta} upEhBom />
                  );
                })()}
              </div>
            )}
           </div>
          </div>
        ) : (
          <EstadoVazio
            icone="indicadores"
            titulo="Nenhum indicador registrado ainda."
            descricao="Use “Atualizar indicadores” acima para adicionar os primeiros números da sua prefeitura."
          />
        )}
      </div>

      {/* ALERTAS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-muted">
            Alertas
          </h2>
          <Link
            href="/dashboard/alertas"
            className="text-xs font-semibold text-brand hover:underline"
          >
            Ver todos →
          </Link>
        </div>

        {listaAlertas.length === 0 ? (
          <EstadoVazio icone="alertas" titulo="Nenhum alerta em aberto." />
        ) : (
          <div className="space-y-4">
            <BarraAlertasPrioridade contagens={contagemPorPrioridade} />
            <div className="space-y-2">
            {listaAlertas.slice(0, 5).map((a) => (
              <div
                key={a.id}
                className="card-interactive flex items-center justify-between arco-card-sm border border-border border-l-4 bg-card px-4 py-3 text-sm"
                style={{ borderLeftColor: estiloPrioridade(a.prioridade).cor }}
              >
                <div>
                  <p className="font-medium">{a.titulo}</p>
                  {a.descricao && (
                    <p className="text-xs text-muted mt-0.5">{a.descricao}</p>
                  )}
                </div>
                <BadgePrioridade prioridade={a.prioridade} className="ml-4" />
              </div>
            ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CardMetrica({
  label,
  valorNumerico,
  tipo,
  cor,
  delta,
  upEhBom,
  semCartao,
}: {
  label: string;
  valorNumerico: number | null;
  tipo: "moeda" | "percentual";
  cor: string;
  delta?: number | null;
  upEhBom?: boolean;
  /**
   * Sem moldura própria, para viver dentro de um painel maior.
   *
   * Três cartões com borda e sombra dentro de outro cartão criam moldura sobre
   * moldura, e o olho passa a ver seis objetos onde há um grupo de números.
   */
  semCartao?: boolean;
}) {
  if (semCartao) {
    // Uma linha por número, valor alinhado à direita e completo, com centavos.
    // Em colunas lado a lado, "R$ 482.000,00" não cabia ao lado do vizinho
    // e um invadia o outro; em linhas, o valor tem a largura inteira do bloco
    // e os três ficam alinhados pela vírgula, como numa planilha.
    return (
      <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-0.5 self-stretch rounded-full shrink-0" style={{ background: cor }} aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium">{label}</p>
            {delta !== null && delta !== undefined && (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted whitespace-nowrap">
                <DeltaBadge percentual={delta} upEhBom={upEhBom ?? false} />
                <span className="hidden @sm:inline">vs. anterior</span>
              </p>
            )}
          </div>
        </div>
        {valorNumerico !== null ? (
          <ValorAnimado
            valor={valorNumerico}
            tipo={tipo}
            className="text-lg @sm:text-xl font-semibold leading-tight tracking-[-0.02em] whitespace-nowrap tabular-nums text-right"
          />
        ) : (
          <span className="text-lg font-semibold leading-tight text-muted">—</span>
        )}
      </div>
    );
  }

  return (
    <div className="card-interactive relative overflow-hidden bg-card border border-border arco-card-sm p-4">
      <span
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: cor }}
      />
      <p className="text-xs font-semibold text-muted">
        {label}
      </p>
      <div className="flex items-baseline gap-2 mt-1.5">
        {valorNumerico !== null ? (
          <ValorAnimado
            valor={valorNumerico}
            tipo={tipo}
            className="text-2xl font-semibold leading-tight tracking-[-0.02em]"
          />
        ) : (
          <p className="text-2xl font-semibold leading-tight tracking-[-0.02em]">—</p>
        )}
        {delta !== null && delta !== undefined && (
          <DeltaBadge percentual={delta} upEhBom={upEhBom ?? true} />
        )}
      </div>
      {delta !== null && delta !== undefined && (
        <p className="text-[10px] text-muted mt-0.5">vs. registro anterior</p>
      )}
    </div>
  );
}

function DeltaBadge({
  percentual,
  upEhBom,
}: {
  percentual: number;
  upEhBom: boolean;
}) {
  const subiu = percentual > 0;
  const neutro = Math.abs(percentual) < 0.05;
  const bom = subiu === upEhBom;
  // Tokens, não hexadecimal: estes três eram #6b6b64, #0ca30c e #d03b3b — um
  // cinza, um verde e um vermelho que não existem em nenhum outro lugar do
  // produto e não acompanham o modo escuro. Variação boa é --info, variação
  // ruim é --urgente, e sem variação é --muted, como em toda outra tela.
  const cor = neutro ? "var(--muted)" : bom ? "var(--info)" : "var(--urgente)";
  const Icone = subiu ? IconSetaCima : IconSetaBaixo;

  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-semibold"
      style={{ color: cor }}
    >
      {!neutro && <Icone className="w-3 h-3" />}
      {Math.abs(percentual).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
    </span>
  );
}

function DetalhesSnapshotForm() {
  return (
    <details className="relative">
      <summary className="text-xs font-semibold text-brand hover:underline cursor-pointer list-none">
        Atualizar indicadores
      </summary>
      <form
        action={atualizarSnapshot}
        className="absolute right-0 z-10 mt-2 w-72 bg-card border border-border rounded-xl p-4 shadow-lg space-y-3"
      >
        <p className="text-xs text-muted">
          Inserção manual (Fase 1) — sem integração automática ainda.
        </p>
        <div>
          <label className="block text-xs font-medium mb-1">Receita (R$)</label>
          <input
            name="receita"
            type="number"
            step="0.01"
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Despesas (R$)</label>
          <input
            name="despesas"
            type="number"
            step="0.01"
            className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">
            Índice de Transparência (%)
          </label>
          <input
            name="indiceTransparencia"
            type="number"
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
