import Link from "next/link";
import { formatarNumero, formatarPercentual } from "@/lib/formatadores";
import { insightInicial } from "@/lib/ia";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import {
  buscarUltimoIndicadorEducacao,
  criarEscola,
  atualizarIndicadorEducacao,
  excluirEscola,
} from "./actions";
import {
  buscarRedeDeEscolas,
  buscarOcorrenciasAbertasEscolas,
  buscarOcorrenciasDoAno,
  buscarManifestacoesRecentesEducacao,
} from "./rede-actions";
import BotaoExcluir from "@/components/BotaoExcluir";
import { LIMITES_BRASIL } from "@/lib/coordenadas";
import MapaSecretariaClient from "@/components/MapaSecretariaClient";
import BloqueioPlano from "@/components/BloqueioPlano";
import EstadoVazio from "@/components/EstadoVazio";
import InsightIA from "@/components/InsightIA";
import { gerarInsightIA } from "@/app/dashboard/insight-actions";
import { IconDownload } from "@/components/icons";
import ImportarRedeCenso from "./ImportarRedeCenso";
import { lerEscola, mencionaEscola } from "@/lib/leitura-escola";
import { aulasPerdidas, lerCalendario, DIAS_LETIVOS_LDB } from "@/lib/ocorrencias-escola";
import { ROTULO_DEPENDENCIA, censoMaisRecenteDisponivel } from "@/lib/censo-escolar";

