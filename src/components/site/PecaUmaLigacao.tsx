"use client";

import { useRef, useState, useTransition } from "react";
import { pedirLigacao } from "@/app/_atendimento/actions";
import { CARGOS_LIGACAO, HORARIOS_LIGACAO } from "@/lib/contato-comercial";

// ── PEÇA UMA LIGAÇÃO, EM UMA FRASE ──
//
// Era um formulário de seis campos em duas colunas, com botões de horário:
// ocupava meia tela para pedir quatro informações. Virou uma frase para
// completar, do jeito que a pessoa diria ao telefone:
//
//   "Sou [nome], [cargo] de [município]. Liguem para [telefone] [de manhã]."
//
// Os campos ficam dentro da frase, sublinhados, e a frase quebra linha
// sozinha no celular. Ao enviar, ela vira a confirmação, com o que a pessoa
// escreveu: "Pronto, Maria. Ligamos para (86) 99999-0000 de manhã."

/** Como cada cargo soa dentro da frase. O valor enviado é o original. */
const CARGO_NA_FRASE: Record<(typeof CARGOS_LIGACAO)[number], string> = {
  "Prefeito(a)": "prefeito(a)",
  "Secretário(a) de Finanças / Fazenda": "secretário(a) de finanças",
  "Contador(a) / contabilidade": "contador(a)",
  "Controlador(a) interno(a)": "controlador(a) interno(a)",
  "Outro cargo na prefeitura": "servidor(a) da prefeitura",
  "Assessoria / consultoria": "assessor(a) ou consultor(a)",
};

const HORARIO_NA_FRASE: Record<(typeof HORARIOS_LIGACAO)[number], string> = {
  "De manhã": "de manhã",
  "À tarde": "à tarde",
  "Qualquer horário": "em qualquer horário",
};

