import Link from "next/link";
import { gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { eventos } from "@/db/schema";
import { emailDaEquipe } from "@/lib/equipe";
import { notFound } from "next/navigation";
import {
  montarFunil,
  maiorPerda,
  municipiosMaisConsultados,
  municipiosQueConverteram,
  MINIMO_PARA_DIAGNOSTICO,
  type ContagemPorTipo,
  type TipoEvento,
} from "@/lib/analytics";

// ── A PERGUNTA QUE O GOOGLE ANALYTICS RESPONDE MAL ──
//
// Quantas visitas o site teve é fácil de saber e quase não muda decisão
// nenhuma. A pergunta que muda é: dos municípios que alguém consultou,
// quantos viraram pedido de proposta — e quais.
//
// Isso o banco do próprio produto responde com precisão, porque o evento de
// consulta carrega o código IBGE. Ferramenta de terceiro responderia com
// aproximação, e em troca levaria o dado dos visitantes para fora.
//
// ── POR QUE ESTA TELA NÃO TEM GRÁFICO ──
//
// Um funil de cinco etapas é uma lista ordenada com um número em cada linha.
// Desenhar isso como barras empilhadas acrescenta tinta e nenhuma informação,
// e a comparação que importa — quanto se perde de uma etapa para a seguinte —
// já está escrita como percentual.

export const dynamic = "force-dynamic";

export const metadata = { title: "Medição", robots: { index: false, follow: false } };

const PERIODOS = [
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
] as const;

function desde(dias: number): string {
  return new Date(Date.now() - dias * 86_400_000).toISOString();
}

const pct = (v: number) =>
  `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v)}%`;

export default async function MedicaoPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  // 404 e não 403: quem não é da equipe não precisa saber que esta tela existe.
  if (!(await emailDaEquipe())) notFound();

  const pedido = Number((await searchParams).dias);
  const dias = PERIODOS.some((p) => p.dias === pedido) ? pedido : 30;
  const corte = desde(dias);

  let contagens: ContagemPorTipo[] = [];
  let brutos: {
    tipo: TipoEvento;
    municipio: string | null;
    uf: string | null;
    codigoIbge: string | null;
    visitante: string;
  }[] = [];
  let origens: { origem: string | null; visitantes: number }[] = [];

  try {
    const porTipo = await db
      .select({
        tipo: eventos.tipo,
        eventos: sql<number>`count(*)::int`,
        visitantes: sql<number>`count(distinct ${eventos.visitante})::int`,
      })
      .from(eventos)
      .where(gte(eventos.criadoEm, corte))
      .groupBy(eventos.tipo);
    contagens = porTipo as ContagemPorTipo[];

    brutos = await db
      .select({
        tipo: eventos.tipo,
        municipio: eventos.municipio,
        uf: eventos.uf,
        codigoIbge: eventos.codigoIbge,
        visitante: eventos.visitante,
      })
      .from(eventos)
      .where(gte(eventos.criadoEm, corte));

    origens = await db
      .select({
        origem: eventos.origem,
        visitantes: sql<number>`count(distinct ${eventos.visitante})::int`,
      })
      .from(eventos)
      .where(gte(eventos.criadoEm, corte))
      .groupBy(eventos.origem)
      .orderBy(sql`count(distinct ${eventos.visitante}) desc`)
      .limit(8);
  } catch (e) {
    console.error("[medicao] leitura:", e);
  }

  const funil = montarFunil(contagens);
  const perda = maiorPerda(funil);
  const municipios = municipiosMaisConsultados(brutos, 12);
  // O cruzamento: quem consultou e quem pediu, pelo mesmo código IBGE.
  const noFunil = municipiosQueConverteram(brutos).slice(0, 15);
  const converteram = noFunil.filter((m) => m.pediram > 0);
  const base = funil[0]?.visitantes ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/pedidos" className="text-sm font-semibold text-brand link-traco">
            ← Mesa de pedidos
          </Link>
          <h1 className="font-serif text-2xl font-bold mt-2">Medição</h1>
          <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-[62ch]">
            Sem cookie, sem script de terceiro e sem IP guardado. O identificador de visitante é
            um resumo que muda à meia-noite — conta pessoa no dia, e não segue ninguém de um dia
            para o outro.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {PERIODOS.map((p) => (
            <Link
              key={p.dias}
              href={`/admin/medicao?dias=${p.dias}`}
              className="text-sm font-semibold rounded-lg px-3 py-1.5 border transition"
              style={{
                borderColor: p.dias === dias ? "var(--brand)" : "var(--border)",
                color: p.dias === dias ? "var(--brand)" : undefined,
              }}
            >
              {p.rotulo}
            </Link>
          ))}
        </div>
      </div>

      {base === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-8 text-center">
          <p className="text-sm text-muted leading-relaxed max-w-[52ch] mx-auto">
            Nenhum evento registrado neste período. A medição começa a valer depois que a tabela
            existir no banco e alguém abrir o site — e, por ser de primeira parte, não há histórico
            anterior a importar de lugar nenhum.
          </p>
        </div>
      ) : (
        <>
          {/* ── O FUNIL ── */}
          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-semibold text-sm mb-1">Do visitante ao pedido de proposta</h2>
            <p className="text-xs text-muted mb-5">
              O percentual é sobre VISITANTES da etapa anterior, não sobre eventos: quem recarrega
              a página três vezes não é três pessoas.
            </p>

            <ul className="flex flex-col">
              {funil.map((e, i) => (
                <li
                  key={e.chave}
                  className="py-3.5 border-t border-border first:border-t-0 first:pt-0"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="font-medium text-sm">
                      <span className="text-muted tabular-nums mr-2">{i + 1}.</span>
                      {e.rotulo}
                    </span>
                    <span className="flex items-baseline gap-3">
                      <span className="text-lg font-bold tabular-nums">{e.visitantes}</span>
                      {e.conversao !== null && (
                        <span
                          className="text-sm tabular-nums"
                          style={{
                            color:
                              perda && perda.chave === e.chave ? "var(--urgente)" : "var(--muted)",
                          }}
                        >
                          {pct(e.conversao)}
                        </span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{e.significado}</p>
                  {/* A barra é proporção da PRIMEIRA etapa: é ela que dá a
                      sensação de afunilamento sem precisar de gráfico. */}
                  <div className="mt-2 h-1 rounded-full bg-sutil overflow-hidden" aria-hidden="true">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${base === 0 ? 0 : (e.visitantes / base) * 100}%`,
                        background:
                          perda && perda.chave === e.chave ? "var(--urgente)" : "var(--brand)",
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>

            {perda ? (
              <p
                className="text-sm rounded-lg px-4 py-3 mt-5 leading-relaxed"
                style={{ background: "var(--medio-tint)", color: "var(--medio)" }}
              >
                A maior perda está em <strong>{perda.rotulo}</strong>: {pct(perda.conversao!)} de
                quem chegou na etapa anterior. É onde um ajuste rende mais.
              </p>
            ) : (
              <p className="text-xs text-muted mt-5 leading-relaxed">
                Com menos de {MINIMO_PARA_DIAGNOSTICO} visitantes no período, nenhum diagnóstico é
                apontado — percentual sobre base pequena é ruído com cara de conclusão.
              </p>
            )}
          </section>

          {/* ── O CRUZAMENTO ──
              A informação que decide onde investir, e que ferramenta de
              terceiro não daria sem mandar o código do município para fora. */}
          {converteram.length > 0 && (
            <section className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-semibold text-sm mb-1">Municípios que pediram proposta</h2>
              <p className="text-xs text-muted mb-4">
                Cruzamento entre quem consultou o Raio-X e quem enviou o pedido, pelo mesmo código
                IBGE. É a lista mais curta e a mais valiosa.
              </p>
              <ul className="flex flex-col divide-y divide-border">
                {converteram.map((m) => (
                  <li key={m.codigoIbge} className="flex items-center justify-between py-2.5 gap-4">
                    <span className="text-sm">
                      {m.municipio}
                      {m.uf && <span className="text-muted"> · {m.uf}</span>}
                    </span>
                    <span className="text-sm tabular-nums shrink-0">
                      <span style={{ color: "var(--accent)" }}>{m.pediram} pediu</span>
                      {m.consultaram > 0 && (
                        <span className="text-muted"> · {m.consultaram} consultou</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── OS MUNICÍPIOS ── */}
          {municipios.length > 0 && (
            <section className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-semibold text-sm mb-1">Municípios consultados</h2>
              <p className="text-xs text-muted mb-4">
                Quem abriu o Raio-X do próprio município. É a lista de quem já demonstrou
                interesse sem precisar preencher formulário nenhum.
              </p>
              <ul className="flex flex-col divide-y divide-border">
                {municipios.map((m) => (
                  <li key={`${m.uf}-${m.municipio}`} className="flex items-center justify-between py-2">
                    <span className="text-sm">
                      {m.municipio} <span className="text-muted">· {m.uf}</span>
                    </span>
                    <span className="text-sm tabular-nums text-muted">
                      {m.visitantes} {m.visitantes === 1 ? "visitante" : "visitantes"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── DE ONDE VEM ── */}
          {origens.length > 0 && (
            <section className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-semibold text-sm mb-1">De onde chegaram</h2>
              <p className="text-xs text-muted mb-4">
                Só o endereço do site de origem. O caminho completo pode trazer termo de busca e
                identificador de campanha, e não é guardado.
              </p>
              <ul className="flex flex-col divide-y divide-border">
                {origens.map((o) => (
                  <li key={o.origem ?? "direto"} className="flex items-center justify-between py-2">
                    <span className="text-sm">{o.origem ?? "acesso direto"}</span>
                    <span className="text-sm tabular-nums text-muted">{o.visitantes}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <p className="text-xs text-muted leading-relaxed pt-4 border-t border-border">
        Esta medição substitui Google Analytics e Meta Pixel de propósito. O acordo de tratamento
        de dados que o produto entrega ao jurídico da prefeitura declara que o dado não vai para
        terceiros — carregar script de rede de anúncio aqui contradiria o que se vende, e a LGPD
        exigiria consentimento para o cookie. Sem cookie e sem dado pessoal, não há o que
        consentir.
      </p>
    </div>
  );
}
