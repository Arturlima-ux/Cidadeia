import Link from "next/link";
import { connection } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { atendimentos, licitacoes, obras } from "@/db/schema";
import { buscarPortal } from "@/app/transparencia/actions";
import { resumirVoz } from "@/lib/voz-da-cidade";
import { OBRA } from "@/app/transparencia/PortalCidade";

// ── O PORTAL DA CIDADE, AO VIVO, NA PÁGINA DO MORADOR ──
//
// Quando a cidade já tem o portal do CidadeIA, a página do morador não manda
// só um link: mostra o que está acontecendo lá agora (os pedidos e as
// respostas, as obras, as compras abertas) e leva direto ao formulário.
// Os mesmos dados e as mesmas regras do portal (/transparencia/[slug]): a voz
// da cidade só aparece a partir de 5 manifestações, e nunca com texto de
// ninguém (lib/voz-da-cidade.ts).

export default async function CarregaPortalDaCidade({ slug, cidade }: { slug: string; cidade: string }) {
  await connection();
  const portal = await buscarPortal(slug).catch(() => null);
  if (!portal) return <LinkSimples slug={slug} cidade={cidade} />;

  const [manifestacoes, listaObras, comprasAbertas] = await Promise.all([
    db
      .select({
        tipo: atendimentos.tipo,
        status: atendimentos.status,
        secretaria: atendimentos.secretaria,
        createdAt: atendimentos.createdAt,
        respondidoEm: atendimentos.respondidoEm,
      })
      .from(atendimentos)
      .where(eq(atendimentos.prefeituraId, portal.prefeituraId))
      .orderBy(desc(atendimentos.createdAt))
      .limit(2000),
    portal.mostrarObras
      ? db
          .select({ id: obras.id, nome: obras.nome, status: obras.status, progresso: obras.progressoAtual })
          .from(obras)
          .where(eq(obras.prefeituraId, portal.prefeituraId))
          .orderBy(desc(obras.atualizadoEm))
          .limit(40)
      : Promise.resolve([]),
    portal.mostrarLicitacoes
      ? db
          .select({ id: licitacoes.id })
          .from(licitacoes)
          .where(and(eq(licitacoes.prefeituraId, portal.prefeituraId), inArray(licitacoes.status, ["publicada", "em_disputa"])))
      : Promise.resolve([]),
  ]).catch(() => [[], [], []] as const);

  const voz = resumirVoz([...manifestacoes]);
  const emAndamento = listaObras.filter((o) => o.status === "em_andamento" || o.status === "atrasada" || o.status === "paralisada");
  const prontas = listaObras.filter((o) => o.status === "concluida").length;

  const numeros = [
    voz.publica ? { n: String(voz.total), r: "pedidos e mensagens no último ano" } : null,
    voz.publica ? { n: `${voz.percentualRespondido}%`, r: "já respondidos" } : null,
    voz.publica && voz.diasMedioResposta !== null
      ? { n: voz.diasMedioResposta.toLocaleString("pt-BR", { maximumFractionDigits: 1 }), r: "dias, em média, para responder" }
      : null,
    portal.mostrarObras ? { n: String(emAndamento.length), r: emAndamento.length === 1 ? "obra em andamento" : "obras em andamento" } : null,
    portal.mostrarObras && prontas ? { n: String(prontas), r: prontas === 1 ? "obra pronta" : "obras prontas" } : null,
    portal.mostrarLicitacoes
      ? { n: String(comprasAbertas.length), r: comprasAbertas.length === 1 ? "compra aberta a propostas" : "compras abertas a propostas" }
      : null,
  ].filter((x): x is { n: string; r: string } => x !== null);

  return (
    <div
      className="mt-6 rounded-[28px] border p-6 sm:p-9"
      style={{
        borderColor: "color-mix(in oklab, var(--brand) 45%, var(--border))",
        background: "radial-gradient(70% 90% at 100% 0%, color-mix(in oklab, var(--brand) 18%, transparent), transparent 70%), var(--card)",
      }}
    >
      <p className="text-sm font-medium flex items-center gap-2" style={{ color: "var(--brand-claro)" }}>
        <span className="w-2 h-2 rounded-full portal-pulso" style={{ background: "var(--brand)" }} />
        {cidade} tem portal, e ele está no ar
      </p>

      {numeros.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
          {numeros.map((x) => (
            <div key={x.r} className="rounded-2xl p-4" style={{ background: "var(--sutil)" }}>
              <p className="text-3xl font-semibold tracking-[-0.04em] tabular-nums">{x.n}</p>
              <p className="text-sm text-muted mt-1 leading-snug">{x.r}</p>
            </div>
          ))}
        </div>
      )}
      {!voz.publica && (
        <p className="text-sm text-muted mt-4">
          A contagem dos pedidos aparece a partir de 5, para ninguém ser identificado.
        </p>
      )}

      {emAndamento.length > 0 && (
        <ul className="mt-6 space-y-2">
          {emAndamento.slice(0, 3).map((o) => {
            const st = OBRA[o.status] ?? OBRA.planejada;
            return (
              <li key={o.id} className="flex items-center justify-between gap-4 rounded-2xl px-4 py-3" style={{ background: "var(--sutil)" }}>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold" style={{ color: st.cor }}>{st.rotulo}</span>
                  <span className="block font-medium truncate">{o.nome}</span>
                </span>
                <span className="text-sm tabular-nums text-muted shrink-0">
                  {o.progresso === null ? "sem medição" : `${Math.round(o.progresso)}%`}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-3 mt-7">
        <Link
          href={`/transparencia/${slug}#atendimento`}
          className="rounded-full px-7 py-4 font-semibold"
          style={{ background: "var(--brand)", color: "var(--sobre-forte)" }}
        >
          Fazer um pedido à prefeitura
        </Link>
        <Link href={`/transparencia/${slug}`} className="rounded-full border border-border px-6 py-4 font-medium hover:border-brand transition">
          Abrir o portal inteiro →
        </Link>
      </div>
      <p className="text-xs text-muted mt-4">Com número de protocolo para acompanhar a resposta. Dá para denunciar sem se identificar.</p>
    </div>
  );
}

function LinkSimples({ slug, cidade }: { slug: string; cidade: string }) {
  return (
    <div className="mt-6 rounded-[28px] border border-border p-7" style={{ background: "var(--card)" }}>
      <p className="text-xl font-semibold">{cidade} tem portal.</p>
      <Link href={`/transparencia/${slug}`} className="inline-block mt-4 font-semibold hover:underline" style={{ color: "var(--brand-claro)" }}>
        Abrir o portal de {cidade} →
      </Link>
    </div>
  );
}