export default function PecaUmaLigacao({
  codigoIbge = null,
  municipio = null,
  origem,
  linkWhatsapp = null,
  cargoInicial = "",
  titulo = "Prefere conversar? Complete a frase e a equipe liga.",
  texto = null,
}: {
  codigoIbge?: string | null;
  municipio?: string | null;
  /** Em que página a pessoa estava, para a equipe saber o contexto. */
  origem: string;
  /** Só existe quando o WhatsApp comercial está configurado. */
  linkWhatsapp?: string | null;
  /** Nas páginas de cada cargo, o campo já vem preenchido. */
  cargoInicial?: string;
  titulo?: string;
  texto?: string | null;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<{ texto: string; campo?: string } | null>(null);
  const [feito, setFeito] = useState<{ nome: string; telefone: string; horario: string } | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [cargo, setCargo] = useState<string>(cargoInicial);
  const [horario, setHorario] = useState<(typeof HORARIOS_LIGACAO)[number]>("Qualquer horário");
  const form = useRef<HTMLFormElement>(null);
  // A lacuna cresce com o que se escreve (ou com o texto de exemplo), para a
  // frase não ficar com buracos. 0,52em é a largura média de uma letra desta fonte.
  const largura = (texto: string, extra = 0.6) => ({ width: `calc(${Math.max(texto.length, 2) * 0.52}em + ${extra}rem)` });
  const id = (campo: string) => `lig-${campo}-${origem.normalize("NFD").replace(/[^A-Za-z0-9]+/g, "-")}`;

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    iniciar(async () => {
      const r = await pedirLigacao({
        nome,
        cargo,
        telefone,
        horario,
        codigoIbge,
        municipioTexto: municipio ?? (cidade || null),
        origem,
      });
      if (r.ok) setFeito({ nome: nome.trim().split(" ")[0], telefone, horario: HORARIO_NA_FRASE[horario] });
      else {
        setErro({ texto: r.erro, campo: r.campo });
        form.current?.querySelector<HTMLElement>(`[name="${r.campo}"]`)?.focus();
      }
    });
  }

  // O campo dentro da frase: sem caixa, só o sublinhado, no tamanho do texto.
  const lacuna = (campo: string) =>
    `frase-lacuna inline-block align-baseline bg-transparent border-0 border-b-2 px-1 mx-0.5 rounded-none outline-none transition-colors placeholder:text-muted/60 ${
      erro?.campo === campo ? "border-[color:var(--urgente)]" : "border-[color:var(--border)] focus:border-[color:var(--brand)]"
    }`;

  return (
    <div className="rounded-[22px] border border-border p-5 sm:p-7" style={{ background: "var(--card)" }}>
      {feito ? (
        <div aria-live="polite" className="flex items-start gap-4">
          <span
            className="mt-1 w-9 h-9 shrink-0 rounded-full grid place-items-center"
            style={{ background: "var(--brand-tint)", color: "var(--brand-claro)" }}
            aria-hidden
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="text-xl sm:text-2xl font-semibold tracking-[-0.025em] leading-snug">
              Pronto, {feito.nome}. Ligamos para {feito.telefone} {feito.horario}, no próximo dia útil.
            </p>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              Se der, tenha à mão o nome do secretário de finanças e do contador: costumam participar da decisão.
            </p>
          </div>
        </div>
      ) : (
        <form ref={form} onSubmit={enviar} noValidate>
          <p className="text-sm font-medium">{titulo}</p>
          {texto && <p className="text-sm text-muted mt-1 leading-relaxed max-w-[64ch]">{texto}</p>}

          {/* A frase. Cada lacuna tem rótulo próprio para leitor de tela. */}
          <p className="mt-5 text-xl sm:text-2xl leading-[2.1] sm:leading-[2] tracking-[-0.015em]">
            Sou
            <label className="sr-only" htmlFor={id("nome")}>Seu nome</label>
            <input
              id={id("nome")}
              name="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="seu nome"
              autoComplete="name"
              required
              style={largura(nome || "seu nome")}
              className={lacuna("nome")}
              aria-invalid={erro?.campo === "nome"}
            />
            ,
            <label className="sr-only" htmlFor={id("cargo")}>Cargo</label>
            <span className="relative inline-block">
              <select
                id={id("cargo")}
                name="cargo"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                required
                className={`${lacuna("cargo")} appearance-none pr-6 cursor-pointer ${cargo ? "" : "text-muted"}`}
                style={{ background: "transparent", ...largura(cargo ? CARGO_NA_FRASE[cargo as (typeof CARGOS_LIGACAO)[number]] : "seu cargo", 1.75) }}
                aria-invalid={erro?.campo === "cargo"}
              >
                <option value="" disabled style={{ background: "var(--card)" }}>
                  seu cargo
                </option>
                {CARGOS_LIGACAO.map((c) => (
                  <option key={c} value={c} style={{ background: "var(--card)", color: "var(--foreground)" }}>
                    {CARGO_NA_FRASE[c]}
                  </option>
                ))}
              </select>
              <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
            {municipio ? (
              <> de {municipio}.</>
            ) : (
              <>
                {" "}de
                <label className="sr-only" htmlFor={id("cidade")}>Município</label>
                <input
                  id={id("cidade")}
                  name="municipio"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="qual município"
                  style={largura(cidade || "qual município")}
                  className={lacuna("municipio")}
                />
                .
              </>
            )}{" "}
            Liguem para
            <label className="sr-only" htmlFor={id("tel")}>Telefone com DDD</label>
            <input
              id={id("tel")}
              name="telefone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(DDD) número"
              required
              style={largura(telefone || "(DDD) número")}
              className={`${lacuna("telefone")} tabular-nums`}
              aria-invalid={erro?.campo === "telefone"}
            />
            <label className="sr-only" htmlFor={id("hora")}>Melhor horário</label>
            <span className="relative inline-block">
              <select
                id={id("hora")}
                name="horario"
                value={horario}
                onChange={(e) => setHorario(e.target.value as (typeof HORARIOS_LIGACAO)[number])}
                className={`${lacuna("horario")} appearance-none pr-6 cursor-pointer`}
                style={{ background: "transparent", ...largura(HORARIO_NA_FRASE[horario], 1.75) }}
              >
                {HORARIOS_LIGACAO.map((h) => (
                  <option key={h} value={h} style={{ background: "var(--card)", color: "var(--foreground)" }}>
                    {HORARIO_NA_FRASE[h]}
                  </option>
                ))}
              </select>
              <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
            .
          </p>

          {erro && (
            <p className="mt-3 text-sm" style={{ color: "var(--urgente)" }} role="alert">
              {erro.texto}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <button
              type="submit"
              disabled={pendente}
              className="rounded-full px-6 py-3 font-semibold transition disabled:opacity-60"
              style={{ background: "var(--brand)", color: "var(--sobre-forte)" }}
            >
              {pendente ? "Enviando…" : "Pedir a ligação"}
            </button>
            {linkWhatsapp && (
              <a href={linkWhatsapp} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline" style={{ color: "var(--brand-claro)" }}>
                Ou chame no WhatsApp
              </a>
            )}
            <span className="text-xs text-muted">Sem apresentação de vendas: a conversa é sobre a sua prefeitura. Ligamos em dia útil.</span>
          </div>
        </form>
      )}
    </div>
  );
}
