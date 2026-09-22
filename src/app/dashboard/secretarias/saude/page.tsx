import { formatarNumero, formatarPercentual } from "@/lib/formatadores";
import { insightInicial } from "@/lib/ia";
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
import InsightIA from "@/components/InsightIA";
import { gerarInsightIA } from "@/app/dashboard/insight-actions";
import { IconDownload } from "@/components/icons";
import Link from "next/link";
import BotaoSincronizarCnes from "./BotaoSincronizarCnes";
import { buscarOcorrenciasAbertas, buscarEstoqueDaRede, buscarManifestacoesRecentes } from "./rede-actions";
import { lerUnidade, mencionaUnidade } from "@/lib/leitura-unidade";
import { montarPedidoReposicao } from "@/lib/estoque-saude";
import { diasSemAtualizarNoCnes, DIAS_CNES_DESATUALIZADO } from "@/lib/cnes";
import { NOME_TIPO_UNIDADE } from "@/lib/cnes";

// Os rótulos vêm de lib/cnes.ts, a mesma fonte da importação.
const LABEL_TIPO: Record<string, string> = NOME_TIPO_UNIDADE;

export default async function SaudePage() {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("saude")) return <BloqueioPlano plano="saude" />;

  const [unidades, indicador, abertas, estoque, manifestacoes] = await Promise.all([
    buscarUnidadesSaude(ctx.sessao.prefeituraId),
    buscarUltimoIndicadorSaude(ctx.sessao.prefeituraId),
    buscarOcorrenciasAbertas(ctx.sessao.prefeituraId),
    buscarEstoqueDaRede(ctx.sessao.prefeituraId),
    buscarManifestacoesRecentes(ctx.sessao.prefeituraId),
  ]);
  const nomeUnidade = new Map(unidades.map((u) => [u.id, u.nome]));
  const pedido = montarPedidoReposicao(estoque.map((l) => ({ ...l, unidadeNome: nomeUnidade.get(l.unidadeId) ?? "Unidade" })));
  const emFalta = pedido.filter((i) => i.situacao === "falta" || i.situacao === "critico");
  const unidadesComReposicao = new Set(pedido.map((i) => i.unidadeId));
  const abertasPorUnidade = new Map<string, typeof abertas>();
  for (const o of abertas) abertasPorUnidade.set(o.unidadeId, [...(abertasPorUnidade.get(o.unidadeId) ?? []), o]);
  const ativas = unidades.filter((u) => u.ativo);
  const inativas = unidades.filter((u) => !u.ativo);
  const doCnes = unidades.filter((u) => u.origem === "cnes").length;
  const desatualizadasNoCnes = ativas.filter((u) => {
    const d = diasSemAtualizarNoCnes(u.cnesAtualizadoEm);
    return d !== null && d >= DIAS_CNES_DESATUALIZADO;
  });
  // A leitura de cada unidade ordena a lista: quem precisa de você primeiro.
  const estoquePorUnidade = new Map<string, typeof estoque>();
  for (const l of estoque) estoquePorUnidade.set(l.unidadeId, [...(estoquePorUnidade.get(l.unidadeId) ?? []), l]);
  const situacoes = ativas.map((u) => {
    const leitura = lerUnidade({
      unidade: { nome: u.nome, ativo: u.ativo, cnesAtualizadoEm: u.cnesAtualizadoEm, origem: u.origem, turno: u.turno, atendeSus: u.atendeSus },
      ocorrenciasAbertas: abertasPorUnidade.get(u.id) ?? [],
      estoque: estoquePorUnidade.get(u.id) ?? [],
      mencoesOuvidoria: manifestacoes.filter((m) => mencionaUnidade(`${m.assunto} ${m.mensagem}`, u.nome)),
    });
    return { u, situacao: leitura.situacao, leitura };
  });
  situacoes.sort((a, b) => b.leitura.peso - a.leitura.peso || a.u.nome.localeCompare(b.u.nome, "pt-BR"));
  const primeira = situacoes.find((s) => s.leitura.achados.length > 0);

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-bold">Secretaria da Saúde</h1>
          <p className="text-muted text-sm mt-1.5 max-w-2xl leading-relaxed">
            A rede vem do CNES — toda unidade que o município tem cadastrada no Ministério da Saúde,
            com tipo, endereço, turno e a data da última atualização. O que acontece dentro de cada
            uma (sem médico, faltou insulina, fila) a equipe registra pelo celular, na ficha da unidade.
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

      <InsightIA
        acao={gerarInsightIA}
        modulo="saude"
        inicial={await insightInicial(ctx.sessao.prefeituraId, "saude", { cargo: ctx.sessao.cargo, secretaria: ctx.sessao.secretaria })}
      />

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
                  ? `${formatarNumero(indicador.tempoMedioAtendimentoMin)} min`
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
                  ? formatarPercentual(indicador.faltasPercentual)
                  : "—"
              }
            />
            <Card
              label="Estoque de medicamentos"
              valor={
                indicador.estoqueMedicamentosPercentual !== null
                  ? formatarPercentual(indicador.estoqueMedicamentosPercentual)
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

      {/* ── a unidade que mais precisa de você hoje ── */}
      {primeira && (
        <Link
          href={`/dashboard/secretarias/saude/unidades/${primeira.u.id}`}
          className="block rounded-2xl border p-5 hover:border-brand transition"
          style={{
            borderColor: primeira.situacao === "urgente" ? "var(--urgente)" : "var(--medio)",
            background: primeira.situacao === "urgente" ? "var(--urgente-tint)" : "var(--medio-tint)",
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: primeira.situacao === "urgente" ? "var(--urgente)" : "var(--medio)" }}>
            A unidade que mais precisa de você agora
          </p>
          <p className="font-serif text-lg font-bold mt-1">{primeira.u.nome}</p>
          <p className="text-sm mt-1 leading-relaxed">{primeira.leitura.resumo}</p>
          {primeira.leitura.achados.length > 1 && (
            <p className="text-xs text-muted mt-1">+ {primeira.leitura.achados.length - 1} outro(s) ponto(s) na ficha →</p>
          )}
        </Link>
      )}

      {/* ── qualidade da APS: o repasse que depende do desempenho ── */}
      <Link
        href="/dashboard/secretarias/saude/aps"
        className="block rounded-2xl border border-border bg-card p-4 hover:border-brand transition"
      >
        <p className="font-semibold text-sm">Qualidade da APS — o repasse federal que depende do desempenho</p>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          Os 15 indicadores do componente de qualidade, por quadrimestre: resultado, meta pactuada,
          tendência e o que caiu. Com aviso do prazo de envio ao SIAPS. →
        </p>
      </Link>

      {/* ── estoque: o que vai faltar, antes de faltar ── */}
      {estoque.length > 0 && (
        <div
          className="rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3"
          style={{
            borderColor: emFalta.length > 0 ? "var(--urgente)" : pedido.length > 0 ? "var(--medio)" : "var(--border)",
            background: emFalta.length > 0 ? "var(--urgente-tint)" : pedido.length > 0 ? "var(--medio-tint)" : "var(--card)",
          }}
        >
          <div>
            <p className="font-semibold text-sm">
              {pedido.length === 0
                ? "Estoque: nenhum item abaixo de 15 dias de cobertura."
                : `Estoque: ${pedido.length} item(ns) para repor em ${unidadesComReposicao.size} unidade(s)${emFalta.length > 0 ? ` — ${emFalta.length} em falta ou acabando em dias` : ""}.`}
            </p>
            {emFalta.length > 0 && (
              <p className="text-xs text-muted mt-1">
                {emFalta.slice(0, 4).map((i) => `${i.item} (${i.unidadeNome})`).join(" · ")}{emFalta.length > 4 ? " · …" : ""}
              </p>
            )}
          </div>
          <Link href="/dashboard/secretarias/saude/reposicao" className="text-sm font-semibold border border-border rounded-full px-4 py-2 hover:border-brand hover:text-brand transition whitespace-nowrap">
            Pedido de reposição →
          </Link>
        </div>
      )}

      {/* ── a rede ── */}
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">
              Rede de saúde ({ativas.length})
            </h2>
            {doCnes > 0 && (
              <p className="text-xs text-muted mt-1">
                {doCnes} do CNES · {unidades.length - doCnes} cadastrada(s) à mão
                {desatualizadasNoCnes.length > 0 && (
                  <span style={{ color: "var(--medio)" }}> · {desatualizadasNoCnes.length} sem atualização no CNES há mais de {DIAS_CNES_DESATUALIZADO} dias</span>
                )}
              </p>
            )}
          </div>
          {doCnes > 0 && <BotaoSincronizarCnes destaque={false} />}
        </div>

        {doCnes === 0 && (
          <div className="rounded-2xl border p-5 mb-4" style={{ borderColor: "var(--brand)", background: "var(--brand-tint)" }}>
            <p className="font-semibold">A rede do município já está no CNES. Traga para cá em um clique.</p>
            <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-2xl">
              UBS, postos, hospitais, UPA, CAPS — com endereço, turno, se atende SUS e a data em que o
              cadastro foi atualizado no Ministério da Saúde. Nada para digitar. Depois, cada unidade
              ganha uma ficha para a equipe registrar o que está acontecendo.
            </p>
            <div className="mt-4">
              <BotaoSincronizarCnes destaque />
            </div>
          </div>
        )}

        {ativas.length === 0 && doCnes > 0 ? (
          <EstadoVazio icone="saude" titulo="Nenhuma unidade ativa." descricao="O CNES não devolveu unidades municipais ou que atendam SUS para este município." />
        ) : ativas.length === 0 ? null : (
          <div className="grid sm:grid-cols-2 gap-2">
            {situacoes.map(({ u, situacao, leitura }) => {
              const corSit = situacao === "urgente" ? "var(--urgente)" : situacao === "atencao" ? "var(--medio)" : "var(--accent)";
              return (
                <Link
                  key={u.id}
                  href={`/dashboard/secretarias/saude/unidades/${u.id}`}
                  className="card-interactive bg-card arco-card-sm border border-border px-4 py-3 text-sm flex gap-3 items-start hover:border-brand transition"
                >
                  <span className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0" style={{ background: corSit }} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium break-words">{u.nome}</p>
                    <p className="text-xs text-muted">
                      {LABEL_TIPO[u.tipo] ?? u.tipo}
                      {u.bairro ? ` · ${u.bairro}` : ""}
                      {u.turno ? ` · ${u.turno.toLowerCase().replace("atendimentos nos turnos da ", "").replace("atendimento ", "")}` : ""}
                    </p>
                    {leitura.achados.length > 0 && (
                      <p className="text-xs mt-1" style={{ color: corSit }}>
                        {leitura.achados[0]!.titulo}{leitura.achados.length > 1 ? ` · +${leitura.achados.length - 1}` : ""}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted shrink-0">ficha →</span>
                </Link>
              );
            })}
          </div>
        )}

        {inativas.length > 0 && (
          <details className="mt-3">
            <summary className="text-xs font-semibold text-muted cursor-pointer">
              {inativas.length} unidade(s) que não constam mais no CNES
            </summary>
            <ul className="mt-2 text-sm text-muted list-disc pl-5">
              {inativas.map((u) => (
                <li key={u.id}>
                  <Link href={`/dashboard/secretarias/saude/unidades/${u.id}`} className="hover:text-brand">{u.nome}</Link>
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* Cadastro manual continua existindo — para o que o CNES não tem
            (ponto de apoio, unidade nova antes de sair no cadastro). */}
        <details className="mt-4">
          <summary className="text-xs font-semibold text-muted cursor-pointer">Cadastrar unidade à mão</summary>
          <form
            action={criarUnidadeSaude}
            className="bg-card border border-border rounded-2xl p-4 flex flex-wrap gap-3 items-end mt-2"
          >
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium mb-1">Nome</label>
              <input name="nome" required placeholder="UBS Centro" className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Tipo</label>
              <select name="tipo" className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand">
                {Object.entries(LABEL_TIPO).map(([chave, rotulo]) => (
                  <option key={chave} value={chave}>{rotulo}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium mb-1">Bairro</label>
              <input name="bairro" placeholder="Centro" className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand" />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium mb-1">Latitude</label>
              <input name="latitude" type="number" step="any" min={LIMITES_BRASIL.latitude.min} max={LIMITES_BRASIL.latitude.max} placeholder="-3.7327" className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand" />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium mb-1">Longitude</label>
              <input name="longitude" type="number" step="any" min={LIMITES_BRASIL.longitude.min} max={LIMITES_BRASIL.longitude.max} placeholder="-38.5267" className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand" />
            </div>
            <button type="submit" className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-5 py-2 transition">
              Adicionar
            </button>
          </form>
          {unidades.filter((u) => u.origem === "manual").length > 0 && (
            <ul className="mt-2 text-xs text-muted">
              {unidades.filter((u) => u.origem === "manual").map((u) => (
                <li key={u.id} className="flex items-center gap-2 py-1">
                  <span>{u.nome}</span>
                  <BotaoExcluir id={u.id} nome={u.nome} acao={excluirUnidadeSaude} />
                </li>
              ))}
            </ul>
          )}
        </details>
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
