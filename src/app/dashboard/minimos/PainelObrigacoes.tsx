"use client";

import { useState, useTransition } from "react";
import { conferirObrigacoes, type ResultadoObrigacoes } from "./obrigacoes-actions";
import {
  NOME_SITUACAO_OBRIGACAO,
  type ObrigacaoAvaliada,
  type SituacaoObrigacao,
} from "@/lib/obrigacoes-fiscais";

const TOM: Record<SituacaoObrigacao, { cor: string; fundo: string; borda: string }> = {
  vencida: { cor: "var(--urgente)", fundo: "var(--urgente-tint)", borda: "var(--urgente-borda)" },
  vence_breve: { cor: "var(--medio)", fundo: "var(--medio-tint)", borda: "var(--medio-borda)" },
  entregue: { cor: "var(--info)", fundo: "var(--info-tint)", borda: "var(--info-borda)" },
  a_vencer: { cor: "var(--muted)", fundo: "var(--card)", borda: "var(--border)" },
  futura: { cor: "var(--muted)", fundo: "var(--card)", borda: "var(--border)" },
};

function dataBr(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Conferência sob demanda, nunca ao abrir a tela.
 *
 * São seis consultas ao SICONFI, uma por bimestre encerrado, contra uma API
 * pública e gratuita. Disparar isso a cada visita seria abusar de
 * infraestrutura que o Tesouro mantém para todo mundo.
 */
export default function PainelObrigacoes({ podeSemestral }: { podeSemestral: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [semestral, setSemestral] = useState(false);
  const [resultado, setResultado] = useState<ResultadoObrigacoes | null>(null);

  function conferir() {
    iniciar(async () => setResultado(await conferirObrigacoes(semestral)));
  }

  const pendentes = resultado?.ok
    ? resultado.avaliadas.filter((a) => a.situacao === "vencida" || a.situacao === "vence_breve")
    : [];

  return (
    <section className="bg-card border border-border arco-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-lg font-bold">Obrigações fiscais do exercício</h2>
          <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-xl">
            Relatório bimestral ao Tesouro, gestão fiscal, saúde e educação —
            dezesseis entregas por ano. Atraso no SIOPS e no SIOPE gera pendência
            no CAUC e <strong className="text-foreground">trava convênio com a União</strong>.
          </p>
        </div>
        <button
          type="button"
          onClick={conferir}
          disabled={pendente}
          className="shrink-0 bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-lg px-5 py-2.5 transition disabled:opacity-50"
        >
          {pendente ? "Consultando o Tesouro…" : "Conferir agora"}
        </button>
      </div>

      {podeSemestral && (
        <label className="flex items-start gap-2.5 mt-4 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={semestral}
            onChange={(e) => setSemestral(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-muted leading-relaxed">
            O município optou por publicar o Relatório de Gestão Fiscal{" "}
            <strong className="text-foreground">semestralmente</strong> — faculdade do art. 63, I,
            &ldquo;b&rdquo; da LRF para municípios de até 50 mil habitantes. Sem marcar, o
            calendário cobra as três entregas quadrimestrais da regra geral.
          </span>
        </label>
      )}

      {resultado && !resultado.ok && (
        <p
          className="text-sm rounded-lg px-4 py-3 mt-5"
          style={{ background: "var(--urgente-tint)", color: "var(--urgente)" }}
        >
          {resultado.erro}
        </p>
      )}

      {resultado?.ok && (
        <div className="mt-5">
          <div className="flex flex-wrap gap-x-8 gap-y-2 pb-4 border-b border-border">
            <Contador n={resultado.vencidas} rotulo="em atraso" cor="var(--urgente)" />
            <Contador n={resultado.vencendo} rotulo="vencendo" cor="var(--medio)" />
            <Contador n={resultado.entregues} rotulo="confirmadas no Tesouro" cor="var(--info)" />
          </div>

          {pendentes.length === 0 && (
            <p className="text-sm text-muted mt-4">
              Nenhuma entrega em atraso ou perto de vencer no exercício de {resultado.exercicio}.
            </p>
          )}

          {pendentes.length > 0 && (
            <ul className="flex flex-col gap-2.5 mt-4">
              {pendentes.map((o) => (
                <Linha key={`${o.obrigacao.chave}:${o.numero}`} o={o} />
              ))}
            </ul>
          )}

          {resultado.inconclusivos.length > 0 && (
            <p
              className="text-xs rounded-lg px-4 py-3 mt-4 leading-relaxed"
              style={{ background: "var(--medio-tint)", color: "var(--medio)" }}
            >
              {resultado.inconclusivos.length}{" "}
              {resultado.inconclusivos.length === 1 ? "período não pôde" : "períodos não puderam"} ser
              consultado no Tesouro agora. Aparecem pela data, não como atraso confirmado — não
              vamos acusar de falha o que não conseguimos verificar.
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-muted mt-5 pt-4 border-t border-border leading-relaxed">
        A entrega do RREO é confirmada consultando o Tesouro, e o alerta some
        sozinho quando a publicação aparece lá. Gestão fiscal, SIOPS e SIOPE não
        têm consulta pública equivalente: entram como lembrete de data, e não
        afirmamos entrega que não verificamos.
      </p>
    </section>
  );
}

function Contador({ n, rotulo, cor }: { n: number; rotulo: string; cor: string }) {
  return (
    <div>
      <p className="font-serif text-2xl font-extrabold tabular-nums leading-none" style={{ color: cor }}>
        {n}
      </p>
      <p className="text-[11px] uppercase tracking-wide text-muted mt-1">{rotulo}</p>
    </div>
  );
}

function Linha({ o }: { o: ObrigacaoAvaliada }) {
  const tom = TOM[o.situacao];
  const atraso = Math.abs(o.diasRestantes);

  return (
    <li
      className="border rounded-lg px-4 py-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5"
      style={{ borderColor: tom.borda, background: tom.fundo }}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold">
          {o.obrigacao.sigla}
          <span className="font-normal text-muted"> · {o.rotulo}</span>
        </p>
        <p className="text-xs text-muted mt-0.5">{o.obrigacao.sistema}</p>
        <p className="text-xs text-muted mt-1.5 leading-relaxed max-w-md">
          {o.obrigacao.consequencia}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold" style={{ color: tom.cor }}>
          {o.situacao === "vencida"
            ? `Em atraso há ${atraso} ${atraso === 1 ? "dia" : "dias"}`
            : `Vence em ${o.diasRestantes} ${o.diasRestantes === 1 ? "dia" : "dias"}`}
        </p>
        <p className="text-[11px] text-muted mt-0.5 tabular-nums">
          prazo: {dataBr(o.vencimento)}
        </p>
        <p className="text-[11px] uppercase tracking-wide text-muted mt-0.5">
          {NOME_SITUACAO_OBRIGACAO[o.situacao]}
        </p>
      </div>
    </li>
  );
}
