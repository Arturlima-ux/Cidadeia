import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { unidadesSaude, ocorrenciasSaude } from "@/db/schema";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import { NOME_TIPO_UNIDADE, diasSemAtualizarNoCnes, DIAS_CNES_DESATUALIZADO } from "@/lib/cnes";
import { rotuloOcorrencia, diasAberta, situacaoDaUnidade } from "@/lib/ocorrencias-saude";
import { fusoDoEstado, dataHoraNumerica, dataNumerica } from "@/lib/horario";
import FormularioOcorrencia from "../../FormularioOcorrencia";
import BotaoResolverOcorrencia from "../../BotaoResolverOcorrencia";

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
  const abertas = ocorrencias.filter((o) => o.status === "aberta");
  const resolvidas = ocorrencias.filter((o) => o.status !== "aberta");
  const situacao = situacaoDaUnidade(abertas);
  const cor = COR_SITUACAO[situacao];
  const fuso = fusoDoEstado(ctx.prefeitura.estado);
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
        <Link href="/dashboard/secretarias/saude" className="text-xs font-semibold text-muted hover:text-brand transition">
          ← Secretaria da Saúde
        </Link>
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

      {/* ── o que merece atenção agora ── */}
      {(!u.ativo || (diasCnes !== null && diasCnes >= DIAS_CNES_DESATUALIZADO) || situacao !== "normal") && (
        <div className="rounded-2xl border p-4 space-y-2" style={{ borderColor: cor.cor, background: cor.fundo }}>
          {!u.ativo && (
            <p className="text-sm">
              <strong>Esta unidade não consta mais no CNES.</strong> Se ela ainda funciona, o cadastro precisa ser
              reativado no CNES — sem isso não há produção reconhecida nem repasse.
            </p>
          )}
          {diasCnes !== null && diasCnes >= DIAS_CNES_DESATUALIZADO && (
            <p className="text-sm">
              <strong>Cadastro no CNES sem atualização há {diasCnes} dias</strong> (desde {dataNumerica(u.cnesAtualizadoEm, fuso)}).
              A Portaria GM/MS 1.883/2018 exige atualização mensal; cadastro parado trava habilitações e repasses.
            </p>
          )}
          {abertas.filter((o) => o.gravidade === "urgente").map((o) => (
            <p key={o.id} className="text-sm">
              <strong>Urgente há {diasAberta(o.createdAt)} dia(s):</strong> {rotuloOcorrencia(o.tipo)} — {o.descricao}
            </p>
          ))}
          {situacao === "atencao" && abertas.length >= 3 && (
            <p className="text-sm">
              <strong>{abertas.length} ocorrências abertas</strong> ao mesmo tempo nesta unidade.
            </p>
          )}
        </div>
      )}

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
