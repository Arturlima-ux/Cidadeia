"use client";

import { useState } from "react";

function formatarMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function SimuladorFinanceiro({
  receitaAtual,
  despesaAtual,
}: {
  receitaAtual: number | null;
  despesaAtual: number | null;
}) {
  const [variacaoReceita, setVariacaoReceita] = useState(0);
  const [variacaoDespesa, setVariacaoDespesa] = useState(0);

  if (receitaAtual === null || despesaAtual === null) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
          Simulador financeiro
        </p>
        <p className="text-sm text-muted">
          Registre a receita e as despesas atuais na Visão Geral para poder
          simular cenários aqui.
        </p>
      </div>
    );
  }

  const novaReceita = receitaAtual * (1 + variacaoReceita / 100);
  const novaDespesa = despesaAtual * (1 + variacaoDespesa / 100);
  const novoSaldo = novaReceita - novaDespesa;
  const saldoAtual = receitaAtual - despesaAtual;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">
        Simulador financeiro
      </p>
      <p className="text-xs text-muted mb-4 leading-relaxed">
        Isto é uma calculadora simples (multiplicação direta sobre os valores
        atuais) — <strong>não é uma previsão de IA</strong>. Útil para
        perguntas do tipo &quot;se a receita cair 10%, qual seria o novo
        saldo?&quot;.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="flex items-center justify-between text-xs font-medium mb-1.5">
            <span>Variação na receita</span>
            <span className="text-brand font-semibold">
              {variacaoReceita > 0 ? "+" : ""}
              {variacaoReceita}%
            </span>
          </label>
          <input
            type="range"
            min={-50}
            max={50}
            value={variacaoReceita}
            onChange={(e) => setVariacaoReceita(Number(e.target.value))}
            className="w-full accent-brand"
          />
        </div>
        <div>
          <label className="flex items-center justify-between text-xs font-medium mb-1.5">
            <span>Variação nas despesas</span>
            <span className="text-brand font-semibold">
              {variacaoDespesa > 0 ? "+" : ""}
              {variacaoDespesa}%
            </span>
          </label>
          <input
            type="range"
            min={-50}
            max={50}
            value={variacaoDespesa}
            onChange={(e) => setVariacaoDespesa(Number(e.target.value))}
            className="w-full accent-brand"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
        <div className="bg-black/[.03] rounded-lg p-3">
          <p className="text-[11px] text-muted">Nova receita</p>
          <p className="text-sm font-semibold mt-0.5">{formatarMoeda(novaReceita)}</p>
        </div>
        <div className="bg-black/[.03] rounded-lg p-3">
          <p className="text-[11px] text-muted">Nova despesa</p>
          <p className="text-sm font-semibold mt-0.5">{formatarMoeda(novaDespesa)}</p>
        </div>
        <div
          className="rounded-lg p-3"
          style={{ background: novoSaldo >= 0 ? "var(--info-tint)" : "var(--urgente-tint)" }}
        >
          <p className="text-[11px] text-muted">Novo saldo</p>
          <p
            className="text-sm font-semibold mt-0.5"
            style={{ color: novoSaldo >= 0 ? "var(--info)" : "var(--urgente)" }}
          >
            {formatarMoeda(novoSaldo)}
          </p>
        </div>
      </div>
      <p className="text-[11px] text-muted mt-3">
        Saldo atual (sem simulação): {formatarMoeda(saldoAtual)}
      </p>
    </div>
  );
}
