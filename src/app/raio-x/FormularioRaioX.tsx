"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { consultarRaioX } from "./actions";
import { ESTADOS } from "@/lib/estados";
import { proporcaoDaReceita } from "@/lib/raio-x-calculo";
import type { RaioX, NumeroComFonte } from "@/lib/raio-x";

const classeInput =
  "w-full border border-border rounded-xl px-4 py-3 text-base bg-transparent focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition";

function moeda(v: number | null): string {
  if (v === null) return "não informado";
  if (Math.abs(v) >= 1_000_000) {
    return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  }
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function FormularioRaioX() {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [raioX, setRaioX] = useState<RaioX | null>(null);

  function enviar(formData: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await consultarRaioX(formData);
      if (r.ok) setRaioX(r.raioX);
      else {
        setErro(r.erro);
        setRaioX(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <form action={enviar} className="vidro rounded-2xl p-6 sm:p-7">
        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3">
          <div>
            <label htmlFor="municipio" className="block text-sm font-medium mb-1.5">
              Seu município
            </label>
            <input
              id="municipio"
              name="municipio"
              required
              placeholder="Barro Duro"
              className={classeInput}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="uf" className="block text-sm font-medium mb-1.5">
              Estado
            </label>
            <select id="uf" name="uf" defaultValue="" required className={classeInput}>
              <option value="" disabled>
                UF
              </option>
              {ESTADOS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={pendente}
              className="w-full sm:w-auto bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-7 py-3.5 transition shadow-elevated disabled:opacity-60"
            >
              {pendente ? "Consultando…" : "Ver o raio-X"}
            </button>
          </div>
        </div>

        <p className="text-xs text-muted mt-4 leading-relaxed">
          A consulta vai ao Tesouro Nacional na hora. Leva alguns segundos —
          são várias chamadas, uma por bimestre.
        </p>
      </form>

      {erro && (
        <div
          className="border rounded-2xl px-5 py-4"
          style={{ background: "var(--urgente-tint)", borderColor: "var(--urgente-borda)" }}
        >
          <p className="text-sm" style={{ color: "var(--urgente)" }}>
            {erro}
          </p>
        </div>
      )}

      {raioX && <Resultado raioX={raioX} />}
    </div>
  );
}

function Resultado({ raioX }: { raioX: RaioX }) {
  const semDado = raioX.bimestreReferencia === null;
  const proporcaoSaude = proporcaoDaReceita(raioX.despesaSaude.valor, raioX.receita.valor);
  const proporcaoEducacao = proporcaoDaReceita(raioX.despesaEducacao.valor, raioX.receita.valor);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-4">
        <h2 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight">
          {raioX.municipio} <span className="text-muted font-normal">· {raioX.uf}</span>
        </h2>
        <p className="text-xs font-mono text-muted">
          código IBGE {raioX.codigoIbge} · exercício {raioX.exercicio}
        </p>
      </div>

      {semDado ? (
        <div
          className="border rounded-2xl p-6"
          style={{ background: "var(--medio-tint)", borderColor: "var(--medio-borda)" }}
        >
          <p className="font-semibold" style={{ color: "var(--medio)" }}>
            Nenhum relatório de {raioX.exercicio} publicado no Tesouro
          </p>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            {raioX.rreoEsperados === 0
              ? "Nenhum bimestre do exercício se encerrou ainda — não há o que publicar."
              : `${raioX.rreoEsperados} ${raioX.rreoEsperados === 1 ? "bimestre já se encerrou" : "bimestres já se encerraram"} e nenhum consta publicado. Isso é falha de transparência apontável pelo Tribunal de Contas.`}
          </p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Cartao rotulo="Receita realizada" dado={raioX.receita} formatar={moeda} destaque />
            <Cartao
              rotulo="Aplicado em Saúde"
              dado={raioX.despesaSaude}
              formatar={moeda}
              nota={proporcaoSaude !== null ? `${proporcaoSaude.toFixed(1).replace(".", ",")}% da receita` : null}
            />
            <Cartao
              rotulo="Aplicado em Educação"
              dado={raioX.despesaEducacao}
              formatar={moeda}
              nota={proporcaoEducacao !== null ? `${proporcaoEducacao.toFixed(1).replace(".", ",")}% da receita` : null}
            />
            <Cartao
              rotulo="Urbanismo e infraestrutura"
              dado={raioX.despesaObras}
              formatar={moeda}
            />
          </div>

          <div
            className="border rounded-2xl p-6"
            style={{
              background: raioX.rreoFaltando.length > 0 ? "var(--urgente-tint)" : "var(--accent-tint)",
              borderColor:
                raioX.rreoFaltando.length > 0 ? "var(--urgente-borda)" : "var(--info-borda)",
            }}
          >
            <p
              className="font-semibold"
              style={{
                color: raioX.rreoFaltando.length > 0 ? "var(--urgente)" : "var(--accent-claro)",
              }}
            >
              Relatório bimestral: {raioX.rreoEntregues} de {raioX.rreoEsperados} publicados
            </p>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              {raioX.rreoFaltando.length > 0 ? (
                <>
                  Não constam no Tesouro:{" "}
                  <strong className="text-foreground">
                    {raioX.rreoFaltando.map((b) => `${b}º bimestre`).join(", ")}
                  </strong>
                  . A publicação do RREO é exigida pelos arts. 52 e 53 da Lei de
                  Responsabilidade Fiscal, e a falta impede receber transferência
                  voluntária da União.
                </>
              ) : (
                "Todos os bimestres encerrados constam publicados. É o que o Tribunal de Contas confere primeiro."
              )}
            </p>
          </div>
        </>
      )}

      <div className="border border-border rounded-2xl p-6" style={{ background: "var(--card)" }}>
        <h3 className="font-serif text-lg font-bold">Isto foi o que deu para saber sozinho</h3>
        <p className="text-sm text-muted mt-2 leading-relaxed max-w-[62ch]">
          Nada aqui foi digitado por ninguém: veio do que a própria prefeitura
          publicou no Tesouro Nacional. O que{" "}
          <strong className="text-foreground">não</strong> aparece em base pública
          — obra parada, prazo de ouvidoria vencendo, dispensa fracionada — é
          exatamente o que o sistema acompanha por dentro.
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mt-5">
          <Link
            href="/diagnostico"
            className="bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-6 py-3.5 transition shadow-elevated"
          >
            Fazer o diagnóstico de conformidade&nbsp;&nbsp;→
          </Link>
          <Link
            href="/suporte?assunto=proposta"
            className="text-sm font-semibold text-muted hover:text-foreground transition"
          >
            Receber proposta
          </Link>
        </div>
      </div>

      <p className="text-xs text-muted leading-relaxed">
        Fonte: API pública do SICONFI, Tesouro Nacional, e base de municípios do
        IBGE. Consultado em{" "}
        {new Date(raioX.consultadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}.
        Os percentuais da receita são indício, não cálculo de mínimo
        constitucional — a base legal do mínimo não é a receita total.
      </p>
    </div>
  );
}

function Cartao({
  rotulo,
  dado,
  formatar,
  nota,
  destaque,
}: {
  rotulo: string;
  dado: NumeroComFonte;
  formatar: (v: number | null) => string;
  nota?: string | null;
  destaque?: boolean;
}) {
  return (
    <div
      className="border rounded-2xl p-5 flex flex-col"
      style={{
        background: destaque ? "var(--brand-tint)" : "var(--card)",
        borderColor: destaque ? "var(--brand)" : "var(--border)",
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{rotulo}</p>
      <p className="font-serif text-2xl font-extrabold tracking-tight tabular-nums mt-2">
        {formatar(dado.valor)}
      </p>
      {nota && <p className="text-xs text-muted mt-1">{nota}</p>}
      <p className="text-[11px] text-muted mt-auto pt-3 leading-snug">{dado.detalhe}</p>
    </div>
  );
}
