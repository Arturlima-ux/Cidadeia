import Link from "next/link";
import { formatarMoeda } from "@/lib/formatadores";
import { CARENCIA_DIAS, dataCurta, rotuloCompetencia, type SituacaoFinanceira } from "@/lib/cobranca";

// ── A CONTA TRAVADA ──
//
// Aparece no lugar de qualquer tela do painel quando uma mensalidade passa da
// carência sem pagamento. Diz o que aconteceu, quanto e desde quando, e o que
// continua aberto: financeiro, exportação e a própria conta. Sem tom de
// cobrança: quem lê costuma ser o prefeito, e o atraso quase sempre é trâmite
// da tesouraria, não má-fé.
export function BloqueioFinanceiro({ situacao }: { situacao: Extract<SituacaoFinanceira, { tipo: "travada" }> }) {
  const f = situacao.fatura;
  return (
    <div className="max-w-2xl py-10">
      <p className="text-sm font-medium" style={{ color: "var(--urgente)" }}>
        Acesso suspenso
      </p>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.04em] leading-[1.05] mt-3">
        A mensalidade de {rotuloCompetencia(f.competencia)} ainda não foi paga.
      </h1>
      <p className="text-muted leading-relaxed mt-5 max-w-[56ch]">
        A fatura de {formatarMoeda(f.valor)} venceu em {dataCurta(f.vencimento)}, há {situacao.diasAtraso} dias. Passada a
        carência de {CARENCIA_DIAS} dias prevista em contrato, o painel fica suspenso até a confirmação do pagamento. Confirmado,
        tudo volta na hora, com os dados intactos.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link
          href="/dashboard/financeiro"
          className="bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full px-6 py-3 transition"
        >
          Ver a fatura e como pagar
        </Link>
        <Link href="/dashboard/dados" className="inicio-sublinhado text-sm text-muted">
          Exportar os dados do município
        </Link>
      </div>
      <p className="text-xs text-muted mt-8 max-w-[56ch] leading-relaxed">
        O portal público do município continua no ar: o cidadão não perde o acesso à transparência nem à ouvidoria por
        causa de uma fatura.
      </p>
    </div>
  );
}

// ── O AVISO ANTES DA TRAVA ──
//
// Uma faixa fina no topo do painel: a vencer em até sete dias, vencida dentro
// da carência, ou aguardando o primeiro pagamento. Em dia, não aparece.
export function FaixaFinanceira({ situacao }: { situacao: SituacaoFinanceira }) {
  let texto: string | null = null;
  let cor = "var(--medio)";
  if (situacao.tipo === "a_vencer") {
    const f = situacao.fatura;
    texto =
      situacao.dias === 0
        ? `A mensalidade de ${rotuloCompetencia(f.competencia)} (${formatarMoeda(f.valor)}) vence hoje.`
        : `A mensalidade de ${rotuloCompetencia(f.competencia)} (${formatarMoeda(f.valor)}) vence em ${situacao.dias} dia(s), em ${dataCurta(f.vencimento)}.`;
    cor = "var(--info)";
  } else if (situacao.tipo === "vencida") {
    const f = situacao.fatura;
    texto = `A mensalidade de ${rotuloCompetencia(f.competencia)} está ${situacao.diasAtraso} dia(s) em atraso. Sem o pagamento, o painel fica suspenso em ${dataCurta(situacao.travaEm)}.`;
    cor = "var(--urgente)";
  } else if (situacao.tipo === "aguardando_primeiro_pagamento") {
    const f = situacao.fatura;
    texto = `Contrato registrado. Os módulos novos ligam assim que o pagamento da primeira fatura (${formatarMoeda(f.valor)}, vencimento ${dataCurta(f.vencimento)}) for confirmado.`;
    cor = "var(--brand-claro)";
  }
  if (!texto) return null;
  return (
    <div className="border-b border-border px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm" style={{ background: "var(--superficie)" }}>
      <p className="flex items-center gap-2.5">
        <span aria-hidden className="w-2 h-2 rounded-full shrink-0" style={{ background: cor }} />
        <span>{texto}</span>
      </p>
      <Link href="/dashboard/financeiro" className="text-brand-claro hover:underline shrink-0">
        Ver a fatura
      </Link>
    </div>
  );
}
