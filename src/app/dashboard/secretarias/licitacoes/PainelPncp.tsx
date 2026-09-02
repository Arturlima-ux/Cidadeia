"use client";

import { useState, useTransition } from "react";
import { conferirNoPncp, type ResultadoConferencia } from "./pncp-actions";
import { linkPncp } from "@/lib/pncp";

/**
 * Conferência sob demanda, nunca automática ao abrir a tela.
 *
 * Cada conferência dispara uma chamada por modalidade ao PNCP, que limita
 * requisições com facilidade. Rodar sozinho a cada visita levaria a consulta ao
 * limite e a tela passaria a dizer "não consta" para processo que está lá —
 * o pior erro possível numa tela cujo propósito é justamente apontar ausência.
 */
export default function PainelPncp({ ano }: { ano: number }) {
  const [pendente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoConferencia | null>(null);

  function conferir() {
    iniciar(async () => setResultado(await conferirNoPncp(ano)));
  }

  const ausentes = resultado?.ok ? resultado.conferencias.filter((c) => !c.publicada) : [];

  return (
    <section className="bg-card border border-border arco-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-lg font-bold">Conferência no PNCP</h2>
          <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-xl">
            A divulgação no Portal Nacional de Contratações Públicas é{" "}
            <strong className="text-foreground">condição de eficácia do contrato</strong> —
            processo não publicado não produz efeito. Aqui você vê quais dos
            seus processos de {ano} constam lá.
          </p>
        </div>
        <button
          type="button"
          onClick={conferir}
          disabled={pendente}
          className="shrink-0 bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-lg px-5 py-2.5 transition disabled:opacity-50"
        >
          {pendente ? "Consultando…" : "Conferir agora"}
        </button>
      </div>

      {resultado && !resultado.ok && (
        <p
          className="text-sm rounded-lg px-4 py-3 mt-5 leading-relaxed"
          style={{
            background: resultado.limiteExcedido ? "var(--medio-tint)" : "var(--urgente-tint)",
            color: resultado.limiteExcedido ? "var(--medio)" : "var(--urgente)",
          }}
        >
          {resultado.erro}
        </p>
      )}

      {resultado?.ok && (
        <div className="mt-5">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 pb-4 border-b border-border">
            <span className="text-sm">
              <strong className="tabular-nums">{resultado.publicadas}</strong> de{" "}
              <strong className="tabular-nums">{resultado.total}</strong> processos constam no PNCP
            </span>
            {ausentes.length > 0 && (
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--urgente)" }}
              >
                {ausentes.length} sem publicação
              </span>
            )}
          </div>

          {resultado.total === 0 && (
            <p className="text-sm text-muted mt-4 leading-relaxed">
              Nenhum processo publicado ou em disputa foi cadastrado ainda. Os
              que estão em planejamento não entram na conferência — ainda não
              deveriam estar no PNCP.
            </p>
          )}

          {ausentes.length > 0 && (
            <ul className="mt-4 flex flex-col gap-3">
              {ausentes.map((c) => (
                <li
                  key={c.licitacao.id}
                  className="border rounded-lg px-4 py-3"
                  style={{ borderColor: "var(--urgente-borda)", background: "var(--urgente-tint)" }}
                >
                  <p className="font-semibold text-sm">
                    {c.licitacao.numero}{" "}
                    <span className="font-normal text-muted">— não consta no PNCP</span>
                  </p>
                  <p className="text-sm text-muted mt-1 leading-relaxed">{c.licitacao.objeto}</p>
                </li>
              ))}
            </ul>
          )}

          {resultado.total > 0 && ausentes.length === 0 && (
            <p
              className="text-sm rounded-lg px-4 py-3 mt-4"
              style={{ background: "var(--info-tint)", color: "var(--info)" }}
            >
              Todos os processos conferidos constam no PNCP.
            </p>
          )}

          {resultado.publicadas > 0 && (
            <details className="mt-4">
              <summary className="text-sm font-semibold cursor-pointer text-muted hover:text-foreground transition">
                Ver os {resultado.publicadas} que estão publicados
              </summary>
              <ul className="mt-3 flex flex-col gap-2">
                {resultado.conferencias
                  .filter((c) => c.publicada && c.correspondente)
                  .map((c) => {
                    const link = linkPncp(c.correspondente!);
                    return (
                      <li key={c.licitacao.id} className="text-sm flex flex-wrap gap-x-3 gap-y-1">
                        <span className="font-medium">{c.licitacao.numero}</span>
                        <span className="text-muted">{c.correspondente!.modalidade}</span>
                        {link && (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand font-semibold hover:underline"
                          >
                            abrir no PNCP →
                          </a>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </details>
          )}
        </div>
      )}

      <p className="text-xs text-muted mt-5 pt-4 border-t border-border leading-relaxed">
        Conferimos, não publicamos: publicar exige credenciamento da plataforma
        junto ao Ministério da Gestão para representar o CNPJ do município.
        Enquanto isso, apontar o que falta já evita o contrato sem eficácia.
      </p>
    </section>
  );
}
