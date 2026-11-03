"use client";

import { useActionState, useEffect, useRef } from "react";
import { ESTADOS } from "@/lib/estados";
import { CANAIS, CARGOS_PROSPECTO, ROTULO_CANAL, ROTULO_SITUACAO } from "@/lib/prospeccao";
import { criarProspecto } from "./actions";

// O formulário de um prospecto novo. Fechado por padrão: a mesa abre no que
// é para hoje, e cadastrar é a segunda coisa do dia (rotina do guia).

const campo = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm";
const rotulo = "block text-xs font-medium text-muted mb-1.5";

export default function NovoProspecto() {
  const [estado, enviar, enviando] = useActionState(criarProspecto, null);
  const formulario = useRef<HTMLFormElement>(null);
  const caixa = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (estado?.ok) {
      formulario.current?.reset();
      if (caixa.current) caixa.current.open = false;
    }
  }, [estado]);

  return (
    <details ref={caixa} className="rounded-[22px] border border-border group" style={{ background: "var(--card)" }}>
      <summary className="cursor-pointer list-none px-5 py-4 sm:px-6 font-semibold flex items-center justify-between gap-3">
        Novo prospecto
        <span aria-hidden className="text-muted transition group-open:rotate-45 text-xl leading-none">+</span>
      </summary>
      <form ref={formulario} action={enviar} className="px-5 pb-5 sm:px-6 sm:pb-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <label className="sm:col-span-2 lg:col-span-1">
          <span className={rotulo}>Cidade</span>
          <input name="municipio" required maxLength={80} placeholder="Teresina" className={campo} />
        </label>
        <label>
          <span className={rotulo}>UF</span>
          <select name="uf" required defaultValue="" className={campo}>
            <option value="" disabled>
              Escolha
            </option>
            {ESTADOS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={rotulo}>Etapa</span>
          <select name="situacao" defaultValue="mapeada" className={campo}>
            {(["mapeada", "aquecendo", "abordada", "conversando", "qualificada", "reuniao"] as const).map((s) => (
              <option key={s} value={s}>
                {ROTULO_SITUACAO[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={rotulo}>Canal</span>
          <select name="canal" required defaultValue="instagram" className={campo}>
            {CANAIS.map((c) => (
              <option key={c} value={c}>
                {ROTULO_CANAL[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2 lg:col-span-1">
          <span className={rotulo}>Pessoa</span>
          <input name="pessoa" maxLength={80} placeholder="Nome de quem decide" className={campo} />
        </label>
        <label className="sm:col-span-2 lg:col-span-1">
          <span className={rotulo}>Cargo</span>
          <select name="cargo" defaultValue="" className={campo}>
            <option value="">Ainda não sei</option>
            {CARGOS_PROSPECTO.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className={rotulo}>Contato</span>
          <input name="contato" maxLength={120} placeholder="@perfil, telefone, e-mail ou link do LinkedIn" className={campo} />
        </label>
        <label className="sm:col-span-2 lg:col-span-4">
          <span className={rotulo}>Gancho: o número do Raio-X que abre a conversa</span>
          <input name="gancho" maxLength={280} placeholder="Despesa com pessoal em 50,1% da receita, acima do alerta da LRF" className={campo} />
        </label>
        <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-full bg-brand text-white font-semibold px-6 py-2.5 text-sm hover:bg-brand-dark transition disabled:opacity-50"
          >
            {enviando ? "Guardando…" : "Guardar prospecto"}
          </button>
          <p className="text-xs text-muted">
            Só o contato de trabalho. Quem pedir para não ser procurado é apagado no mesmo dia.
          </p>
          {estado && !estado.ok && (
            <p role="alert" className="text-sm font-medium" style={{ color: "var(--urgente)" }}>
              {estado.erro}
            </p>
          )}
        </div>
      </form>
    </details>
  );
}
