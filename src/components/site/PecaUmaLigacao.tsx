"use client";

import { useState, useTransition } from "react";
import { pedirLigacao } from "@/app/_atendimento/actions";
import { CARGOS_LIGACAO, HORARIOS_LIGACAO } from "@/lib/contato-comercial";

// ── PREFERE CONVERSAR? A EQUIPE LIGA ──
//
// O caminho mais curto entre o interesse e a conversa, para quem não quer
// montar proposta sozinho: nome, cargo e telefone. Quatro campos, nenhum
// e-mail obrigatório, e a promessa que a equipe consegue cumprir: ligar em
// dia útil, no horário escolhido.

export default function PecaUmaLigacao({
  codigoIbge = null,
  municipio = null,
  origem,
  linkWhatsapp = null,
  titulo = "Prefere conversar? A equipe liga para você.",
  texto = "Sem compromisso e sem apresentação de vendas: a conversa é sobre a sua prefeitura, com os números dela na mesa.",
}: {
  codigoIbge?: string | null;
  municipio?: string | null;
  /** Em que página a pessoa estava, para a equipe saber o contexto. */
  origem: string;
  /** Só existe quando o WhatsApp comercial está configurado. */
  linkWhatsapp?: string | null;
  titulo?: string;
  texto?: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<{ texto: string; campo?: string } | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  const [horario, setHorario] = useState<(typeof HORARIOS_LIGACAO)[number]>("Qualquer horário");

  function enviar(form: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await pedirLigacao({
        nome: form.get("nome"),
        cargo: form.get("cargo"),
        telefone: form.get("telefone"),
        horario,
        codigoIbge,
        municipioTexto: municipio ?? form.get("municipio") ?? null,
        origem,
      });
      if (r.ok) setFeito(horario === "Qualquer horário" ? "no próximo dia útil" : `${horario.toLowerCase()}, no próximo dia útil`);
      else setErro({ texto: r.erro, campo: r.campo });
    });
  }

  const campo = "w-full rounded-xl border border-border bg-transparent px-4 py-3 text-base";

  return (
    <div className="rounded-[28px] border border-border p-6 sm:p-8" style={{ background: "var(--card)" }}>
      {feito ? (
        <div aria-live="polite">
          <p className="text-2xl font-semibold tracking-[-0.03em]">Pronto. A equipe liga {feito}.</p>
          <p className="text-muted mt-2 leading-relaxed">
            Se preferir adiantar, tenha à mão o nome do secretário de finanças e do contador: são as duas pessoas que costumam
            participar da decisão.
          </p>
        </div>
      ) : (
        <form action={enviar} className="grid gap-4">
          <div>
            <p className="text-2xl font-semibold tracking-[-0.03em] leading-snug">{titulo}</p>
            <p className="text-muted mt-2 leading-relaxed">{texto}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-sm">
              Seu nome
              <input name="nome" required autoComplete="name" className={campo} aria-invalid={erro?.campo === "nome"} />
            </label>
            <label className="grid gap-1.5 text-sm">
              Cargo
              <select name="cargo" required defaultValue="" className={campo} style={{ background: "var(--card)" }} aria-invalid={erro?.campo === "cargo"}>
                <option value="" disabled hidden>
                  Escolha
                </option>
                {CARGOS_LIGACAO.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm">
              Telefone com DDD
              <input
                name="telefone"
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(86) 99999-0000"
                className={campo}
                aria-invalid={erro?.campo === "telefone"}
              />
            </label>
            {municipio ? (
              <div className="grid gap-1.5 text-sm">
                Município
                <p className="rounded-xl border border-border px-4 py-3 text-base text-muted">{municipio}</p>
              </div>
            ) : (
              <label className="grid gap-1.5 text-sm">
                Município
                <input name="municipio" placeholder="Ex.: Teresina, PI" className={campo} />
              </label>
            )}
          </div>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Melhor horário">
            {HORARIOS_LIGACAO.map((h) => (
              <button
                key={h}
                type="button"
                role="radio"
                aria-checked={horario === h}
                onClick={() => setHorario(h)}
                className="rounded-full border px-4 py-2 text-sm transition"
                style={
                  horario === h
                    ? { borderColor: "var(--brand)", background: "var(--brand-tint)", color: "var(--brand-claro)" }
                    : { borderColor: "var(--border)", color: "var(--muted)" }
                }
              >
                {h}
              </button>
            ))}
          </div>
          {erro && (
            <p className="text-sm rounded-xl px-4 py-3" style={{ background: "var(--urgente-tint)", color: "var(--urgente)" }}>
              {erro.texto}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={pendente}
              className="rounded-full px-6 py-3.5 font-semibold transition disabled:opacity-60"
              style={{ background: "var(--brand)", color: "var(--sobre-forte)" }}
            >
              {pendente ? "Enviando…" : "Pedir a ligação"}
            </button>
            {linkWhatsapp && (
              <a
                href={linkWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-border px-6 py-3.5 font-medium hover:border-brand transition"
              >
                Ou chame no WhatsApp
              </a>
            )}
          </div>
          <p className="text-xs text-muted">
            Usamos o telefone só para esta conversa. Nada de lista de transmissão.
          </p>
        </form>
      )}
    </div>
  );
}
