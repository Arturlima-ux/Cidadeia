import { notFound } from "next/navigation";
import { fusoDoEstado, dataNumerica } from "@/lib/horario";
import Link from "next/link";
import { buscarPortal } from "../actions";
import { db } from "@/db";
import { dashboardSnapshots, obras, licitacoes, publicacoes } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { formatarMoeda } from "@/lib/formatadores";
import { planosContratadosDe } from "@/lib/planos";
import { IconObras, IconLicitacoes, IconVisaoGeral } from "@/components/icons";
import PilulaStatus, { type TomStatus } from "@/components/PilulaStatus";
import FormularioCidadao from "../FormularioCidadao";
import SecoesPublicadas from "../SecoesPublicadas";

export const metadata = { title: "Portal da Transparência" };

const TOM_OBRA: Record<string, TomStatus> = {
  planejada: "neutro",
  em_andamento: "andamento",
  atrasada: "negativo",
  concluida: "positivo",
  paralisada: "atencao",
};

const LABEL_OBRA: Record<string, string> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  atrasada: "Atrasada",
  concluida: "Concluída",
  paralisada: "Paralisada",
};

// A data sai de lib/horario.ts, no fuso do estado do município. Este portal
// é o que o cidadão abre: mostrar "última atualização" no fuso do servidor
// (UTC) faria a página parecer atualizada um dia à frente do que de fato foi.