export default async function EducacaoPage() {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("educacao")) return <BloqueioPlano plano="educacao" />;

  const [listaEscolas, indicador, abertas, doAno, manifestacoes] = await Promise.all([
    buscarRedeDeEscolas(ctx.sessao.prefeituraId),
    buscarUltimoIndicadorEducacao(ctx.sessao.prefeituraId),
    buscarOcorrenciasAbertasEscolas(ctx.sessao.prefeituraId),
    buscarOcorrenciasDoAno(ctx.sessao.prefeituraId),
    buscarManifestacoesRecentesEducacao(ctx.sessao.prefeituraId),
  ]);

  const abertasPorEscola = new Map<string, typeof abertas>();
  for (const o of abertas) abertasPorEscola.set(o.escolaId, [...(abertasPorEscola.get(o.escolaId) ?? []), o]);
  const doAnoPorEscola = new Map<string, typeof doAno>();
  for (const o of doAno) doAnoPorEscola.set(o.escolaId, [...(doAnoPorEscola.get(o.escolaId) ?? []), o]);

  const ativas = listaEscolas.filter((e) => e.situacao !== "extinta");
  const doCenso = listaEscolas.filter((e) => e.origem === "censo").length;
  const manuais = listaEscolas.filter((e) => e.origem === "manual");

  // A leitura de cada escola ordena a lista: quem precisa de você primeiro.
  const situacoes = ativas.map((e) => {
    const leitura = lerEscola({
      escola: {
        nome: e.nome,
        situacao: e.situacao,
        dependencia: e.dependencia,
        origem: e.origem,
        censoAno: e.censoAno,
        matriculasCenso: e.matriculasCenso,
        matriculasAtuais: e.matriculasAtuais,
        diasPrevistos: e.diasPrevistos,
      },
      ocorrenciasAbertas: abertasPorEscola.get(e.id) ?? [],
      ocorrenciasDoAno: doAnoPorEscola.get(e.id) ?? [],
      mencoesOuvidoria: manifestacoes.filter((m) => mencionaEscola(`${m.assunto} ${m.mensagem}`, e.nome)),
    });
    return { e, situacao: leitura.situacao, leitura };
  });
  situacoes.sort((a, b) => b.leitura.peso - a.leitura.peso || a.e.nome.localeCompare(b.e.nome, "pt-BR"));
  const primeira = situacoes.find((s) => s.leitura.achados.length > 0);

  // ── os números da rede inteira ──
  const matriculaCenso = ativas.reduce((s, e) => s + (e.matriculasCenso ?? 0), 0);
  const matriculaHoje = ativas.reduce((s, e) => s + (e.matriculasAtuais ?? 0), 0);
  const comMatriculaInformada = ativas.filter((e) => e.matriculasAtuais !== null);
  const censoDasInformadas = comMatriculaInformada.reduce((s, e) => s + (e.matriculasCenso ?? 0), 0);
  const hojeDasInformadas = comMatriculaInformada.reduce((s, e) => s + (e.matriculasAtuais ?? 0), 0);
  const diferenca = hojeDasInformadas - censoDasInformadas;

  const calendarios = ativas.map((e) => ({
    e,
    c: lerCalendario(aulasPerdidas(doAnoPorEscola.get(e.id) ?? []), e.diasPrevistos ?? DIAS_LETIVOS_LDB),
  }));
  const estouradas = calendarios.filter((x) => x.c.situacao === "estourado");
  const semFolga = calendarios.filter((x) => x.c.situacao === "atencao");
  const totalPerdidos = calendarios.reduce((s, x) => s + x.c.perdidos, 0);

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-bold">Secretaria da Educação</h1>
          <p className="text-muted text-sm mt-1.5 max-w-2xl leading-relaxed">
            A rede vem do Censo Escolar — toda escola do município com código INEP, etapas ofertadas e a
            matrícula declarada, que é o número pelo qual o FUNDEB paga. O que acontece dentro de cada uma
            (professor faltou, ônibus quebrou, acabou a merenda) a direção registra pelo celular, na ficha
            da escola.
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

      <InsightIA
        acao={gerarInsightIA}
        modulo="educacao"
        inicial={await insightInicial(ctx.sessao.prefeituraId, "educacao", { cargo: ctx.sessao.cargo, secretaria: ctx.sessao.secretaria })}
      />

      {/* ── a escola que mais precisa de você hoje ── */}
      {primeira && (
        <Link
          href={`/dashboard/secretarias/educacao/escolas/${primeira.e.id}`}
          className="block rounded-2xl border p-5 hover:border-brand transition"
          style={{
            borderColor: primeira.situacao === "urgente" ? "var(--urgente)" : "var(--medio)",
            background: primeira.situacao === "urgente" ? "var(--urgente-tint)" : "var(--medio-tint)",
          }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: primeira.situacao === "urgente" ? "var(--urgente)" : "var(--medio)" }}
          >
            A escola que mais precisa de você agora
          </p>
          <p className="font-serif text-lg font-bold mt-1">{primeira.e.nome}</p>
          <p className="text-sm mt-1 leading-relaxed">{primeira.leitura.resumo}</p>
          {primeira.leitura.achados.length > 1 && (
            <p className="text-xs text-muted mt-1">+ {primeira.leitura.achados.length - 1} outro(s) ponto(s) na ficha →</p>
          )}
        </Link>
      )}

      {/* ── calendário letivo da rede: os 200 dias da LDB ── */}
      {ativas.length > 0 && (
        <div
          className="rounded-2xl border p-4"
          style={{
            borderColor: estouradas.length > 0 ? "var(--urgente)" : semFolga.length > 0 ? "var(--medio)" : "var(--border)",
            background: estouradas.length > 0 ? "var(--urgente-tint)" : semFolga.length > 0 ? "var(--medio-tint)" : "var(--card)",
          }}
        >
          <p className="font-semibold text-sm">
            {estouradas.length > 0
              ? `${estouradas.length} escola(s) já abaixo dos ${DIAS_LETIVOS_LDB} dias letivos.`
              : semFolga.length > 0
                ? `${semFolga.length} escola(s) sem folga no calendário.`
                : `Calendário letivo em dia em toda a rede${totalPerdidos > 0 ? ` — ${totalPerdidos} dia(s) perdidos no ano, todos dentro da folga` : ""}.`}
          </p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            A LDB (art. 24) exige {DIAS_LETIVOS_LDB} dias letivos por ano. Cada ocorrência que custou aula
            entra nesta conta automaticamente — quem descobre em dezembro não tem mais como repor.
            {estouradas.length > 0 && (
              <span className="block mt-1">
                {estouradas.slice(0, 4).map((x) => `${x.e.nome} (${-x.c.folga} dia(s) a repor)`).join(" · ")}
                {estouradas.length > 4 ? " · …" : ""}
              </span>
            )}
          </p>
        </div>
      )}

      {/* ── matrícula declarada x matrícula real ── */}
      {matriculaCenso > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-semibold text-sm">
            Matrícula declarada ao Censo: {formatarNumero(matriculaCenso)} aluno(s)
            {matriculaHoje > 0 && ` · informada hoje pelas escolas: ${formatarNumero(matriculaHoje)}`}
          </p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            {comMatriculaInformada.length === 0
              ? "Nenhuma escola informou a matrícula de hoje ainda. É essa comparação que mostra aluno atendido sem entrar na conta do FUNDEB."
              : diferenca === 0
                ? `Nas ${comMatriculaInformada.length} escola(s) que já informaram, o número de hoje bate com o declarado.`
                : diferenca > 0
                  ? `Nas ${comMatriculaInformada.length} escola(s) que já informaram há ${formatarNumero(diferenca)} aluno(s) a mais do que o declarado ao Censo — atendidos sem entrar na conta do FUNDEB.`
                  : `Nas ${comMatriculaInformada.length} escola(s) que já informaram há ${formatarNumero(-diferenca)} aluno(s) a menos do que o declarado ao Censo — ou saíram (busca ativa), ou a declaração está acima do real.`}
          </p>
        </div>
      )}

      {/* Indicadores */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">Indicadores</h2>
          <FormularioIndicador />
        </div>
        {indicador ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card
              label="Frequência"
              valor={indicador.frequenciaPercentual !== null ? formatarPercentual(indicador.frequenciaPercentual) : "—"}
            />
            <Card label="Nota média" valor={indicador.notaMedia !== null ? formatarNumero(indicador.notaMedia) : "—"} />
            <Card label="Alunos no transporte" valor={indicador.alunosTransporte?.toString() ?? "—"} />
            <Card label="Professores ativos" valor={indicador.professoresAtivos?.toString() ?? "—"} />
          </div>
        ) : (
          <EstadoVazio
            icone="indicadores"
            titulo="Nenhum indicador registrado ainda."
            descricao="Use “Atualizar indicadores” acima para adicionar os primeiros números da Educação."
          />
        )}
      </div>

      {/* Mapa */}
      {listaEscolas.some((e) => e.latitude !== null && e.longitude !== null) && (
        <div>
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">Mapa das escolas</h2>
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
      )}

      {/* ── a rede ── */}
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">Rede de escolas ({ativas.length})</h2>
            {doCenso > 0 && (
              <p className="text-xs text-muted mt-1">
                {doCenso} do Censo Escolar · {listaEscolas.length - doCenso} cadastrada(s) à mão
              </p>
            )}
          </div>
          {doCenso > 0 && <ImportarRedeCenso anoSugerido={censoMaisRecenteDisponivel()} destaque={false} />}
        </div>

        {doCenso === 0 && (
          <div className="rounded-2xl border p-5 mb-4 space-y-4" style={{ borderColor: "var(--brand)", background: "var(--brand-tint)" }}>
            <div>
              <p className="font-semibold">A rede do município já está no Censo Escolar. Traga para cá de uma vez.</p>
              <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-2xl">
                Escolas, creches e anexos — com código INEP, etapas ofertadas, endereço e a matrícula
                declarada ao INEP. Depois, cada escola ganha uma ficha e um acesso próprio para a direção
                registrar o que está acontecendo.
              </p>
              <p className="text-sm text-muted mt-2 leading-relaxed max-w-2xl">
                Onde pegar: <strong>Catálogo de Escolas do INEP</strong> → filtre pelo seu município →
                botão de exportar. Educação não tem uma API pública como o CNES da saúde; este arquivo é a
                fonte oficial.
              </p>
            </div>
            <ImportarRedeCenso anoSugerido={censoMaisRecenteDisponivel()} destaque />
          </div>
        )}

        {ativas.length === 0 ? null : (
          <div className="grid sm:grid-cols-2 gap-2">
            {situacoes.map(({ e, situacao, leitura }) => {
              const corSit = situacao === "urgente" ? "var(--urgente)" : situacao === "atencao" ? "var(--medio)" : "var(--accent)";
              return (
                <Link
                  key={e.id}
                  href={`/dashboard/secretarias/educacao/escolas/${e.id}`}
                  className="card-interactive bg-card arco-card-sm border border-border px-4 py-3 text-sm flex gap-3 items-start hover:border-brand transition"
                >
                  <span className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0" style={{ background: corSit }} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium break-words">{e.nome}</p>
                    <p className="text-xs text-muted">
                      {e.dependencia ? ROTULO_DEPENDENCIA[e.dependencia] : "rede não informada"}
                      {e.bairro ? ` · ${e.bairro}` : ""}
                      {e.matriculasAtuais !== null
                        ? ` · ${e.matriculasAtuais} alunos`
                        : e.matriculasCenso !== null
                          ? ` · ${e.matriculasCenso} no Censo`
                          : ""}
                    </p>
                    {leitura.achados.length > 0 && (
                      <p className="text-xs mt-1" style={{ color: corSit }}>
                        {leitura.achados[0]!.titulo}
                        {leitura.achados.length > 1 ? ` · +${leitura.achados.length - 1}` : ""}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted shrink-0">ficha →</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Cadastro manual continua existindo — para o que o Censo ainda não
            tem (creche nova, anexo, escola que abriu depois da coleta). */}
        <details className="mt-4">
          <summary className="text-xs font-semibold text-muted cursor-pointer">Cadastrar escola à mão</summary>
          <form action={criarEscola} className="bg-card border border-border rounded-2xl p-4 flex flex-wrap gap-3 items-end mt-2">
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
              <input name="bairro" placeholder="Centro" className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand" />
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
            <button type="submit" className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-5 py-2 transition">
              Adicionar
            </button>
          </form>
          {manuais.length > 0 && (
            <ul className="mt-2 text-xs text-muted">
              {manuais.map((e) => (
                <li key={e.id} className="flex items-center gap-2 py-1">
                  <span>{e.nome}</span>
                  <BotaoExcluir id={e.id} nome={e.nome} acao={excluirEscola} />
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
          <label className="block text-xs font-medium mb-1">Nota média (0-10)</label>
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
          <label className="block text-xs font-medium mb-1">Alunos no transporte escolar</label>
          <input name="alunosTransporte" type="number" className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Professores ativos</label>
          <input name="professoresAtivos" type="number" className="w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand" />
        </div>
        <button type="submit" className="w-full bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full py-2 transition">
          Salvar
        </button>
      </form>
    </details>
  );
}
