import { ORDEM_STATUS, STATUS_PEDIDO, type StatusPedido } from "@/lib/pedidos";

// ── AS CINCO ETAPAS, NUMA LINHA ──
//
// Do pedido ao módulo ligado. Usada pelo cliente (na conta e no
// acompanhamento por protocolo) e pela equipe (na mesa de pedidos), para os
// dois lados verem o mesmo caminho com as mesmas palavras.
//
// Aqui a numeração é informação: as etapas acontecem nessa ordem.

export default function EtapasPedido({
  status,
  compacta = false,
}: {
  status: StatusPedido;
  compacta?: boolean;
}) {
  if (status === "perdido") {
    return (
      <p className="text-sm text-muted">
        <span className="font-medium text-foreground">Encerrado.</span> {STATUS_PEDIDO.perdido.paraOCliente}
      </p>
    );
  }

  const atual = ORDEM_STATUS.indexOf(status);

  return (
    <ol className={`grid grid-cols-5 gap-1.5 ${compacta ? "" : "sm:gap-2"}`} aria-label="Etapas do pedido">
      {ORDEM_STATUS.map((s, i) => {
        const feito = i < atual || (i === atual && s === "ativo");
        const aqui = i === atual && s !== "ativo";
        return (
          <li key={s} className="min-w-0" aria-current={aqui ? "step" : undefined}>
            <span
              className="block h-1 rounded-full"
              style={{
                background: feito ? "var(--brand-claro)" : aqui ? "var(--medio)" : "var(--sutil)",
              }}
            />
            {!compacta && (
              <span
                className="block mt-2 text-xs leading-snug truncate"
                style={{ color: feito || aqui ? "var(--foreground)" : "var(--muted)" }}
              >
                {STATUS_PEDIDO[s].rotulo}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
