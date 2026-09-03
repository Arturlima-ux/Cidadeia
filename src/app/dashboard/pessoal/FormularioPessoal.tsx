"use client";

import { useState, useTransition } from "react";
import { salvarPeriodo } from "./actions";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const classeInput =
  "w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition";

export default function FormularioPessoal({
  exercicio,
  mesSugerido,
  rcl,
  despesa,
}: {
  exercicio: number;
  /** Mês proposto no seletor: o fim do último período de apuração fechado. */
  mesSugerido: number;
  rcl: number | null;
  despesa: number | null;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function enviar(formData: FormData) {
    setErro(null);
    setSalvo(false);
    iniciar(async () => {
      const r = await salvarPeriodo(formData);
      if (r.ok) setSalvo(true);
      else setErro(r.erro);
    });
  }

  return (
    <form action={enviar} className="flex flex-col gap-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="pessoal-mes">
          Período de doze meses encerrado em
        </label>
        <div className="flex gap-2">
          <select
            id="pessoal-mes"
            name="mesReferencia"
            defaultValue={mesSugerido}
            className={classeInput}
          >
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <input
            name="exercicio"
            type="number"
            min="2000"
            max="2100"
            required
            defaultValue={exercicio}
            className={`${classeInput} w-28 shrink-0`}
            aria-label="Exercício"
          />
        </div>
        <p className="text-xs text-muted mt-1.5 leading-relaxed">
          Não é o mês da folha: é o fim da janela apurada. A LRF manda somar o
          mês de referência com os onze anteriores, então abril de 2026 significa
          maio de 2025 a abril de 2026.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="pessoal-rcl">
          Receita Corrente Líquida do período
        </label>
        <input
          id="pessoal-rcl"
          name="rcl"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={rcl ?? ""}
          placeholder="0,00"
          className={classeInput}
        />
        <p className="text-xs text-muted mt-1.5 leading-relaxed">
          Receitas correntes dos doze meses, deduzidas a contribuição dos
          servidores ao regime próprio e as receitas de compensação entre
          regimes previdenciários (art. 2º, IV da LRF).
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="pessoal-despesa">
          Despesa total com pessoal do período
        </label>
        <input
          id="pessoal-despesa"
          name="despesa"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={despesa ?? ""}
          placeholder="0,00"
          className={classeInput}
        />
        <p className="text-xs text-muted mt-1.5 leading-relaxed">
          Ativos, inativos e pensionistas, com encargos e contribuições
          previdenciárias — e também os contratos de terceirização que
          substituem servidor, que o art. 18, § 1º manda contabilizar aqui. É a
          linha que mais some das planilhas caseiras.
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
          Salvo. O painel acima já reflete o novo período.
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="self-start bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-lg px-5 py-2.5 transition disabled:opacity-50"
      >
        {pendente ? "Salvando…" : "Salvar período"}
      </button>
    </form>
  );
}
