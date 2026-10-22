import Link from "next/link";
import { formatarMoeda } from "@/lib/formatadores";
import { textosDoAviso, type ObraParadaPublica } from "@/lib/obra-parada-publica";

// ── AVISO PÚBLICO DE OBRA PARALISADA, NO PORTAL ──
//
// Entra sozinho (lib/obra-parada-publica.ts): ninguém na prefeitura precisa
// redigir nem publicar. Cada aviso traz o que o art. 115, § 6º, da Lei
// 14.133/2021 pede — motivo, responsável e data de reinício — e, ao lado, o
// quanto foi executado e o quanto já foi pago.

function Comparacao({ o }: { o: ObraParadaPublica }) {
  const linhas = [
    { rotulo: "Executado", valor: o.executado, cor: "var(--brand-claro)" },
    { rotulo: "Pago", valor: o.pagoPct, cor: o.pagamentoAFrente ? "var(--urgente)" : "var(--info)" },
  ].filter((l) => l.valor !== null) as { rotulo: string; valor: number; cor: string }[];
  if (!linhas.length) return null;
  return (
    <div className="mt-4 grid gap-2">
      {linhas.map((l) => (
        <div key={l.rotulo} className="grid grid-cols-[72px_minmax(0,1fr)_44px] items-center gap-3 text-sm">
          <span className="text-muted">{l.rotulo}</span>
          <span className="h-2 rounded-full overflow-hidden" style={{ background: "var(--superficie)" }}>
            <span className="block h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, l.valor))}%`, background: l.cor }} />
          </span>
          <span className="tabular-nums text-right font-medium">{Math.round(l.valor)}%</span>
        </div>
      ))}
      {o.pagamentoAFrente && (
        <p className="text-sm leading-snug mt-1" style={{ color: "var(--urgente)" }}>
          Já se pagou {Math.round(o.pagoPct! - o.executado!)} pontos a mais do que foi construído.
        </p>
      )}
    </div>
  );
}

export default function ObrasParadas({ obras, slug }: { obras: ObraParadaPublica[]; slug: string }) {
  if (!obras.length) return null;
  return (
    <div className="mt-12">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h3 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em]">
          {obras.length} {obras.length === 1 ? "obra parada" : "obras paradas"}
        </h3>
        <p className="text-sm text-muted">Aviso publicado sozinho, como manda o art. 115, § 6º, da Lei 14.133/2021.</p>
      </div>
      <div className="mt-6 grid lg:grid-cols-2 gap-3 sm:gap-4">
        {obras.map((o) => {
          const t = textosDoAviso(o);
          return (
            <article key={o.id} className="rounded-3xl border p-5 sm:p-6" style={{ background: "var(--card)", borderColor: "color-mix(in srgb, var(--medio) 45%, var(--border))" }}>
              <p className="text-xs font-semibold" style={{ color: "var(--medio)" }}>
                {t.situacao} · {t.desde}
              </p>
              <h4 className="text-lg font-semibold tracking-[-0.02em] leading-snug mt-1.5 break-words">{o.nome}</h4>
              <dl className="mt-4 grid gap-2 text-sm">
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
                  <dt className="text-muted">Motivo</dt>
                  <dd className="break-words">{t.motivo}</dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
                  <dt className="text-muted">Responsável</dt>
                  <dd className="break-words">{t.responsavel}</dd>
                </div>
                <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
                  <dt className="text-muted">Reinício</dt>
                  <dd>{t.retomada}</dd>
                </div>
                {(o.valorBase !== null || o.pago !== null) && (
                  <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
                    <dt className="text-muted">Valores</dt>
                    <dd>
                      {[
                        o.valorBase !== null ? `${formatarMoeda(o.valorBase)} ${o.origem === "federal" ? "empenhados" : "no contrato"}` : null,
                        o.pago !== null ? `${formatarMoeda(o.pago)} pagos` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </dd>
                  </div>
                )}
              </dl>
              <Comparacao o={o} />
              <div className="mt-5 flex items-center justify-between gap-3 flex-wrap text-sm">
                <span className="text-muted">Fonte: {o.fonte}</span>
                <Link href={`/transparencia/${slug}/placa/${o.id}`} className="font-semibold hover:underline" style={{ color: "var(--brand-claro)" }}>
                  Placa da obra para imprimir →
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
