import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { unidadesSaude, ocorrenciasSaude, estoqueSaude } from "@/db/schema";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import { NOME_TIPO_UNIDADE, diasSemAtualizarNoCnes } from "@/lib/cnes";
import { rotuloOcorrencia, diasAberta } from "@/lib/ocorrencias-saude";
import { fusoDoEstado, dataHoraNumerica, dataNumerica } from "@/lib/horario";
import FormularioOcorrencia from "../../FormularioOcorrencia";
import BotaoResolverOcorrencia from "../../BotaoResolverOcorrencia";
import AcessosUnidade from "../../AcessosUnidade";
import EstoqueUnidade from "../../EstoqueUnidade";
import { lerUnidade, mencionaUnidade } from "@/lib/leitura-unidade";
import { buscarManifestacoesRecentes } from "../../rede-actions";
import { listarAcessosUnidade } from "../../rede-actions";
import { podeVerUnidade, ehGestor } from "@/lib/sessao";

// ── A FICHA DA UNIDADE ──
//
// "Não sei o que está acontecendo na UBS X." Aqui está: o que o CNES diz
// dela (tipo, endereço, turno, SUS, quando foi atualizada), o que a
// própria equipe registrou (ocorrências abertas e resolvidas, em linha do
// tempo) e o que merece atenção. Uma tela por unidade, com endereço fixo,
// para mandar no grupo da secretaria.

export const dynamic = "force-dynamic";

const COR_SITUACAO = {
  normal: { cor: "var(--accent)", fundo: "var(--accent-tint)", rotulo: "Sem pendência" },
  atencao: { cor: "var(--medio)", fundo: "var(--medio-tint)", rotulo: "Atenção" },
  urgente: { cor: "var(--urgente)", fundo: "var(--urgente-tint)", rotulo: "Urgente" },
} as const;

