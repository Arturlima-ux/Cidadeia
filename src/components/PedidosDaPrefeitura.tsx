import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pedidosProposta } from "@/db/schema";
import { NOME_PLANO_ADDON } from "@/lib/planos";
import { modulosDoPedido, STATUS_PEDIDO, type StatusPedido } from "@/lib/pedidos";

// ── A PROPOSTA, VISTA DE DENTRO DA CONTA ──
// O pedido feito no site (ou daqui) aparece na conta com o status real:
// recebido, proposta enviada, contratado. Quem avança é a equipe; o cliente
// vê o que está acontecendo sem precisar perguntar.

const COR: Record<StatusPedido, { cor: string; fundo: string; borda: string }> = {
  recebido: { cor: "var(--medio)", fundo: "var(--medio-tint)", borda: "var(--medio-borda)" },
  proposta_enviada: { cor: "var(--info)", fundo: "var(--info-tint)", borda: "var(--info-borda)" },
  contratado: { cor: "var(--accent)", fundo: "var(--accent-tint)", borda: "var(--info-borda)" },
};

export default async function PedidosDaPrefeitura({ prefeituraId }: { prefeituraId: string }) {
  let pedidos: (typeof pedidosProposta.$inferSelect)[] = [];
  try {
    pedidos = await db
      .select()
      .from(pedidosProposta)
      .where(eq(pedidosProposta.prefeituraId, prefeituraId))
      .orderBy(desc(pedidosProposta.createdAt))
      .limit(5);
  } catch (e) {
    console.error("[pedidos] não foi possível listar:", e);
    return null;
  }
  if (pedidos.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-serif text-lg font-bold">Sua proposta</h2>
      {pedidos.map((p) => {
        const status = p.status as StatusPedido;
        const cor = COR[status] ?? COR.recebido;
        const modulos = modulosDoPedido(p.modulos).map((m) => NOME_PLANO_ADDON[m]);
        return (
          <div key={p.id} className="rounded-2xl border border-border p-5 bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">
                <span className="font-semibold">{modulos.join(" + ") || "sem módulos marcados"}</span>
                <span className="text-muted"> · protocolo </span>
                <span className="font-mono text-xs">{p.id.slice(-8).toUpperCase()}</span>
              </p>
              <span
                className="text-[11px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border"
                style={{ color: cor.cor, background: cor.fundo, borderColor: cor.borda }}
              >
                {STATUS_PEDIDO[status]?.rotulo ?? status}
              </span>
            </div>
            <p className="text-sm text-muted mt-2 leading-relaxed">{STATUS_PEDIDO[status]?.paraOCliente}</p>
            {status !== "contratado" && (
              <Link href="/kit" className="inline-block mt-2 text-sm font-semibold text-brand hover:underline">
                Kit de contratação (termo de referência, minuta, dispensa) →
              </Link>
            )}
          </div>
        );
      })}
    </section>
  );
}
