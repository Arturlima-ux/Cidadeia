"use client";

import { useDeferredValue, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { ROTULO_TIPO, SUGESTOES, buscar, type ItemDaCidade, type TipoItem } from "@/lib/pergunte-a-cidade";
import { EVENTO_PERGUNTAR } from "@/lib/eventos-do-portal";

// ── PERGUNTE À CIDADE ── (regras em lib/pergunte-a-cidade.ts)
// Um campo só, no topo do portal. A resposta aparece enquanto o morador
// digita, com o endereço, o telefone, o valor ou o andamento, e o link para
// o dado. Sem resposta, a pergunta vira pedido de informação à prefeitura.

const COR: Record<TipoItem, string> = {
  servico: "var(--brand-claro)",
  saude: "var(--info)",
  escola: "var(--accent)",
  obra: "var(--medio)",
  compra: "var(--brand-claro)",
  dinheiro: "var(--info)",
  publicacao: "var(--muted)",
  contato: "var(--brand-claro)",
  acao: "var(--brand-claro)",
};

function Detalhe({ texto }: { texto: string }) {
  // Telefone vira ligação com um toque, que é o que o morador quer no celular.
  const tel = /^Telefone:\s*(.+)$/.exec(texto);
  if (tel) {
    const digitos = tel[1].replace(/\D/g, "");
    return (
      <li>
        Telefone:{" "}
        <a href={`tel:${digitos}`} className="font-medium hover:underline" style={{ color: "var(--brand-claro)" }}>
          {tel[1]}
        </a>
      </li>
    );
  }
  return <li>{texto}</li>;
}

export default function PergunteACidade({ municipio, itens }: { municipio: string; itens: ItemDaCidade[] }) {
  const [pergunta, setPergunta] = useState("");
  const adiada = useDeferredValue(pergunta);
  const resultados = useMemo(() => buscar(itens, adiada), [itens, adiada]);
  const reduzir = useReducedMotion();
  const campo = useRef<HTMLInputElement>(null);
  const idResultados = useId();
  const temPergunta = adiada.trim().length >= 3;

  function perguntarAPrefeitura() {
    window.dispatchEvent(new CustomEvent(EVENTO_PERGUNTAR, { detail: { assunto: pergunta.trim() } }));
    document.getElementById("atendimento")?.scrollIntoView({ behavior: reduzir ? "auto" : "smooth" });
    // O foco vai para a mensagem, com o assunto já escrito.
    window.setTimeout(() => document.getElementById("cid-mensagem")?.focus({ preventScroll: true }), 450);
  }

  return (
    <section aria-labelledby="pergunte-titulo" className="relative">
      <div
        className="rounded-[32px] border border-border p-5 sm:p-8"
        style={{ background: "radial-gradient(70% 90% at 0% 0%, color-mix(in oklab, var(--brand) 16%, transparent), transparent 70%), var(--card)" }}
      >
        <h2 id="pergunte-titulo" className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em]">
          Pergunte qualquer coisa sobre {municipio}.
        </h2>
        <p className="text-muted mt-2 max-w-[60ch]">
          Do seu jeito, sem precisar saber qual secretaria cuida do assunto. A busca procura enquanto você escreve, só no que a prefeitura publicou: nada aqui é escrito por inteligência artificial.
        </p>

        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            campo.current?.blur();
          }}
          className="mt-6"
        >
          <label htmlFor="pergunte-campo" className="sr-only">
            Sua pergunta
          </label>
          <div className="flex items-center gap-3 rounded-2xl border-2 border-border focus-within:border-brand px-4 sm:px-5 transition" style={{ background: "var(--background)" }}>
            <svg aria-hidden viewBox="0 0 24 24" className="w-6 h-6 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              ref={campo}
              id="pergunte-campo"
              type="search"
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              placeholder="ex.: onde tem posto de saúde perto do Centro?"
              autoComplete="off"
              enterKeyHint="search"
              aria-controls={idResultados}
              className="flex-1 min-w-0 bg-transparent py-4 sm:py-5 text-lg sm:text-xl outline-none placeholder:text-muted/70 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {pergunta && (
              <button
                type="button"
                onClick={() => {
                  setPergunta("");
                  campo.current?.focus();
                }}
                className="text-sm text-muted hover:text-foreground shrink-0"
              >
                Limpar
              </button>
            )}
          </div>
        </form>

        {!pergunta && (
          <div className="flex flex-wrap gap-2 mt-4" aria-label="Exemplos de pergunta">
            {SUGESTOES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setPergunta(s)}
                className="rounded-full border border-border px-3.5 py-1.5 text-sm text-muted hover:text-foreground hover:border-brand transition"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div id={idResultados} aria-live="polite" className="mt-6">
          {temPergunta && (
            <p className="sr-only">
              {resultados.length ? `${resultados.length} respostas encontradas.` : "Nenhuma resposta publicada ainda."}
            </p>
          )}
          <AnimatePresence mode="popLayout" initial={false}>
            {temPergunta &&
              resultados.map((r, i) => (
                <m.article
                  key={r.id}
                  layout={!reduzir}
                  initial={reduzir ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduzir ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.28, delay: reduzir ? 0 : i * 0.03 }}
                  className="rounded-2xl border border-border p-4 sm:p-5 mb-3"
                  style={{ background: "var(--background)" }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: COR[r.tipo] }}>
                        {ROTULO_TIPO[r.tipo]}
                      </p>
                      <h3 className="text-lg font-semibold tracking-[-0.01em] mt-1 break-words">{r.titulo}</h3>
                      <p className="text-sm sm:text-base mt-1 leading-relaxed">{r.resposta}</p>
                      {r.detalhes.length > 0 && (
                        <ul className="text-sm text-muted mt-2 space-y-0.5">
                          {r.detalhes.map((d) => (
                            <Detalhe key={d} texto={d} />
                          ))}
                        </ul>
                      )}
                    </div>
                    {r.link && (
                      <a
                        href={r.link.href}
                        {...(r.link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="shrink-0 self-start rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-brand transition"
                      >
                        {r.link.rotulo} →
                      </a>
                    )}
                  </div>
                </m.article>
              ))}
          </AnimatePresence>

          {temPergunta && (
            <div
              className={`rounded-2xl border border-dashed border-border p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${resultados.length ? "mt-1" : ""}`}
            >
              <p className="text-sm sm:text-base">
                {resultados.length ? (
                  <span className="text-muted">Não era isso? Pergunte direto à prefeitura.</span>
                ) : (
                  <>
                    <span className="font-medium">Isso ainda não está publicado aqui.</span>{" "}
                    <span className="text-muted">Pergunte direto: pela Lei de Acesso à Informação, a prefeitura tem 20 dias para responder.</span>
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={perguntarAPrefeitura}
                className="shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: "var(--brand)" }}
              >
                Perguntar à prefeitura
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
