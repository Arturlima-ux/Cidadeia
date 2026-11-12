import Link from "next/link";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import { carregarFila } from "@/lib/pronto-para-aprovar-servidor";
import { NOME_AREA_PRONTO, plural } from "@/lib/pronto-para-aprovar";
import PilulaStatus from "@/components/PilulaStatus";
import EstadoVazio from "@/components/EstadoVazio";

// ── PRONTO PARA APROVAR ──
// A fila única do trabalho que o CidadeIA já montou em todos os módulos (ver
// lib/pronto-para-aprovar.ts). Pouco texto de propósito: o que importa é o
// que está pronto e o botão que leva até ele.

export const metadata = { title: "Pronto para aprovar" };
export const dynamic = "force-dynamic";

export default async function ProntoPage() {
  const ctx = await contextoDashboard();
  const { fila, placar } = await carregarFila(ctx);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Pronto para aprovar</h1>
        <p className="text-muted text-sm mt-1.5">O sistema já montou. Você confere e aprova.</p>
      </div>

      <dl className="grid grid-cols-3 gap-3">
        {[
          { rotulo: "Esperando você", valor: placar.naFila },
          { rotulo: "Urgentes", valor: placar.urgentes, alerta: placar.urgentes > 0 },
          { rotulo: "Aprovados em 30 dias", valor: placar.aprovados30 },
        ].map((n) => (
          <div key={n.rotulo} className="rounded-2xl border border-border bg-card px-4 py-3">
            <dt className="text-xs text-muted">{n.rotulo}</dt>
            <dd
              className="text-2xl font-semibold tracking-[-0.02em] tabular-nums mt-0.5"
              style={n.alerta ? { color: "var(--urgente)" } : undefined}
            >
              {n.valor.toLocaleString("pt-BR")}
            </dd>
          </div>
        ))}
      </dl>

      {fila.length === 0 ? (
        <EstadoVazio
          titulo="Nada esperando você agora"
          descricao="Quando o sistema montar uma notificação, uma renovação ou um pedido, ele aparece aqui."
        />
      ) : (
        <ol className="rounded-2xl border border-border bg-card divide-y divide-border" aria-label={plural(fila.length, "trabalho pronto", "trabalhos prontos")}>
          {fila.map((i) => (
            <li key={i.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 px-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-muted uppercase tracking-[0.06em]">{NOME_AREA_PRONTO[i.area]}</span>
                  <span className="text-muted" aria-hidden>·</span>
                  <span className="text-muted">{i.trabalho}</span>
                  {i.urgente && <PilulaStatus label="Urgente" tom="negativo" />}
                  {i.mudou && <PilulaStatus label="Mudou" tom="atencao" />}
                </div>
                <p className="font-semibold mt-1 line-clamp-2" title={i.assunto}>
                  {i.assunto}
                </p>
                <p className="text-sm text-muted mt-0.5">{i.motivo}</p>
              </div>
              <Link
                href={i.href}
                className="shrink-0 self-start sm:self-center inline-flex items-center gap-1.5 rounded-full bg-brand hover:bg-brand-dark text-white px-4 py-2 text-sm font-semibold transition"
              >
                {i.acao}
                <span aria-hidden>→</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