export default async function FichaUnidadePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("saude")) return <BloqueioPlano plano="saude" />;
  const { id } = await params;
  // A gerência de unidade só abre a própria ficha; o proxy já redireciona,
  // e aqui fecha de vez.
  if (!podeVerUnidade(ctx.sessao, id)) notFound();
  const gerenciaDeUnidade = ctx.sessao.cargo === "unidade";
  const podeGerirAcessos = ehGestor(ctx.sessao) || (ctx.sessao.cargo === "secretario" && ctx.sessao.secretaria === "saude");

  const [u] = await db
    .select()
    .from(unidadesSaude)
    .where(and(eq(unidadesSaude.id, id), eq(unidadesSaude.prefeituraId, ctx.sessao.prefeituraId)))
    .limit(1);
  if (!u) notFound();

  let ocorrencias: (typeof ocorrenciasSaude.$inferSelect)[] = [];
  try {
    ocorrencias = await db
      .select()
      .from(ocorrenciasSaude)
      .where(eq(ocorrenciasSaude.unidadeId, u.id))
      .orderBy(desc(ocorrenciasSaude.createdAt))
      .limit(100);
  } catch (e) {
    console.error("[ficha-unidade] ocorrências:", e);
  }
  let estoque: (typeof estoqueSaude.$inferSelect)[] = [];
  try {
    estoque = await db.select().from(estoqueSaude).where(eq(estoqueSaude.unidadeId, u.id));
  } catch (e) {
    console.error("[ficha-unidade] estoque:", e);
  }
  const manifestacoes = gerenciaDeUnidade ? [] : await buscarManifestacoesRecentes(ctx.sessao.prefeituraId);
  const mencoes = manifestacoes.filter((m) => mencionaUnidade(`${m.assunto} ${m.mensagem}`, u.nome));
  const abertas = ocorrencias.filter((o) => o.status === "aberta");
  const resolvidas = ocorrencias.filter((o) => o.status !== "aberta");
  const leitura = lerUnidade({
    unidade: { nome: u.nome, ativo: u.ativo, cnesAtualizadoEm: u.cnesAtualizadoEm, origem: u.origem, turno: u.turno, atendeSus: u.atendeSus },
    ocorrenciasAbertas: abertas,
    estoque,
    mencoesOuvidoria: mencoes,
  });
  const situacao = leitura.situacao;
  const cor = COR_SITUACAO[situacao];
  const fuso = fusoDoEstado(ctx.prefeitura.estado);
  const acessos = podeGerirAcessos && !ctx.sessao.demo ? await listarAcessosUnidade(u.id) : [];
  const diasCnes = diasSemAtualizarNoCnes(u.cnesAtualizadoEm);

  const fatos: { rotulo: string; valor: string }[] = [
    { rotulo: "Tipo", valor: NOME_TIPO_UNIDADE[u.tipo] ?? u.tipo },
    ...(u.codigoCnes ? [{ rotulo: "CNES", valor: u.codigoCnes }] : []),
    ...(u.endereco || u.bairro ? [{ rotulo: "Endereço", valor: [u.endereco, u.bairro].filter(Boolean).join(" · ") }] : []),
    ...(u.telefone ? [{ rotulo: "Telefone", valor: u.telefone }] : []),
    ...(u.turno ? [{ rotulo: "Turno", valor: u.turno }] : []),
    ...(u.esfera ? [{ rotulo: "Esfera", valor: u.esfera.charAt(0) + u.esfera.slice(1).toLowerCase() }] : []),
    ...(u.atendeSus !== null ? [{ rotulo: "Ambulatório SUS", valor: u.atendeSus ? "Sim" : "Não" }] : []),
    ...(u.hospitalar ? [{ rotulo: "Atendimento hospitalar", valor: [u.centroCirurgico ? "centro cirúrgico" : null, u.centroObstetrico ? "centro obstétrico" : null].filter(Boolean).join(", ") || "Sim" }] : []),
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        {!gerenciaDeUnidade && (
          <Link href="/dashboard/secretarias/saude" className="text-xs font-semibold text-muted hover:text-brand transition">
            ← Secretaria da Saúde
          </Link>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3 mt-2">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-bold">{u.nome}</h1>
            <p className="text-sm text-muted mt-1">
              {NOME_TIPO_UNIDADE[u.tipo] ?? u.tipo}
              {u.bairro ? ` · ${u.bairro}` : ""}
              {u.origem === "cnes" ? " · do CNES" : " · cadastro manual"}
              {!u.ativo ? " · NÃO CONSTA MAIS NO CNES" : ""}
            </p>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider rounded-full px-3 py-1.5" style={{ color: cor.cor, background: cor.fundo }}>
            {cor.rotulo}
          </span>
        </div>
      </div>

      {/* ── leitura automática: o que importa agora, e o que fazer ── */}
      <section className="rounded-2xl border p-5" style={{ borderColor: cor.cor, background: leitura.achados.length ? cor.fundo : "var(--card)" }}>
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: cor.cor }}>Leitura automática</p>
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
                  <span className="text-[11px] font-bold uppercase tracking-wider mr-1.5" style={{ color: cor.cor }}>Ação</span>
                  {a.acao}
                </p>
              </li>
            ))}
          </ol>
        )}
        <p className="text-[11px] text-muted mt-3">
          Por regra, sobre o cadastro no CNES, as ocorrências, o estoque e a ouvidoria — cada linha diz de onde veio.
          {mencoes.length === 0 && !gerenciaDeUnidade ? " Nenhuma manifestação do cidadão cita esta unidade nos últimos 30 dias." : ""}
        </p>
      </section>

      {/* ── o que o CNES diz ── */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">Cadastro</h2>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {fatos.map((f) => (
            <div key={f.rotulo} className="flex gap-3">
              <dt className="text-muted w-40 shrink-0">{f.rotulo}</dt>
              <dd className="min-w-0 break-words">{f.valor}</dd>
            </div>
          ))}
          {u.cnesAtualizadoEm && (
            <div className="flex gap-3">
              <dt className="text-muted w-40 shrink-0">Atualizado no CNES</dt>
              <dd>
                {dataNumerica(u.cnesAtualizadoEm, fuso)}
                {diasCnes !== null && <span className="text-muted"> · há {diasCnes} dias</span>}
              </dd>
            </div>
          )}
          {u.sincronizadoEm && (
            <div className="flex gap-3">
              <dt className="text-muted w-40 shrink-0">Lido do CNES em</dt>
              <dd>{dataHoraNumerica(u.sincronizadoEm, fuso)}</dd>
            </div>
          )}
        </dl>
      </section>

      {podeGerirAcessos && !ctx.sessao.demo && (
        <AcessosUnidade unidadeId={u.id} nomeUnidade={u.nome} acessos={acessos} />
      )}

      <EstoqueUnidade unidadeId={u.id} fuso={fuso} linhas={estoque} />

      {/* ── ocorrências ── */}
      <section className="space-y-4">
        <div>
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">O que está acontecendo</h2>
          <p className="text-sm text-muted mt-1 leading-relaxed max-w-2xl">
            Registre em segundos, pelo celular: sem médico, faltou insulina, geladeira de vacina quebrou,
            fila. Vira a linha do tempo desta unidade — o que o indicador do mês nunca conta.
          </p>
        </div>
        <FormularioOcorrencia unidadeId={u.id} />

        {abertas.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Abertas ({abertas.length})</h3>
            <div className="rounded-2xl border border-border bg-card divide-y divide-border">
              {abertas.map((o) => (
                <div key={o.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-semibold" style={{ color: o.gravidade === "urgente" ? "var(--urgente)" : "var(--medio)" }}>
                        {rotuloOcorrencia(o.tipo)}
                      </span>
                      <span className="text-muted"> · {o.gravidade === "urgente" ? "urgente" : "atenção"} · há {diasAberta(o.createdAt)} dia(s)</span>
                    </p>
                    <p className="text-sm mt-0.5 break-words">{o.descricao}</p>
                    <p className="text-xs text-muted mt-1">
                      {o.registradoPor} · {dataHoraNumerica(o.createdAt, fuso)}
                    </p>
                  </div>
                  <BotaoResolverOcorrencia id={o.id} />
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
                  <span className="font-medium">{rotuloOcorrencia(o.tipo)}</span>
                  <span className="text-muted"> — {o.descricao} · {dataNumerica(o.createdAt, fuso)} → {dataNumerica(o.resolvidaEm, fuso)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {ocorrencias.length === 0 && (
          <p className="text-sm text-muted border border-dashed border-border rounded-2xl p-6 text-center">
            Nenhuma ocorrência registrada nesta unidade ainda.
          </p>
        )}
      </section>
    </div>
  );
}
