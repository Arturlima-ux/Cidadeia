"use client";

import { useState, useTransition } from "react";
import { importarDoSiconfi, type ResultadoImportacao } from "./actions";

function formatarMoeda(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

const ANO_ATUAL = new Date().getFullYear();
const ANOS = Array.from({ length: 6 }, (_, i) => ANO_ATUAL - i);

export default function ImportarSiconfi({
  acao,
}: {
  acao: (fd: FormData) => Promise<ResultadoImportacao>;
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<ResultadoImportacao & { ok: true } | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar(formData: FormData) {
    setErro(null);
    setSucesso(null);
    startTransition(async () => {
      const r = await acao(formData);
      if (r.ok) setSucesso(r);
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
        ↓ Importar do Tesouro Nacional
      </button>
    );
  }

  return (
    <form action={enviar} className="bg-card border border-border arco-card p-4 space-y-3 w-full">
      <div>
        <p className="font-semibold text-sm">Importar execução orçamentária</p>
        <p className="text-xs text-muted mt-1 leading-relaxed">
          Puxa direto do SICONFI (Tesouro Nacional) o quanto sua prefeitura já
          liquidou em Saúde, Educação e infraestrutura. É o RREO que o próprio
          município envia por obrigação legal — nada é estimado por nós.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Ano</label>
          <select
            name="ano"
            defaultValue={String(ANO_ATUAL - 1)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
          >
            {ANOS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Bimestre</label>
          <select
            name="bimestre"
            defaultValue="6"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
          >
            {[1, 2, 3, 4, 5, 6].map((b) => (
              <option key={b} value={b}>
                {b}º bimestre {b === 6 ? "(ano fechado)" : ""}
              </option>
            ))}
          </select>
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

      {sucesso && (
        <div
          className="text-sm rounded-lg px-3 py-2.5 border"
          style={{
            color: "var(--info)",
            background: "var(--info-tint)",
            borderColor: "var(--info-borda)",
          }}
        >
          <p className="font-semibold">
            {sucesso.importados} área(s) importada(s) — {formatarMoeda(sucesso.total)}
          </p>
          <p className="text-xs mt-0.5 opacity-90">
            {sucesso.instituicao ?? "Município"} · {sucesso.periodo}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-5 py-2 transition disabled:opacity-60"
        >
          {pending ? "Consultando Tesouro..." : "Importar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-sm text-muted hover:text-foreground transition"
        >
          Fechar
        </button>
      </div>

      <p className="text-xs text-muted leading-relaxed border-t border-border pt-2.5">
        Reimportar o mesmo período substitui os valores vindos do Tesouro e
        preserva seus lançamentos manuais. Licitações não é importada: no
        orçamento público não existe &quot;função Licitações&quot; — ela continua vindo
        dos processos que você cadastra.
      </p>
    </form>
  );
}
