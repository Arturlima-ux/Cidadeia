"use client";

import { useState, useTransition } from "react";
import { salvarBase } from "./actions";
import { MINIMOS, type AreaMinimo } from "@/lib/minimos-constitucionais";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const classeInput =
  "w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition";

export default function FormularioBase({
  area,
  exercicio,
  baseCalculo,
  aplicado,
  mesReferencia,
  sugestaoAplicado,
  temSiconfi,
}: {
  area: AreaMinimo;
  exercicio: number;
  baseCalculo: number | null;
  aplicado: number | null;
  mesReferencia: number | null;
  /** Soma já lançada em investimentos — vira o valor sugerido. */
  sugestaoAplicado: number;
  temSiconfi: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [valorAplicado, setValorAplicado] = useState(
    aplicado != null ? String(aplicado) : sugestaoAplicado > 0 ? String(sugestaoAplicado) : ""
  );

  const info = MINIMOS[area];
  const mesAtual = new Date().getMonth() + 1;

  function enviar(formData: FormData) {
    setErro(null);
    setSalvo(false);
    iniciar(async () => {
      const r = await salvarBase(formData);
      if (r.ok) setSalvo(true);
      else setErro(r.erro);
    });
  }

  return (
    <form action={enviar} className="flex flex-col gap-4">
      <input type="hidden" name="area" value={area} />
      <input type="hidden" name="exercicio" value={exercicio} />

      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor={`base-${area}`}>
          Base de cálculo acumulada
        </label>
        <input
          id={`base-${area}`}
          name="baseCalculo"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={baseCalculo ?? ""}
          placeholder="0,00"
          className={classeInput}
        />
        <p className="text-xs text-muted mt-1.5 leading-relaxed">
          {info.incideSobre}. É o número que o contador da prefeitura fecha —
          nenhuma API pública o entrega pronto.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor={`aplicado-${area}`}>
          Já aplicado em {info.despesaLegal}
        </label>
        <input
          id={`aplicado-${area}`}
          name="aplicado"
          type="number"
          step="0.01"
          min="0"
          required
          value={valorAplicado}
          onChange={(e) => setValorAplicado(e.target.value)}
          placeholder="0,00"
          className={classeInput}
        />
        {sugestaoAplicado > 0 && (
          <p className="text-xs text-muted mt-1.5 leading-relaxed">
            Lançado no sistema até agora:{" "}
            <button
              type="button"
              onClick={() => setValorAplicado(String(sugestaoAplicado))}
              className="text-brand font-semibold hover:underline"
            >
              {sugestaoAplicado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </button>
            {temSiconfi && " — inclui despesa importada do SICONFI"}. Use se
            estiver atualizado; o RREO publicado costuma estar um bimestre
            atrás do que já foi empenhado.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor={`mes-${area}`}>
          Valores acumulados até
        </label>
        <select
          id={`mes-${area}`}
          name="mesReferencia"
          defaultValue={mesReferencia ?? mesAtual}
          className={classeInput}
        >
          {MESES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m} de {exercicio}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted mt-1.5">
          É o que separa &ldquo;aplicou pouco&rdquo; de &ldquo;ainda é março&rdquo;.
        </p>
      </div>

      {erro && (
        <p
          className="text-sm rounded-lg px-3 py-2"
          style={{ background: "var(--urgente-tint)", color: "var(--urgente)" }}
        >
          {erro}
        </p>
      )}
      {salvo && !erro && (
        <p
          className="text-sm rounded-lg px-3 py-2"
          style={{ background: "var(--info-tint)", color: "var(--info)" }}
        >
          Salvo. O painel acima já reflete o novo valor.
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="self-start bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-lg px-5 py-2.5 transition disabled:opacity-50"
      >
        {pendente ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
