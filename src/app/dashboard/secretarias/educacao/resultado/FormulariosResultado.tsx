"use client";

import { useRef, useState, useTransition } from "react";
import { lancarResultado, removerResultado, registrarValorAlunoAno } from "../resultado-actions";
import { INDICADORES_RESULTADO, ETAPAS_RESULTADO, indicadorPorChave } from "@/lib/resultado-educacao";

const campo = "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand";

/** O valor aluno/ano do FUNDEB — o denominador que vira dinheiro. */
export function FormularioValorAluno({ ano, valorAtual }: { ano: number; valorAtual: number | null }) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setMsg(null);
        iniciar(async () => {
          const r = await registrarValorAlunoAno(fd);
          setMsg(r.ok ? { tipo: "ok", texto: "Salvo." } : { tipo: "erro", texto: r.erro });
        });
      }}
      className="bg-card border border-border rounded-2xl p-4 grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] items-end"
    >
      <input type="hidden" name="ano" value={ano} />
      <div>
        <label htmlFor="fd-valor" className="block text-xs font-medium mb-1">
          Valor aluno/ano do FUNDEB em {ano} (R$)
        </label>
        <input
          id="fd-valor"
          name="valorAlunoAno"
          type="number"
          min={0.01}
          step="0.01"
          required
          inputMode="decimal"
          defaultValue={valorAtual ?? ""}
          className={campo}
        />
      </div>
      <div>
        <label htmlFor="fd-obs" className="block text-xs font-medium mb-1">
          De onde saiu o número — opcional
        </label>
        <input id="fd-obs" name="observacao" maxLength={300} className={campo} placeholder="VAAF publicado pelo FNDE" />
      </div>
      <button
        type="submit"
        disabled={pendente}
        className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition disabled:opacity-60 whitespace-nowrap"
      >
        {pendente ? "…" : "Salvar"}
      </button>
      <p className="text-[11px] text-muted sm:col-span-3 leading-relaxed">
        O valor muda todo ano e por município — por isso é informado, nunca estimado pelo sistema. É ele
        que transforma a diferença entre a matrícula declarada e a real em reais.
      </p>
      {msg && (
        <p role={msg.tipo === "erro" ? "alert" : "status"} className="text-sm sm:col-span-3" style={{ color: msg.tipo === "erro" ? "var(--urgente)" : "var(--accent)" }}>
          {msg.texto}
        </p>
      )}
    </form>
  );
}

/** IDEB, distorção, aprovação, abandono — por escola ou da rede inteira. */
export function FormularioResultado({
  anos,
  anoSelecionado,
  escolas,
}: {
  anos: number[];
  anoSelecionado: number;
  escolas: { id: string; nome: string }[];
}) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [indicador, setIndicador] = useState<string>("ideb");
  const form = useRef<HTMLFormElement>(null);
  const escolhido = indicadorPorChave(indicador);

  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setMsg(null);
        iniciar(async () => {
          const r = await lancarResultado(fd);
          if (r.ok) {
            setMsg({ tipo: "ok", texto: "Resultado lançado." });
            form.current?.reset();
            setIndicador("ideb");
          } else setMsg({ tipo: "erro", texto: r.erro });
        });
      }}
      className="bg-card border border-border rounded-2xl p-4 grid gap-3 sm:grid-cols-2"
    >
      <div>
        <label htmlFor="rs-ind" className="block text-xs font-medium mb-1">
          Indicador
        </label>
        <select id="rs-ind" name="indicador" required className={campo} value={indicador} onChange={(e) => setIndicador(e.target.value)}>
          {INDICADORES_RESULTADO.map((i) => (
            <option key={i.chave} value={i.chave}>
              {i.nome}
            </option>
          ))}
        </select>
        {escolhido && <p className="text-[11px] text-muted mt-1 leading-snug">{escolhido.explicacao}</p>}
      </div>
      <div>
        <label htmlFor="rs-escola" className="block text-xs font-medium mb-1">
          Escola
        </label>
        <select id="rs-escola" name="escolaId" className={campo} defaultValue="">
          <option value="">Rede inteira (município)</option>
          {escolas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="rs-etapa" className="block text-xs font-medium mb-1">
          Etapa
        </label>
        <select id="rs-etapa" name="etapa" required className={campo} defaultValue="anos_iniciais">
          {ETAPAS_RESULTADO.map((e) => (
            <option key={e.chave} value={e.chave}>
              {e.rotulo}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="rs-ano" className="block text-xs font-medium mb-1">
          Ano
        </label>
        <select id="rs-ano" name="ano" required className={campo} defaultValue={anoSelecionado}>
          {anos.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="rs-valor" className="block text-xs font-medium mb-1">
          Resultado {escolhido?.unidade === "%" ? "(%)" : `(0 a ${escolhido?.maximo ?? 10})`}
        </label>
        <input id="rs-valor" name="valor" type="number" step="0.1" min={0} max={escolhido?.maximo ?? 1000} required inputMode="decimal" className={campo} />
      </div>
      <div>
        <label htmlFor="rs-meta" className="block text-xs font-medium mb-1">
          Meta — opcional
        </label>
        <input id="rs-meta" name="meta" type="number" step="0.1" min={0} max={escolhido?.maximo ?? 1000} inputMode="decimal" className={campo} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="rs-obs" className="block text-xs font-medium mb-1">
          Observação — opcional
        </label>
        <input id="rs-obs" name="observacao" maxLength={300} className={campo} placeholder="ex: escola ficou 3 meses sem professor de matemática" />
      </div>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pendente}
          className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition disabled:opacity-60"
        >
          {pendente ? "Lançando…" : "Lançar resultado"}
        </button>
        <p className="text-xs text-muted">
          Os números saem do painel do INEP; a meta do IDEB é a projetada para a escola. Lançar de novo o
          mesmo indicador no mesmo ano e etapa corrige o valor.
        </p>
      </div>
      {msg && (
        <p role={msg.tipo === "erro" ? "alert" : "status"} className="text-sm sm:col-span-2" style={{ color: msg.tipo === "erro" ? "var(--urgente)" : "var(--accent)" }}>
          {msg.texto}
        </p>
      )}
    </form>
  );
}

export function BotaoRemoverResultado({ id }: { id: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => {
        if (!confirm("Remover este lançamento?")) return;
        iniciar(async () => {
          await removerResultado(id);
        });
      }}
      className="text-xs text-muted hover:text-[color:var(--urgente)] transition"
      aria-label="Remover lançamento"
    >
      ×
    </button>
  );
}
