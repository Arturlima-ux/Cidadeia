"use client";

import { useState, useTransition } from "react";
import { registrarInvestimento, type ResultadoInvestimento } from "./actions";

const SECRETARIAS = [
  { chave: "saude", label: "Saúde" },
  { chave: "educacao", label: "Educação" },
  { chave: "obras", label: "Obras" },
  { chave: "licitacoes", label: "Licitações" },
];

function competenciaAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function FormularioInvestimento({
  acao,
}: {
  acao: (fd: FormData) => Promise<ResultadoInvestimento>;
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await acao(formData);
      if (r.ok) setAberto(false);
      else setErro(r.erro);
    });
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-xs font-semibold text-brand hover:underline shrink-0"
      >
        + Lançar investimento
      </button>
    );
  }

  return (
    <form
      action={enviar}
      className="bg-card border border-border arco-card p-4 space-y-3 w-full"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Secretaria</label>
          <select
            name="secretaria"
            required
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
          >
            {SECRETARIAS.map((s) => (
              <option key={s.chave} value={s.chave}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Valor (R$)</label>
          <input
            name="valor"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="150000.00"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Competência</label>
          <input
            name="competencia"
            type="month"
            required
            defaultValue={competenciaAtual()}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Descrição (opcional)</label>
          <input
            name="descricao"
            placeholder="ex: compra de medicamentos"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
      </div>

      {erro && (
        <p
          className="text-sm rounded-lg px-3 py-2 border"
          style={{
            color: "var(--urgente)",
            background: "var(--urgente-tint)",
            borderColor: "var(--urgente-borda)",
          }}
        >
          {erro}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-5 py-2 transition disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar lançamento"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-sm text-muted hover:text-foreground transition"
        >
          Cancelar
        </button>
      </div>
      <p className="text-xs text-muted leading-relaxed">
        Lance aqui o <strong>recurso público que a prefeitura aplicou na cidade</strong> —
        custeio, folha, material, programas. Obras e Licitações já somam
        automaticamente o valor dos contratos e dos processos homologados, então
        não precisa repetir esses aqui.
      </p>
    </form>
  );
}
