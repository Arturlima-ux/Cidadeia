import Link from "next/link";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import { buscarResultados, buscarValorAlunoAno } from "../resultado-actions";
import { buscarRedeDeEscolas, buscarOcorrenciasDoAno } from "../rede-actions";
import { buscarMerendaDaRede } from "../merenda-actions";
import { buscarCasosDaRede } from "../busca-ativa-actions";
import { FormularioResultado, FormularioValorAluno, BotaoRemoverResultado } from "./FormulariosResultado";
import {
  montarResultados,
  apurarFundebPorAluno,
  explicarResultado,
  anosDeResultado,
  rotuloEtapa,
  rotuloTendencia,
  ROTULO_SITUACAO_RESULTADO,
} from "@/lib/resultado-educacao";
import { aulasPerdidas } from "@/lib/ocorrencias-escola";
import { situacaoDoItemMerenda } from "@/lib/merenda";
import { lerCaso, emAndamento } from "@/lib/busca-ativa";
import { formatarMoeda } from "@/lib/formatadores";

// ── DINHEIRO E RESULTADO ──
//
// O fecho do módulo. A diferença de matrícula que a fase 1 descobriu vira
// reais aqui, e o resultado de cada escola aparece ao lado do que
// aconteceu nela — dias de aula perdidos, alunos em busca ativa, merenda
// em falta. Nota baixa em escola nessas condições não é mistério
// pedagógico, e é isso que nenhum painel de IDEB diz.

export const metadata = { title: "Dinheiro e resultado" };
export const dynamic = "force-dynamic";

const COR = {
  atingido: "var(--accent)",
  perto: "var(--medio)",
  abaixo: "var(--urgente)",
  sem_meta: "var(--muted)",
} as const;

const SETA = { subiu: "↑", caiu: "↓", estavel: "→", sem_serie: "" } as const;

