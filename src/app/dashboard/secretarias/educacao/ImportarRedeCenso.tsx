"use client";

import { useRef, useState, useTransition } from "react";
import { importarRedeDoCenso } from "./rede-actions";

// O upload do arquivo do INEP. Educação não tem CNES — este formulário é o
// equivalente: um arquivo, e a rede inteira entra com código INEP,
// dependência, etapas e matrícula declarada.

export default function ImportarRedeCenso({
  anoSugerido,
  destaque,
}: {
  anoSugerido: number;
  destaque: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [aberto, setAberto] = useState(destaque);
  const form = useRef<HTMLFormElement>(null);
  const campo = "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand";

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-sm font-semibold border border-border rounded-full px-4 py-2 hover:border-brand hover:text-brand transition whitespace-nowrap"
      >
        Reimportar rede
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <form
        ref={form}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setMsg(null);
          iniciar(async () => {
            const r = await importarRedeDoCenso(fd);
            if (r.ok) {
              setMsg({
                tipo: "ok",
                texto: `Rede do Censo ${r.ano} importada: ${r.novas} escola(s) nova(s), ${r.atualizadas} atualizada(s)${r.ignoradas > 0 ? `, ${r.ignoradas} linha(s) de fora do município ou de outra rede ignorada(s)` : ""}. Colunas reconhecidas: ${r.colunasLidas.join(", ")}.`,
              });
              form.current?.reset();
            } else setMsg({ tipo: "erro", texto: r.erro });
          });
        }}
        className="bg-card border border-border rounded-2xl p-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] items-end"
      >
        <div className="sm:col-span-3">
          <label htmlFor="censo-arquivo" className="block text-xs font-medium mb-1">
            Arquivo exportado do INEP (.csv)
          </label>
          <input
            id="censo-arquivo"
            name="arquivo"
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            required
            className="w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-white file:text-sm file:font-semibold"
          />
        </div>
        <div>
          <label htmlFor="censo-ano" className="block text-xs font-medium mb-1">
            Ano do Censo
          </label>
          <input
            id="censo-ano"
            name="ano"
            type="number"
            min={2007}
            max={2100}
            defaultValue={anoSugerido}
            required
            className={campo}
          />
        </div>
        <label className="flex items-center gap-2 text-xs pb-2.5">
          <input type="checkbox" name="todasAsRedes" className="accent-[var(--brand)]" />
          Trazer também escolas estaduais e privadas
        </label>
        <button
          type="submit"
          disabled={pendente}
          className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition disabled:opacity-60 whitespace-nowrap"
        >
          {pendente ? "Lendo o arquivo…" : "Importar rede"}
        </button>
        <p className="text-[11px] text-muted sm:col-span-3 leading-relaxed">
          Aceita a exportação do <strong>Catálogo de Escolas</strong> e os <strong>microdados do Censo
          Escolar</strong>, em UTF-8 ou no encoding do INEP, com “;” ou “,”. Pode ser o arquivo do estado
          inteiro: fica só o que é do seu município. Escola cadastrada à mão não é tocada.
        </p>
      </form>
      {msg && (
        <p
          role={msg.tipo === "erro" ? "alert" : "status"}
          className="text-sm leading-relaxed"
          style={{ color: msg.tipo === "erro" ? "var(--urgente)" : "var(--accent)" }}
        >
          {msg.texto}
        </p>
      )}
    </div>
  );
}
