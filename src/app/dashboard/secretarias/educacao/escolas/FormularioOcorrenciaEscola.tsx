"use client";

import { useRef, useState, useTransition } from "react";
import { registrarOcorrenciaEscola, resolverOcorrenciaEscola } from "../rede-actions";
import { TIPOS_OCORRENCIA_ESCOLA, custaAula } from "@/lib/ocorrencias-escola";

// O registro que a direção faz pelo celular, na porta da escola. Poucos
// campos: o que houve, se é urgente, e — quando custou aula — quantos dias
// a turma perdeu, que é o número que a lei cobra no fim do ano.

export default function FormularioOcorrenciaEscola({ escolaId }: { escolaId: string }) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [tipo, setTipo] = useState<string>(TIPOS_OCORRENCIA_ESCOLA[0]!.chave);
  const form = useRef<HTMLFormElement>(null);
  const campo = "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand";
  const escolhido = TIPOS_OCORRENCIA_ESCOLA.find((t) => t.chave === tipo);

  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setMsg(null);
        iniciar(async () => {
          const r = await registrarOcorrenciaEscola(fd);
          if (r.ok) {
            setMsg({ tipo: "ok", texto: "Registrado. A secretaria já vê isso na lista." });
            form.current?.reset();
            setTipo(TIPOS_OCORRENCIA_ESCOLA[0]!.chave);
          } else setMsg({ tipo: "erro", texto: r.erro });
        });
      }}
      className="bg-card border border-border rounded-2xl p-4 grid gap-3 sm:grid-cols-2"
    >
      <input type="hidden" name="escolaId" value={escolaId} />
      <div>
        <label htmlFor="oc-tipo" className="block text-xs font-medium mb-1">
          O que houve
        </label>
        <select id="oc-tipo" name="tipo" required className={campo} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS_OCORRENCIA_ESCOLA.map((t) => (
            <option key={t.chave} value={t.chave}>
              {t.rotulo}
            </option>
          ))}
        </select>
        {escolhido?.exemplo && <p className="text-[11px] text-muted mt-1">{escolhido.exemplo}</p>}
      </div>
      <div>
        <label htmlFor="oc-gravidade" className="block text-xs font-medium mb-1">
          Gravidade
        </label>
        <select id="oc-gravidade" name="gravidade" className={campo} defaultValue="atencao">
          <option value="atencao">Atenção — atrapalha, mas a escola funciona</option>
          <option value="urgente">Urgente — aluno sem aula ou em risco hoje</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="oc-descricao" className="block text-xs font-medium mb-1">
          Em poucas palavras
        </label>
        <input
          id="oc-descricao"
          name="descricao"
          required
          minLength={3}
          maxLength={500}
          className={campo}
          placeholder="Ônibus da rota do Assentamento quebrou; 34 alunos não vieram."
        />
      </div>
      {custaAula(tipo) && (
        <div>
          <label htmlFor="oc-aulas" className="block text-xs font-medium mb-1">
            Dias de aula perdidos
          </label>
          <input id="oc-aulas" name="aulasPerdidas" type="number" min={0} max={200} inputMode="numeric" className={campo} placeholder="1" />
          <p className="text-[11px] text-muted mt-1">
            Entra na conta dos 200 dias letivos que a LDB exige. Se não houve perda de aula, deixe vazio.
          </p>
        </div>
      )}
      <div>
        <label htmlFor="oc-alunos" className="block text-xs font-medium mb-1">
          Alunos afetados — opcional
        </label>
        <input id="oc-alunos" name="alunosAfetados" type="number" min={0} inputMode="numeric" className={campo} placeholder="34" />
      </div>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pendente}
          className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition disabled:opacity-60"
        >
          {pendente ? "Registrando…" : "Registrar"}
        </button>
        {msg && (
          <p role={msg.tipo === "erro" ? "alert" : "status"} className="text-sm" style={{ color: msg.tipo === "erro" ? "var(--urgente)" : "var(--accent)" }}>
            {msg.texto}
          </p>
        )}
      </div>
    </form>
  );
}

export function BotaoResolverOcorrenciaEscola({ id }: { id: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await resolverOcorrenciaEscola(id);
            if (!r.ok) setErro(r.erro);
          })
        }
        className="text-xs font-semibold border border-border rounded-full px-3 py-1 hover:border-brand hover:text-brand transition disabled:opacity-60 whitespace-nowrap"
      >
        {pendente ? "…" : "Resolvida"}
      </button>
      {erro && (
        <span role="alert" className="text-xs" style={{ color: "var(--urgente)" }}>
          {erro}
        </span>
      )}
    </>
  );
}