export default async function ResultadoPage({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("educacao")) return <BloqueioPlano plano="educacao" />;

  const opcoes = anosDeResultado();
  const { ano: anoParam } = await searchParams;
  const ano = opcoes.find((a) => String(a) === anoParam) ?? opcoes[0]!;

  const [doAno, doAnterior, fundeb, escolas, ocorrencias, merenda, casos] = await Promise.all([
    buscarResultados(ctx.sessao.prefeituraId, ano),
    buscarResultados(ctx.sessao.prefeituraId, ano - 2),
    buscarValorAlunoAno(ctx.sessao.prefeituraId, ano),
    buscarRedeDeEscolas(ctx.sessao.prefeituraId),
    buscarOcorrenciasDoAno(ctx.sessao.prefeituraId),
    buscarMerendaDaRede(ctx.sessao.prefeituraId),
    buscarCasosDaRede(ctx.sessao.prefeituraId),
  ]);

  const nomeDe = new Map(escolas.map((e) => [e.id, e.nome]));
  const linhas = montarResultados(doAno, doAnterior);
  const idPorChave = new Map(doAno.map((r) => [`${r.escolaId ?? ""}::${r.etapa}::${r.indicador}`, r.id]));
  const apuracao = apurarFundebPorAluno(escolas, fundeb?.valorAlunoAno ?? null);

  // ── o contexto operacional de cada escola, para o cruzamento ──
  const contextoDe = (escolaId: string) => {
    const doEscola = ocorrencias.filter((o) => o.escolaId === escolaId);
    const casosDaEscola = casos.filter((c) => c.escolaId === escolaId && emAndamento(c.situacao));
    return {
      diasPerdidos: aulasPerdidas(doEscola),
      casosBuscaAtiva: casosDaEscola.length,
      alunosAbaixoDaFrequencia: casosDaEscola.filter((c) => lerCaso(c).situacaoFrequencia === "reprovacao").length,
      itensDeMerendaEmFalta: merenda.filter(
        (l) => l.escolaId === escolaId && situacaoDoItemMerenda(l.saldo, l.consumoDiario) === "falta"
      ).length,
    };
  };

  const abaixoDaMeta = linhas.filter((l) => l.situacao === "abaixo").length;
  const pioraram = linhas.filter((l) => l.tendencia === "caiu").length;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/dashboard/secretarias/educacao" className="text-xs font-semibold text-muted hover:text-brand transition">
          ← Secretaria da Educação
        </Link>
        <h1 className="font-serif text-2xl font-bold mt-2">Dinheiro e resultado</h1>
        <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-2xl">
          O FUNDEB paga por aluno declarado ao Censo Escolar. Aqui a diferença entre o que foi declarado e
          o que as escolas têm hoje vira reais — e o resultado de cada escola aparece ao lado do que
          aconteceu nela durante o ano.
        </p>
      </div>

      {/* ── o dinheiro ── */}
      <section
        className="rounded-2xl border p-5"
        style={{
          borderColor: apuracao.alunosForaDaConta > 0 || apuracao.alunosDeclaradosAMais > 0 ? "var(--medio)" : "var(--border)",
          background: apuracao.alunosForaDaConta > 0 || apuracao.alunosDeclaradosAMais > 0 ? "var(--medio-tint)" : "var(--card)",
        }}
      >
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Matrícula que vira repasse</p>
        <p className="font-serif text-3xl font-bold mt-1">
          {apuracao.reaisForaDaConta !== null && apuracao.alunosForaDaConta > 0
            ? formatarMoeda(apuracao.reaisForaDaConta)
            : apuracao.reaisEmRiscoDeGlosa !== null && apuracao.alunosDeclaradosAMais > 0
              ? formatarMoeda(apuracao.reaisEmRiscoDeGlosa)
              : `${apuracao.alunosForaDaConta + apuracao.alunosDeclaradosAMais} aluno(s)`}
          <span className="text-sm font-sans font-normal text-muted">
            {" "}
            {apuracao.alunosForaDaConta > 0 ? "por ano, fora da conta do FUNDEB" : apuracao.alunosDeclaradosAMais > 0 ? "de repasse sob risco de glosa" : "de diferença"}
          </span>
        </p>
        <p className="text-sm mt-2 leading-relaxed">{apuracao.frase}</p>

        {apuracao.porEscola.length > 0 && (
          <ul className="mt-3 text-sm space-y-1">
            {apuracao.porEscola.slice(0, 6).map((g) => (
              <li key={g.escolaId} className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/dashboard/secretarias/educacao/escolas/${g.escolaId}`} className="hover:text-brand transition">
                  {g.escolaNome}
                </Link>
                <span className="tabular-nums text-muted">
                  {g.diferenca > 0 ? `+${g.diferenca}` : g.diferenca} aluno(s)
                  {g.reais !== null && ` · ${formatarMoeda(g.reais)}`}
                </span>
              </li>
            ))}
            {apuracao.porEscola.length > 6 && <li className="text-xs text-muted">+ {apuracao.porEscola.length - 6} escola(s)</li>}
          </ul>
        )}
      </section>

      <FormularioValorAluno ano={ano} valorAtual={fundeb?.valorAlunoAno ?? null} />

      <p className="text-sm leading-relaxed rounded-xl px-4 py-3 border border-border bg-card">
        Os <strong>70% do FUNDEB para remuneração dos profissionais</strong> (Lei 14.113/2020, art. 26) não
        são controlados aqui: ficam nos{" "}
        <Link href="/dashboard/minimos" className="font-semibold text-brand hover:underline">
          mínimos constitucionais
        </Link>
        , onde o contador informa a base. Uma obrigação, um lugar só.
      </p>

      {/* ── escolha do ano ── */}
      <div className="flex flex-wrap gap-2">
        {opcoes.map((a) => {
          const ativo = a === ano;
          return (
            <Link
              key={a}
              href={`/dashboard/secretarias/educacao/resultado?ano=${a}`}
              className={`text-xs font-semibold rounded-full px-3.5 py-1.5 border transition ${ativo ? "border-brand text-brand" : "border-border text-muted hover:border-brand"}`}
            >
              {a}
            </Link>
          );
        })}
      </div>

      {/* ── o resultado ── */}
      <section className="space-y-3">
        <div>
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">Resultado em {ano}</h2>
          <p className="text-sm text-muted mt-1 leading-relaxed max-w-2xl">
            {linhas.length === 0
              ? "Nada lançado neste ano ainda. Os números saem do painel do INEP — não existe API pública desses resultados por escola."
              : `${linhas.length} lançamento(s)${abaixoDaMeta > 0 ? `, ${abaixoDaMeta} abaixo da meta` : ""}${pioraram > 0 ? `, ${pioraram} pior que dois anos atrás` : ""}.`}
          </p>
        </div>

        {linhas.length > 0 && (
          <div className="overflow-x-auto rolagem-discreta rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-mono uppercase tracking-[0.12em] text-muted border-b border-border">
                  <th className="px-4 py-2.5 font-medium">Indicador</th>
                  <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Escola</th>
                  <th className="px-4 py-2.5 font-medium text-right">Resultado</th>
                  <th className="px-4 py-2.5 font-medium text-right">Meta</th>
                  <th className="px-4 py-2.5 font-medium">Situação</th>
                  <th className="px-4 py-2.5 font-medium text-right">vs. {ano - 2}</th>
                  <th className="px-2 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  const explicacao = l.escolaId ? explicarResultado(l, contextoDe(l.escolaId)) : null;
                  return (
                    <tr key={`${l.escolaId ?? "rede"}-${l.etapa}-${l.indicador.chave}`} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{l.indicador.nome}</span>
                        <span className="block text-xs text-muted">{rotuloEtapa(l.etapa)}</span>
                      </td>
                      <td className="px-4 py-2.5 text-muted hidden sm:table-cell">
                        {l.escolaId ? nomeDe.get(l.escolaId) ?? "—" : "rede inteira"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                        {l.valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                        {l.indicador.unidade}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                        {l.meta === null ? "—" : `${l.meta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${l.indicador.unidade}`}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: COR[l.situacao] }}>
                        {ROTULO_SITUACAO_RESULTADO[l.situacao]}
                        {l.distancia !== null && (
                          <span className="block font-normal">
                            faltam {l.distancia.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                            {l.indicador.unidade}
                          </span>
                        )}
                        {explicacao && (
                          <span className="block font-normal text-muted mt-1 leading-snug normal-case tracking-normal">{explicacao}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                        {l.tendencia === "sem_serie" ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <span
                            style={{
                              color:
                                rotuloTendencia(l.tendencia, l.indicador.sentido) === "piorou" ||
                                rotuloTendencia(l.tendencia, l.indicador.sentido) === "piorou (subiu)"
                                  ? "var(--urgente)"
                                  : l.tendencia === "estavel"
                                    ? "var(--muted)"
                                    : "var(--accent)",
                            }}
                          >
                            {SETA[l.tendencia]} {l.anterior !== null ? l.anterior.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : ""}
                            <span className="block">{rotuloTendencia(l.tendencia, l.indicador.sentido)}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        {!ctx.sessao.demo && (
                          <BotaoRemoverResultado id={idPorChave.get(`${l.escolaId ?? ""}::${l.etapa}::${l.indicador.chave}`) ?? ""} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Lançar resultado</h3>
          <FormularioResultado anos={opcoes} anoSelecionado={ano} escolas={escolas.map((e) => ({ id: e.id, nome: e.nome }))} />
        </div>
      </section>

      <p className="text-xs text-muted leading-relaxed">
        O IDEB é divulgado pelo INEP a cada dois anos, com meta projetada por escola — por isso a comparação
        é com dois anos atrás, e não com o ano anterior. Não há API pública desses resultados por escola: os
        números saem do painel do INEP e são informados aqui, como os da qualidade da APS na Saúde.
      </p>
    </div>
  );
}
