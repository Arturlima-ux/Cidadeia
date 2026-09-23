import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { escolas, ocorrenciasEscola } from "@/db/schema";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import { rotuloOcorrenciaEscola, diasAbertaEscola, aulasPerdidas, lerCalendario, DIAS_LETIVOS_LDB } from "@/lib/ocorrencias-escola";
import { ROTULO_DEPENDENCIA } from "@/lib/censo-escolar";
import { fusoDoEstado, dataHoraNumerica, dataNumerica } from "@/lib/horario";
import FormularioOcorrenciaEscola, { BotaoResolverOcorrenciaEscola } from "../FormularioOcorrenciaEscola";
import AcessosEscola from "../AcessosEscola";
import DadosDaEscola from "../DadosDaEscola";
import { lerEscola, mencionaEscola } from "@/lib/leitura-escola";
import { buscarManifestacoesRecentesEducacao, listarAcessosEscola } from "../../rede-actions";
import { podeVerEscola, ehGestor } from "@/lib/sessao";

// ── A FICHA DA ESCOLA ──
//
// "Não sei o que está acontecendo na Escola X." Aqui está: o que o Censo
// Escolar diz dela (código INEP, dependência, etapas, matrícula declarada),
// o que a própria direção registrou (ocorrências abertas e resolvidas, em
// linha do tempo), quantos dias de aula a escola já perdeu contra os 200
// que a LDB exige, e o que merece atenção. Uma tela por escola, com
// endereço fixo, para mandar no grupo da secretaria.

export const dynamic = "force-dynamic";

const COR_SITUACAO = {
  normal: { cor: "var(--accent)", fundo: "var(--accent-tint)", rotulo: "Sem pendência" },
  atencao: { cor: "var(--medio)", fundo: "var(--medio-tint)", rotulo: "Atenção" },
  urgente: { cor: "var(--urgente)", fundo: "var(--urgente-tint)", rotulo: "Urgente" },
} as const;

const COR_CALENDARIO = { normal: "var(--accent)", atencao: "var(--medio)", estourado: "var(--urgente)" } as const;

