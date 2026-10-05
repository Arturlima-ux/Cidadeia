import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pedidosProposta } from "@/db/schema";
import { NOME_PLANO_ADDON } from "@/lib/planos";
import { modulosDoPedido, pedidoEmAberto, STATUS_PEDIDO, type StatusPedido } from "@/lib/pedidos";
import EtapasPedido from "@/components/EtapasPedido";

// ── A PROPOSTA, VISTA DE DENTRO DA CONTA ──
// O pedido feito no site (ou daqui) aparece na conta com a etapa real, do
// pedido ao pagamento. Quem avança é a equipe; o cliente vê onde está sem
// precisar perguntar.

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
      <h2 className="text-lg font-semibold tracking-[-0.02em]">Sua proposta</h2>
      {pedidos.map((p) => {
        const status = p.status as StatusPedido;
        const modulos = modulosDoPedido(p.modulos).map((m) => NOME_PLANO_ADDON[m]);
        return (
          <div key={p.id} className="rounded-2xl border border-border p-5 bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">
                <span className="font-semibold">{modulos.join(" + ") || "sem módulos marcados"}</span>
                <span className="text-muted"> · protocolo </span>
                <span className="text-xs tabular-nums">{p.id.slice(-8).toUpperCase()}</span>
              </p>
              <span className="text-xs font-medium text-muted">{STATUS_PEDIDO[status]?.rotulo ?? status}</span>
            </div>
            <div className="mt-4">
              <EtapasPedido status={status} />
            </div>
            <p className="text-sm text-muted mt-4 leading-relaxed">{STATUS_PEDIDO[status]?.paraOCliente}</p>
            {status === "contratado" && (
              <Link href="/dashboard/financeiro" className="inline-block mt-2 text-sm font-medium text-brand-claro hover:underline">
                Ver a fatura e como pagar
              </Link>
            )}
            {pedidoEmAberto(status) && status !== "contratado" && (
              <Link href="/kit" className="inline-block mt-2 text-sm font-medium text-brand-claro hover:underline">
                Kit de contratação: termo de referência, minuta e dispensa
              </Link>
            )}
          </div>
        );
      })}
    </section>
  );
}
