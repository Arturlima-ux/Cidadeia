"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { avancarPedido, marcarPerdido, registrarContrato } from "./actions";
import { PROXIMO_STATUS, STATUS_PEDIDO, type StatusPedido } from "@/lib/pedidos";

// ── O QUE A EQUIPE FAZ EM CADA ETAPA ──
//
// recebido e proposta_enviada: um clique para a próxima etapa.
// em_contratacao: o formulário do contrato (número, empenho, valor, dia de
//   vencimento). Salvar emite a primeira fatura; os módulos continuam
//   desligados até o pagamento dela ser confirmado em Financeiro.
// contratado: aguarda o pagamento, que se confirma em Financeiro.
// Em qualquer etapa antes de ativo: encerrar, com o motivo anotado.

type Msg = { tipo: "erro" | "aviso"; texto: string } | null;

export default function AcoesPedido({
  pedidoId,
  status,
  temConta,
  valorTabela,
}: {
  pedidoId: string;
  status: StatusPedido;
  temConta: boolean;
  valorTabela: number | null;
}) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [encerrando, setEncerrando] = useState(false);
  const proximo = PROXIMO_STATUS[status];

  function rodar(fn: () => Promise<{ ok: boolean; erro?: string; aviso?: string }>) {
    setMsg(null);
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) setMsg({ tipo: "erro", texto: r.erro ?? "Não foi possível." });
      else if (r.aviso) setMsg({ tipo: "aviso", texto: r.aviso });
    });
  }

  const campo =
    "w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand";

  return (
    <div className="flex flex-col gap-3 w-full md:w-[300px]">
      {proximo && (
        <button
          disabled={pendente}
          onClick={() => rodar(() => avancarPedido(pedidoId))}
          className="text-sm font-semibold bg-brand hover:bg-brand-dark text-white rounded-full px-4 py-2.5 transition disabled:opacity-50"
        >
          {pendente ? "Salvando…" : `Marcar: ${STATUS_PEDIDO[proximo].rotulo.toLowerCase()}`}
        </button>
      )}

      {status === "em_contratacao" && (
        <form
          className="rounded-2xl border border-border p-4 flex flex-col gap-2.5"
          action={(fd) => rodar(() => registrarContrato(pedidoId, fd))}
        >
          <p className="text-sm font-semibold">Registrar contrato e empenho</p>
          <input name="numeroContrato" placeholder="Nº do contrato" className={campo} required />
          <input name="numeroEmpenho" placeholder="Nº da nota de empenho" className={campo} required />
          <div className="grid grid-cols-[1fr_92px] gap-2">
            <input
              name="valor"
              placeholder="Valor mensal (R$)"
              defaultValue={valorTabela != null ? valorTabela.toFixed(2).replace(".", ",") : ""}
              className={campo}
              required
            />
            <input name="diaVencimento" type="number" min={1} max={28} defaultValue={10} className={campo} title="Dia de vencimento" />
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Emite a primeira fatura, com vencimento em 5 dias. Os módulos só ligam quando o pagamento for
            confirmado em Financeiro.
          </p>
          <button
            disabled={pendente}
            className="text-sm font-semibold bg-brand hover:bg-brand-dark text-white rounded-full px-4 py-2.5 transition disabled:opacity-50"
          >
            {pendente ? "Salvando…" : "Registrar e emitir a fatura"}
          </button>
        </form>
      )}

      {status === "contratado" && (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "var(--medio-borda)", background: "var(--medio-tint)" }}>
          <p className="font-semibold" style={{ color: "var(--medio)" }}>
            Aguardando o primeiro pagamento
          </p>
          <p className="text-muted mt-1 leading-relaxed">
            {temConta
              ? "Confirmado o pagamento, os módulos ligam na hora."
              : "O cliente ainda não criou a conta: sem ela, o pagamento não tem onde ativar."}
          </p>
          <Link href="/admin/financeiro" className="inline-block mt-2 font-medium text-brand-claro hover:underline">
            Abrir Financeiro
          </Link>
        </div>
      )}

      {status === "ativo" && (
        <p className="text-sm font-semibold" style={{ color: "var(--info)" }}>
          Ativo
        </p>
      )}

      {status !== "ativo" && status !== "perdido" && (
        encerrando ? (
          <form
            className="flex flex-col gap-2"
            action={(fd) => rodar(() => marcarPerdido(pedidoId, String(fd.get("motivo") ?? "")))}
          >
            <input name="motivo" placeholder="Por que não fechou?" className={campo} autoFocus />
            <div className="flex gap-2">
              <button disabled={pendente} className="text-xs font-medium rounded-full border border-border px-3 py-1.5 hover:border-brand">
                Encerrar pedido
              </button>
              <button type="button" onClick={() => setEncerrando(false)} className="text-xs text-muted">
                Voltar
              </button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setEncerrando(true)} className="text-xs text-muted hover:text-foreground self-start md:self-end">
            Encerrar sem contrato
          </button>
        )
      )}

      {msg && (
        <p className="text-xs leading-relaxed" style={{ color: msg.tipo === "erro" ? "var(--urgente)" : "var(--medio)" }}>
          {msg.texto}
        </p>
      )}
    </div>
  );
}