export default async function FichaEscolaPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("educacao")) return <BloqueioPlano plano="educacao" />;
  const { id } = await params;
  // A direção só abre a própria ficha; o proxy já redireciona, e aqui fecha de vez.
  if (!podeVerEscola(ctx.sessao, id)) notFound();
  const direcaoDeEscola = ctx.sessao.cargo === "escola";
  const podeGerirAcessos = ehGestor(ctx.sessao) || (ctx.sessao.cargo === "secretario" && ctx.sessao.secretaria === "educacao");

  const [e] = await db
    .select()
    .from(escolas)
    .where(and(eq(escolas.id, id), eq(escolas.prefeituraId, ctx.sessao.prefeituraId)))
    .limit(1);
  if (!e) notFound();

  let ocorrencias: (typeof ocorrenciasEscola.$inferSelect)[] = [];
  try {
    ocorrencias = await db
      .select()
      .from(ocorrenciasEscola)
      .where(eq(ocorrenciasEscola.escolaId, e.id))
      .orderBy(desc(ocorrenciasEscola.createdAt))
      .limit(100);
  } catch (err) {
    console.error("[ficha-escola] ocorrências:", err);
  }

  const manifestacoes = direcaoDeEscola ? [] : await buscarManifestacoesRecentesEducacao(ctx.sessao.prefeituraId);
  const mencoes = manifestacoes.filter((m) => mencionaEscola(`${m.assunto} ${m.mensagem}`, e.nome));
  const abertas = ocorrencias.filter((o) => o.status === "aberta");
  const resolvidas = ocorrencias.filter((o) => o.status !== "aberta");
  const inicioDoAno = `${new Date().getUTCFullYear()}-01-01`;
  const doAno = ocorrencias.filter((o) => o.createdAt >= inicioDoAno);

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
    ocorrenciasAbertas: abertas,
    ocorrenciasDoAno: doAno,
    mencoesOuvidoria: mencoes,
  });
  const situacao = leitura.situacao;
  const cor = COR_SITUACAO[situacao];
  const fuso = fusoDoEstado(ctx.prefeitura.estado);
  const acessos = podeGerirAcessos && !ctx.sessao.demo ? await listarAcessosEscola(e.id) : [];
  const calendario = lerCalendario(aulasPerdidas(doAno), e.diasPrevistos ?? DIAS_LETIVOS_LDB);

  const fatos: { rotulo: string; valor: string }[] = [
    ...(e.codigoInep ? [{ rotulo: "Código INEP", valor: e.codigoInep }] : []),
    ...(e.dependencia ? [{ rotulo: "Rede", valor: ROTULO_DEPENDENCIA[e.dependencia] }] : []),
    ...(e.etapas ? [{ rotulo: "Etapas ofertadas", valor: e.etapas }] : []),
    ...(e.porte ? [{ rotulo: "Porte", valor: e.porte }] : []),
    ...(e.localizacao ? [{ rotulo: "Localização", valor: e.localizacao === "rural" ? "Rural" : "Urbana" }] : []),
    ...(e.endereco || e.bairro ? [{ rotulo: "Endereço", valor: [e.endereco, e.bairro].filter(Boolean).join(" · ") }] : []),
    ...(e.telefone ? [{ rotulo: "Telefone", valor: e.telefone }] : []),
    ...(e.situacao ? [{ rotulo: "Situação no Censo", valor: e.situacao === "ativa" ? "Em atividade" : e.situacao === "paralisada" ? "Paralisada" : "Extinta" }] : []),
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        {!direcaoDeEscola && (
          <Link href="/dashboard/secretarias/educacao" className="text-xs font-semibold text-muted hover:text-brand transition">
            ← Secretaria da Educação
          </Link>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3 mt-2">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-bold">{e.nome}</h1>
            <p className="text-sm text-muted mt-1">
              {e.dependencia ? ROTULO_DEPENDENCIA[e.dependencia] : "Rede não informada"}
              {e.bairro ? ` · ${e.bairro}` : ""}
              {e.origem === "censo" ? ` · do Censo Escolar${e.censoAno ? ` ${e.censoAno}` : ""}` : " · cadastro manual"}
              {e.situacao === "paralisada" ? " · PARALISADA NO CENSO" : ""}
            </p>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider rounded-full px-3 py-1.5" style={{ color: cor.cor, background: cor.fundo }}>
            {cor.rotulo}
          </span>
        </div>
      </div>

      {/* ── leitura automática: o que importa agora, e o que fazer ── */}
      <section className="rounded-2xl border p-5" style={{ borderColor: cor.cor, background: leitura.achados.length ? cor.fundo : "var(--card)" }}>
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: cor.cor }}>
          Leitura automática
        </p>
        {leitura.achados.length === 0 ? (
          <p className="text-sm mt-2">{leitura.resumo}</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-3">
            {leitura.achados.map((a, i) => (
              <li key={i} className="text-sm">
                <p>
                  <span className="font-semibold">{a.titulo}.</span> <span className="text-muted">{a.detalhe}</span>
                </p>
                <p className="mt-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider mr-1.5" style={{ color: cor.cor }}>
                    Ação
                  </span>
                  {a.acao}
                </p>
              </li>
            ))}
          </ol>
        )}
        <p className="text-[11px] text-muted mt-3">
          Por regra, sobre o cadastro no Censo Escolar, a matrícula declarada, as ocorrências, o calendário
          letivo e a ouvidoria — cada linha diz de onde veio.
          {mencoes.length === 0 && !direcaoDeEscola ? " Nenhuma manifestação do cidadão cita esta escola nos últimos 30 dias." : ""}
        </p>
      </section>

      {/* ── os dois números que decidem: matrícula e calendário ── */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Matrícula</p>
          <p className="font-serif text-2xl font-bold mt-1">
            {e.matriculasAtuais ?? "—"}
            <span className="text-sm font-sans font-normal text-muted"> alunos hoje</span>
          </p>
          <p className="text-sm text-muted mt-1 leading-relaxed">
            {e.matriculasCenso !== null
              ? `Declarados ao Censo ${e.censoAno ?? ""}: ${e.matriculasCenso}. É por este número que o FUNDEB paga.`
              : "Sem matrícula declarada — importe a rede do Censo Escolar para comparar."}
          </p>
        </div>
        <div className="rounded-2xl border p-5" style={{ borderColor: COR_CALENDARIO[calendario.situacao], background: calendario.situacao === "normal" ? "var(--card)" : calendario.situacao === "atencao" ? "var(--medio-tint)" : "var(--urgente-tint)" }}>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: COR_CALENDARIO[calendario.situacao] }}>
            Calendário letivo
          </p>
          <p className="font-serif text-2xl font-bold mt-1">
            {calendario.perdidos}
            <span className="text-sm font-sans font-normal text-muted"> dia(s) de aula perdidos este ano</span>
          </p>
          <p className="text-sm mt-1 leading-relaxed">{calendario.frase}</p>
        </div>
      </div>

      {/* ── o que o Censo diz ── */}
      {fatos.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">Cadastro</h2>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {fatos.map((f) => (
              <div key={f.rotulo} className="flex gap-3">
                <dt className="text-muted w-40 shrink-0">{f.rotulo}</dt>
                <dd className="min-w-0 break-words">{f.valor}</dd>
              </div>
            ))}
            {e.sincronizadoEm && (
              <div className="flex gap-3">
                <dt className="text-muted w-40 shrink-0">Importada em</dt>
                <dd>{dataHoraNumerica(e.sincronizadoEm, fuso)}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section>
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-2">O que só a escola sabe</h2>
        <DadosDaEscola escolaId={e.id} matriculasAtuais={e.matriculasAtuais} diasPrevistos={e.diasPrevistos} bairro={e.bairro} />
      </section>

      {podeGerirAcessos && !ctx.sessao.demo && <AcessosEscola escolaId={e.id} nomeEscola={e.nome} acessos={acessos} />}

      {/* ── ocorrências ── */}
      <section className="space-y-4">
        <div>
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">O que está acontecendo</h2>
          <p className="text-sm text-muted mt-1 leading-relaxed max-w-2xl">
            Registre em segundos, pelo celular: professor faltou, ônibus quebrou, acabou a merenda,
            escola sem água. Vira a linha do tempo desta escola — e o que custou aula entra na conta dos
            {" "}{DIAS_LETIVOS_LDB} dias letivos.
          </p>
        </div>
        <FormularioOcorrenciaEscola escolaId={e.id} />

        {abertas.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Abertas ({abertas.length})</h3>
            <div className="rounded-2xl border border-border bg-card divide-y divide-border">
              {abertas.map((o) => (
                <div key={o.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-semibold" style={{ color: o.gravidade === "urgente" ? "var(--urgente)" : "var(--medio)" }}>
                        {rotuloOcorrenciaEscola(o.tipo)}
                      </span>
                      <span className="text-muted">
                        {" "}· {o.gravidade === "urgente" ? "urgente" : "atenção"} · há {diasAbertaEscola(o.createdAt)} dia(s)
                        {o.aulasPerdidas ? ` · ${o.aulasPerdidas} dia(s) de aula` : ""}
                        {o.alunosAfetados ? ` · ${o.alunosAfetados} aluno(s)` : ""}
                      </span>
                    </p>
                    <p className="text-sm mt-0.5 break-words">{o.descricao}</p>
                    <p className="text-xs text-muted mt-1">
                      {o.registradoPor} · {dataHoraNumerica(o.createdAt, fuso)}
                    </p>
                  </div>
                  <BotaoResolverOcorrenciaEscola id={o.id} />
                </div>
              ))}
            </div>
          </div>
        )}

        {resolvidas.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Resolvidas ({resolvidas.length})</h3>
            <div className="rounded-2xl border border-border divide-y divide-border opacity-80">
              {resolvidas.map((o) => (
                <div key={o.id} className="px-4 py-2.5 text-sm">
                  <span className="font-medium">{rotuloOcorrenciaEscola(o.tipo)}</span>
                  <span className="text-muted">
                    {" "}— {o.descricao} · {dataNumerica(o.createdAt, fuso)} → {dataNumerica(o.resolvidaEm, fuso)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {ocorrencias.length === 0 && (
          <p className="text-sm text-muted border border-dashed border-border rounded-2xl p-6 text-center">
            Nenhuma ocorrência registrada nesta escola ainda.
          </p>
        )}
      </section>
    </div>
  );
}
