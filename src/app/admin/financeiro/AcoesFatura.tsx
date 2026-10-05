"use client";

import { useState, useTransition } from "react";
import { cancelarFatura, confirmarPagamentoAction, gerarCobrancasAgora } from "../pedidos/actions";

type Msg = { tipo: "erro" | "aviso"; texto: string } | null;

function useAcao() {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const rodar = (fn: () => Promise<{ ok: boolean; erro?: string; aviso?: string }>) => {
    setMsg(null);
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) setMsg({ tipo: "erro", texto: r.erro ?? "Não foi possível." });
      else if (r.aviso) setMsg({ tipo: "aviso", texto: r.aviso });
    });
  };
  return { pendente, msg, rodar };
}

function Mensagem({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p className="text-xs leading-relaxed" style={{ color: msg.tipo === "erro" ? "var(--urgente)" : "var(--info)" }}>
      {msg.texto}
    </p>
  );
}

const campo = "w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand";

/**
 * Confirmar o pagamento é o ato que liga os módulos (na primeira fatura) e
 * destrava a conta (nas seguintes). Pede a data e a forma, que ficam na
 * linha do tempo do pedido e servem de conferência com o extrato.
 */
export function AcoesFatura({ faturaId, hoje, primeira }: { faturaId: string; hoje: string; primeira: boolean }) {
  const { pendente, msg, rodar } = useAcao();
  const [modo, setModo] = useState<"nada" | "pagar" | "cancelar">("nada");

  if (modo === "pagar") {
    return (
      <form
        className="flex flex-col gap-2 w-full sm:w-[280px]"
        action={(fd) => rodar(() => confirmarPagamentoAction(faturaId, fd))}
      >
        <input name="pagaEm" type="date" defaultValue={hoje} className={campo} />
        <select name="forma" className={campo} defaultValue="Ordem bancária">
          <option>Ordem bancária</option>
          <option>Transferência</option>
          <option>PIX</option>
          <option>Boleto</option>
        </select>
        <input name="notaFiscal" placeholder="Nº da nota fiscal (opcional)" className={campo} />
        {primeira && (
          <p className="text-xs text-muted leading-relaxed">
            Primeiro pagamento deste contrato: confirmar liga os módulos na conta do cliente.
          </p>
        )}
        <div className="flex gap-2">
          <button
            disabled={pendente}
            className="text-sm font-semibold bg-brand hover:bg-brand-dark text-white rounded-full px-4 py-2 transition disabled:opacity-50"
          >
            {pendente ? "Confirmando…" : primeira ? "Confirmar e ativar" : "Confirmar pagamento"}
          </button>
          <button type="button" onClick={() => setModo("nada")} className="text-xs text-muted">
            Voltar
          </button>
        </div>
        <Mensagem msg={msg} />
      </form>
    );
  }

  if (modo === "cancelar") {
    return (
      <form
        className="flex flex-col gap-2 w-full sm:w-[280px]"
        action={(fd) => rodar(() => cancelarFatura(faturaId, String(fd.get("motivo") ?? "")))}
      >
        <input name="motivo" placeholder="Motivo do cancelamento" className={campo} autoFocus />
        <div className="flex gap-2">
          <button disabled={pendente} className="text-xs font-medium rounded-full border border-border px-3 py-1.5 hover:border-brand">
            Cancelar fatura
          </button>
          <button type="button" onClick={() => setModo("nada")} className="text-xs text-muted">
            Voltar
          </button>
        </div>
        <Mensagem msg={msg} />
      </form>
    );
  }

  return (
    <div className="flex flex-col items-start sm:items-end gap-2">
      <button
        onClick={() => setModo("pagar")}
        className="text-sm font-semibold bg-brand hover:bg-brand-dark text-white rounded-full px-4 py-2 transition"
      >
        Confirmar pagamento
      </button>
      <button onClick={() => setModo("cancelar")} className="text-xs text-muted hover:text-foreground">
        Cancelar fatura
      </button>
      <Mensagem msg={msg} />
    </div>
  );
}

export function BotaoGerarCobrancas() {
  const { pendente, msg, rodar } = useAcao();
  return (
    <div className="flex flex-col items-start sm:items-end gap-2">
      <button
        disabled={pendente}
        onClick={() => rodar(() => gerarCobrancasAgora())}
        className="text-sm font-medium rounded-full border border-border px-4 py-2 hover:border-brand transition disabled:opacity-50"
      >
        {pendente ? "Rodando…" : "Rodar a cobrança agora"}
      </button>
      <Mensagem msg={msg} />
    </div>
  );
}
