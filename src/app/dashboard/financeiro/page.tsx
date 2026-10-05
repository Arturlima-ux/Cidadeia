import { redirect } from "next/navigation";
import { lerSessao } from "@/lib/sessao";
import { formatarMoeda } from "@/lib/formatadores";
import { NOME_PLANO_ADDON } from "@/lib/planos";
import { modulosDoPedido, STATUS_PEDIDO, type StatusPedido } from "@/lib/pedidos";
import {
  CARENCIA_DIAS,
  dataCurta,
  diasEntre,
  hojeEmBrasilia,
  rotuloCompetencia,
} from "@/lib/cobranca";
import { faturasDaPrefeitura, instrucoesDePagamento, protocolo, situacaoDaPrefeitura } from "@/lib/cobranca-servidor";
import EtapasPedido from "@/components/EtapasPedido";

export const dynamic = "force-dynamic";

// ── FINANCEIRO, DO LADO DA PREFEITURA ──
//
// Continua aberta com a conta travada (ROTAS_LIVRES_NA_TRAVA): é por aqui
// que quem precisa pagar vê quanto, até quando e como. Mostra cada contrato
// com a etapa em que está, e as faturas, em aberto primeiro.

export default async function FinanceiroPage() {
  const sessao = await lerSessao();
  if (!sessao) redirect("/login");

  const hoje = hojeEmBrasilia();
  const [{ pedidos, linhas }, situacao] = await Promise.all([
    faturasDaPrefeitura(sessao.prefeituraId).catch(() => ({ pedidos: [], linhas: [] })),
    situacaoDaPrefeitura(sessao.prefeituraId, hoje),
  ]);
  const instrucoes = instrucoesDePagamento();
  const abertas = linhas.filter((f) => f.status === "aberta");
  const pagas = linhas.filter((f) => f.status === "paga").reverse();

  const titulo =
    situacao.tipo === "travada"
      ? "Acesso suspenso até o pagamento."
      : situacao.tipo === "vencida"
        ? "Há uma mensalidade em atraso."
        : situacao.tipo === "a_vencer"
          ? "Mensalidade a vencer."
          : situacao.tipo === "aguardando_primeiro_pagamento"
            ? "Aguardando o primeiro pagamento."
            : situacao.tipo === "em_dia"
              ? "Tudo em dia."
              : "Financeiro";

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.04em] leading-[1.05]">{titulo}</h1>
        <p className="text-muted mt-3 max-w-[60ch] leading-relaxed">
          A mensalidade é paga antes do mês de uso, no dia de vencimento do contrato. Atraso além de {CARENCIA_DIAS} dias suspende
          o painel até o pagamento; a exportação dos dados e o portal público do município continuam disponíveis.
        </p>
      </div>

      {pedidos.length === 0 && (
        <p className="text-sm text-muted">
          Nenhum contrato nesta conta ainda. Os módulos são contratados por proposta, em Módulos.
        </p>
      )}

      {abertas.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-[-0.025em]">Em aberto</h2>
          <ul className="border-t border-border">
            {abertas.map((f) => {
              const atraso = diasEntre(f.vencimento, hoje);
              const cor = atraso > CARENCIA_DIAS ? "var(--urgente)" : atraso > 0 ? "var(--medio)" : "var(--muted)";
              return (
                <li key={f.id} className="py-5 border-b border-border flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <p className="text-lg font-medium tracking-[-0.02em]">{rotuloCompetencia(f.competencia)}</p>
                    <p className="text-sm mt-1" style={{ color: cor }}>
                      Vencimento {dataCurta(f.vencimento)}
                      {atraso > 0 ? `, ${atraso} dia(s) em atraso` : atraso === 0 ? ", vence hoje" : ""}
                    </p>
                  </div>
                  <p className="text-2xl font-semibold tabular-nums tracking-[-0.03em]">{formatarMoeda(f.valor)}</p>
                </li>
              );
            })}
          </ul>

          <div className="rounded-[22px] border border-border p-6" style={{ background: "var(--card)" }}>
            <h3 className="font-semibold">Como pagar</h3>
            {instrucoes ? (
              <p className="text-sm text-muted mt-2 leading-relaxed whitespace-pre-line">{instrucoes}</p>
            ) : (
              <p className="text-sm text-muted mt-2 leading-relaxed">
                Os dados de pagamento vão no e-mail de cada fatura.
              </p>
            )}
            <p className="text-sm text-muted mt-3 leading-relaxed">
              Depois de pagar, responda o e-mail da fatura com o comprovante. A confirmação é feita pela nossa equipe ao ver o
              crédito, normalmente no mesmo dia útil.
            </p>
          </div>
        </section>
      )}

      {pedidos.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-[-0.025em]">Contratos</h2>
          <ul className="space-y-3">
            {pedidos.map((p) => {
              const status = p.status as StatusPedido;
              const nomes = modulosDoPedido(p.modulos).map((m) => NOME_PLANO_ADDON[m]);
              return (
                <li key={p.id} className="rounded-[22px] border border-border p-5" style={{ background: "var(--card)" }}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">{nomes.join(" + ") || "Sem módulos"}</p>
                    <p className="text-xs text-muted tabular-nums">Protocolo {protocolo(p.id)}</p>
                  </div>
                  <div className="mt-4">
                    <EtapasPedido status={status} />
                  </div>
                  <p className="text-sm text-muted mt-4 leading-relaxed">{STATUS_PEDIDO[status]?.paraOCliente}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {pagas.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-[-0.025em]">Pagas</h2>
          <ul className="border-t border-border">
            {pagas.map((f) => (
              <li key={f.id} className="py-3 border-b border-border flex flex-wrap justify-between gap-2 text-sm">
                <span>{rotuloCompetencia(f.competencia)}</span>
                <span className="text-muted tabular-nums">
                  {formatarMoeda(f.valor)}, paga em {f.pagaEm ? dataCurta(f.pagaEm) : "?"}
                  {f.notaFiscal ? `, NF ${f.notaFiscal}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
