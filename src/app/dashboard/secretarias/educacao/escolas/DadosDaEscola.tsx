"use client";

import { useState, useTransition } from "react";
import { atualizarDadosEscola } from "../rede-actions";
import { DIAS_LETIVOS_LDB } from "@/lib/ocorrencias-escola";

// Os dois números que o Censo não tem e que a escola sabe de cor: quantos
// alunos estão matriculados hoje e quantos dias letivos o calendário
// aprovado prevê. Um vira comparação com o que foi declarado ao Censo — o
// número pelo qual o FUNDEB paga. O outro vira a conta dos 200 dias.

export default function DadosDaEscola({
  escolaId,
  matriculasAtuais,
  diasPrevistos,
  bairro,
}: {
  escolaId: string;
  matriculasAtuais: number | null;
  diasPrevistos: number | null;
  bairro: string | null;
}) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const campo = "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setMsg(null);
        iniciar(async () => {
          const r = await atualizarDadosEscola(fd);
          setMsg(r.ok ? { tipo: "ok", texto: "Salvo." } : { tipo: "erro", texto: r.erro });
        });
      }}
      className="bg-card border border-border rounded-2xl p-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] items-end"
    >
      <input type="hidden" name="escolaId" value={escolaId} />
      <div>
        <label htmlFor="esc-mat" className="block text-xs font-medium mb-1">
          Alunos matriculados hoje
        </label>
        <input
          id="esc-mat"
          name="matriculasAtuais"
          type="number"
          min={0}
          inputMode="numeric"
          defaultValue={matriculasAtuais ?? ""}
          className={campo}
        />
      </div>
      <div>
        <label htmlFor="esc-dias" className="block text-xs font-medium mb-1">
          Dias letivos do calendário
        </label>
        <input
          id="esc-dias"
          name="diasPrevistos"
          type="number"
          min={DIAS_LETIVOS_LDB}
          max={260}
          inputMode="numeric"
          defaultValue={diasPrevistos ?? ""}
          placeholder={String(DIAS_LETIVOS_LDB)}
          className={campo}
        />
      </div>
      <div>
        <label htmlFor="esc-bairro" className="block text-xs font-medium mb-1">
          Bairro / localidade
        </label>
        <input id="esc-bairro" name="bairro" maxLength={120} defaultValue={bairro ?? ""} className={campo} />
      </div>
      <button
        type="submit"
        disabled={pendente}
        className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition disabled:opacity-60 whitespace-nowrap"
      >
        {pendente ? "…" : "Salvar"}
      </button>
      <p className="text-[11px] text-muted sm:col-span-4 leading-relaxed">
        O calendário mínimo da LDB (art. 24) é de {DIAS_LETIVOS_LDB} dias letivos. Se o seu calendário
        aprovado tem mais que isso, informe aqui — é essa folga que diz quantos dias ainda dá para
        perder antes de precisar repor.
      </p>
      {msg && (
        <p role={msg.tipo === "erro" ? "alert" : "status"} className="text-sm sm:col-span-4" style={{ color: msg.tipo === "erro" ? "var(--urgente)" : "var(--accent)" }}>
          {msg.texto}
        </p>
      )}
    </form>
  );
}