export default async function PortalTransparencia({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const portal = await buscarPortal(slug);
  if (!portal) notFound();

  // O portal faz parte do Essencial — se a prefeitura não contratou (ou
  // deixou de contratar), o endereço público deixa de responder.
  const planos = planosContratadosDe(portal.planosContratados);
  if (!planos.includes("essencial")) notFound();

  const [snapshot, listaObras, listaLicitacoes, listaPublicacoes] = await Promise.all([
    portal.mostrarFinanceiro
      ? db
          .select()
          .from(dashboardSnapshots)
          .where(eq(dashboardSnapshots.prefeituraId, portal.prefeituraId))
          .orderBy(desc(dashboardSnapshots.atualizadoEm))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    portal.mostrarObras
      ? db
          .select()
          .from(obras)
          .where(eq(obras.prefeituraId, portal.prefeituraId))
          .orderBy(desc(obras.createdAt))
      : Promise.resolve([]),
    portal.mostrarLicitacoes
      ? db
          .select()
          .from(licitacoes)
          .where(eq(licitacoes.prefeituraId, portal.prefeituraId))
          .orderBy(desc(licitacoes.createdAt))
      : Promise.resolve([]),
    db
      .select()
      .from(publicacoes)
      .where(eq(publicacoes.prefeituraId, portal.prefeituraId))
      .orderBy(desc(publicacoes.atualizadoEm)),
  ]);

  return (
    <div className="min-h-screen bg-background">
      {/* CABEÇALHO */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-dark">
            Portal da Transparência
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold mt-2">{portal.nome}</h1>
          <p className="text-muted text-sm mt-1.5">
            {portal.municipio} / {portal.estado}
            {portal.prefeito ? ` · Prefeito(a): ${portal.prefeito}` : ""}
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-10 space-y-12">
        {/* FINANCEIRO */}
        {portal.mostrarFinanceiro && (
          <section>
            <h2 className="font-serif text-2xl font-bold mb-1">Execução orçamentária</h2>
            <p className="text-sm text-muted mb-5">
              {snapshot
                ? `Última atualização: ${dataNumerica(snapshot.atualizadoEm, fusoDoEstado(portal.estado))}`
                : "Nenhum dado publicado ainda."}
            </p>

            {snapshot ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Receita", valor: snapshot.receita, tom: "var(--info)" },
                  { label: "Despesas", valor: snapshot.despesas, tom: "var(--urgente)" },
                  { label: "Saldo", valor: snapshot.saldo, tom: "var(--brand)" },
                ].map((c) => (
                  <div key={c.label} className="arco-card bg-card border border-border p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      {c.label}
                    </p>
                    <p
                      className="font-serif text-2xl font-bold mt-1.5 tabular-nums"
                      style={{ color: c.tom }}
                    >
                      {c.valor !== null ? formatarMoeda(c.valor) : "—"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-border arco-card p-8 text-center">
                <IconVisaoGeral className="w-6 h-6 mx-auto text-muted mb-2" />
                <p className="text-sm text-muted">
                  A prefeitura ainda não publicou dados financeiros neste portal.
                </p>
              </div>
            )}
          </section>
        )}

        {/* OBRAS */}
        {portal.mostrarObras && (
          <section>
            <h2 className="font-serif text-2xl font-bold mb-1">Obras públicas</h2>
            <p className="text-sm text-muted mb-5">
              {listaObras.length} obra(s) publicada(s).
            </p>

            {listaObras.length === 0 ? (
              <div className="border border-dashed border-border arco-card p-8 text-center">
                <IconObras className="w-6 h-6 mx-auto text-muted mb-2" />
                <p className="text-sm text-muted">Nenhuma obra publicada ainda.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {listaObras.map((o) => (
                  <div key={o.id} className="arco-card-sm bg-card border border-border p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-sm break-words">{o.nome}</p>
                        {o.bairro && <p className="text-xs text-muted">{o.bairro}</p>}
                      </div>
                      <PilulaStatus
                        label={LABEL_OBRA[o.status] ?? o.status}
                        tom={TOM_OBRA[o.status] ?? "neutro"}
                        className="self-start shrink-0"
                      />
                    </div>
                    <div className="w-full h-2 bg-black/5 rounded-full overflow-hidden mt-3">
                      <div
                        className="h-full bg-brand rounded-full"
                        style={{ width: `${o.progressoAtual}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 mt-1.5 text-xs text-muted">
                      <span>{o.progressoAtual}% concluído</span>
                      {o.valorContrato !== null && (
                        <span>Valor do contrato: {formatarMoeda(o.valorContrato)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* LICITAÇÕES */}
        {portal.mostrarLicitacoes && (
          <section>
            <h2 className="font-serif text-2xl font-bold mb-1">Licitações</h2>
            <p className="text-sm text-muted mb-5">
              {listaLicitacoes.length} processo(s) publicado(s).
            </p>

            {listaLicitacoes.length === 0 ? (
              <div className="border border-dashed border-border arco-card p-8 text-center">
                <IconLicitacoes className="w-6 h-6 mx-auto text-muted mb-2" />
                <p className="text-sm text-muted">Nenhum processo publicado ainda.</p>
              </div>
            ) : (
              <div className="divide-y divide-border border-t border-border">
                {listaLicitacoes.map((l) => (
                  <div key={l.id} className="py-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium break-words">
                        {l.numero} — {l.objeto}
                      </p>
                      <p className="text-xs text-muted">
                        {l.modalidade || "Modalidade não informada"}
                        {l.valorEstimado !== null && ` · ${formatarMoeda(l.valorEstimado)}`}
                      </p>
                    </div>
                    <span className="text-xs text-muted shrink-0">{l.status}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* OUVIDORIA / PROTOCOLO */}
        <SecoesPublicadas publicacoes={listaPublicacoes} />

        <section id="atendimento" className="scroll-mt-8">
          <h2 className="font-serif text-2xl font-bold mb-1">Fale com a prefeitura</h2>
          <p className="text-sm text-muted mb-5 max-w-2xl leading-relaxed">
            Abra uma solicitação de serviço, registre uma reclamação, denúncia,
            sugestão ou elogio. Você recebe um número de protocolo para
            acompanhar a resposta.
          </p>
          <FormularioCidadao slug={slug} whatsappNumero={portal.whatsappNumero} />
        </section>
      </main>

      <footer className="border-t border-border mt-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            Dados publicados pela {portal.nome} · Lei de Acesso à Informação (12.527/2011)
          </p>
          <Link href="/" className="text-xs font-semibold text-brand hover:underline">
            Feito com CidadeIA
          </Link>
        </div>
      </footer>
    </div>
  );
}
