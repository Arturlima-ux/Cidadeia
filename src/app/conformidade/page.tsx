import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import Olho from "@/components/site/Olho";
import { EXIGENCIAS, BLOCOS, NOME_BLOCO, exigenciasDoBloco } from "@/lib/diagnostico";
import { CONFORMIDADE, OBJECOES } from "@/lib/textos-contratacao";

export const metadata = {
  title: "Conformidade legal — CidadeIA",
  description:
    "O que a LAI, a Lei 13.460, a LRF e a LGPD exigem da prefeitura, o que o CidadeIA entrega para cada exigência, e as perguntas que o jurídico sempre faz antes de assinar.",
};

// ── ERA UMA SEÇÃO DA HOME ──
//
// "Antes de assinar" — a tabela exigência × entrega e as perguntas que
// sempre voltam — é a parte que o jurídico abre antes de aprovar. Na home,
// era a nona seção de dez: chegava tarde para quem procurava e cedo demais
// para quem ainda não tinha visto o produto. Virou página, e o cartão das
// exigências que abria o herói veio junto: é o resumo desta tabela.

export default function ConformidadePage() {
  const naoResolvemos = EXIGENCIAS.filter((e) => !e.resolvemos);

  return (
    <div className="tema-noite min-h-screen">
      <SiteHeader />
      <main>
        <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-14 sm:pt-20 pb-10">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
            <Reveal>
              <div>
                <Olho>Conformidade</Olho>
                <p className="font-serif text-3xl sm:text-[2.9rem] font-extrabold tracking-[-0.04em] leading-[1.02] mt-5 max-w-[18ch]">
                  {EXIGENCIAS.length} exigências. Cada uma com o artigo que a cria.
                </p>
                <p className="text-muted leading-relaxed mt-5 max-w-[50ch]">
                  LAI, Lei 13.460, LRF e LGPD, em quatro blocos. O diagnóstico
                  gratuito confere as {EXIGENCIAS.length} contra a situação do seu
                  município — sem cadastro, sem enviar nada.
                </p>
                <Link
                  href="/diagnostico"
                  className="inline-block mt-7 bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-7 py-4 transition shadow-elevated"
                >
                  Fazer o diagnóstico&nbsp;&nbsp;→
                </Link>
              </div>
            </Reveal>
        <Reveal>
          <div className="vidro rounded-2xl p-7">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              O que é verificado
            </p>
            <p className="font-serif text-[3.2rem] leading-none font-extrabold tracking-[-0.05em] mt-3 tabular-nums">
              {EXIGENCIAS.length}
            </p>
            <p className="text-sm text-muted mt-2">exigências, em quatro blocos</p>

            <ul className="flex flex-col gap-3 mt-6">
              {BLOCOS.map((b) => {
                const doBloco = exigenciasDoBloco(b);
                return (
                  <li key={b} className="flex items-baseline justify-between gap-4">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-snug">
                        {NOME_BLOCO[b]}
                      </span>
                      <span className="block text-xs font-mono text-muted mt-0.5">
                        {doBloco[0]?.lei.replace(/\s*\(.*\)$/, "")}
                      </span>
                    </span>
                    <span
                      className="text-sm font-bold tabular-nums shrink-0"
                      style={{ color: "var(--accent-claro)" }}
                    >
                      {doBloco.length}
                    </span>
                  </li>
                );
              })}
            </ul>

            <p className="text-xs text-muted leading-relaxed border-t border-border pt-4 mt-6">
              {naoResolvemos.length} delas continuam com a prefeitura mesmo
              contratando o CidadeIA — e estão na lista assim mesmo.
            </p>
          </div>
        </Reveal>
          </div>
        </section>
    <section id="conformidade" className="border-b border-border" style={{ background: "var(--superficie)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
            <div>
              <Olho>Antes de assinar</Olho>
              <h1 className="font-serif text-3xl sm:text-[2.9rem] font-extrabold tracking-[-0.04em] leading-[1.02] mt-5 max-w-[20ch]">
                O que a lei exige, e o que sempre perguntam.
              </h1>
            </div>
            <p className="text-sm text-muted leading-relaxed max-w-xs">
              A parte que o setor jurídico abre antes de aprovar a
              contratação — com as dúvidas que voltam em toda reunião logo
              abaixo.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <div className="border border-border rounded-2xl overflow-hidden" style={{ background: "var(--card)" }}>
            <div
              className="hidden md:grid grid-cols-[260px_1fr_120px] text-xs font-mono uppercase tracking-wider text-muted border-b border-border"
              style={{ background: "var(--superficie)" }}
            >
              <div className="px-5 py-3">Exigência</div>
              <div className="px-5 py-3">O que o CidadeIA faz</div>
              <div className="px-5 py-3">Situação</div>
            </div>
            {CONFORMIDADE.map((c) => (
              <div
                key={c.exigencia}
                className="grid md:grid-cols-[260px_1fr_120px] gap-1 md:gap-0 px-5 py-4 md:p-0 border-b border-border last:border-b-0"
              >
                <div className="md:px-5 md:py-4">
                  <p className="font-semibold text-sm">{c.exigencia}</p>
                  <p className="text-xs text-muted mt-0.5 font-mono">{c.lei}</p>
                </div>
                <div className="md:px-5 md:py-4 text-sm text-muted leading-relaxed">
                  {c.entrega}
                </div>
                <div className="md:px-5 md:py-4">
                  <span
                    className="inline-block text-xs font-bold rounded-full px-3 py-1"
                    style={{
                      color: "var(--accent-claro)",
                      background: "var(--accent-tint)",
                      border: "1px solid var(--info-borda)",
                    }}
                  >
                    No ar
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ── as objeções, que eram seção própria ──
            Estavam separadas desta tabela por uma terceira seção no meio,
            e serviam exatamente o mesmo leitor: quem está conferindo antes
            de assinar. Uma pergunta como "e a LGPD?" é a versão informal
            de uma linha da tabela acima — separá-las fazia a página
            responder duas vezes, longe uma da outra.

            Continuam fechadas. Cada leitor tem uma ou duas dúvidas, não as
            seis, e `details` não esconde o texto do Ctrl+F nem do leitor
            de tela. */}
        <Reveal>
          <div className="max-w-3xl mx-auto mt-12 pt-10 border-t border-border">
            <p className="text-sm font-semibold mb-1">
              As perguntas que sempre voltam
            </p>
            <p className="text-sm text-muted leading-relaxed mb-5">
              Respondidas por escrito, para você não precisar de uma reunião
              só para ouvir isso.
            </p>
            <div className="border-t border-border">
              {OBJECOES.map((o) => (
                <details key={o.pergunta} className="group border-b border-border">
                  <summary className="flex items-center justify-between gap-4 py-4 cursor-pointer list-none font-semibold text-sm sm:text-base hover:text-brand-claro transition">
                    {o.pergunta}
                    <span
                      aria-hidden
                      className="shrink-0 text-lg leading-none transition-transform group-open:rotate-45"
                      style={{ color: "var(--muted)" }}
                    >
                      +
                    </span>
                  </summary>
                  <p className="text-sm text-muted leading-relaxed pb-5 pr-8 -mt-1">
                    {o.resposta}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>

      </main>
      <SiteFooter />
    </div>
  );
}
