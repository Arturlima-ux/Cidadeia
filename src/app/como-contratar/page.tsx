import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import Olho from "@/components/site/Olho";
import { CAMINHOS } from "@/lib/contratacao";
import { DOCUMENTOS } from "@/lib/kit-contratacao";
import { IMPLANTACAO } from "@/lib/textos-contratacao";
import { IconDownload } from "@/components/icons";

export const metadata = {
  title: "Como contratar — CidadeIA",
  description:
    "Os três caminhos legais para a prefeitura contratar o CidadeIA, o processo pronto para o jurídico conferir e o que acontece da assinatura ao portal no ar.",
};

// ── ERA UMA SEÇÃO DA HOME ──
//
// "Como sai do papel" — caminho legal, kit e implantação — ocupava uma tela
// e meia da home, antes de a pessoa ter visto o produto funcionar. Virou
// página: quem já quer contratar chega aqui pelo menu e encontra tudo
// junto; quem ainda está decidindo não passa por isto antes da hora.
// O conteúdo é o mesmo. Mudou de endereço.

export default function ComoContratarPage() {
  const kitBaixavel = DOCUMENTOS.filter((d) => d.geramos);

  return (
    <div className="tema-noite min-h-screen">
      <SiteHeader />
      <main>
    <section id="como-contratar" className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-20">
      <Reveal>
        <div className="max-w-2xl">
          <Olho>Como sai do papel</Olho>
          <h1 className="font-serif text-3xl sm:text-[2.9rem] font-extrabold tracking-[-0.04em] leading-[1.02] mt-5 max-w-[20ch]">
            Três caminhos legais. Nenhum processo inventado.
          </h1>
          <p className="text-muted leading-relaxed mt-5 max-w-[52ch]">
            O que trava a assinatura quase nunca é a decisão — é o servidor
            que precisa montar o processo do zero.
          </p>
        </div>
      </Reveal>

      {/* ── 1. o caminho ── */}
      <div className="grid md:grid-cols-3 gap-4 mt-10">
        {CAMINHOS.map((c, i) => {
          const destaque = c.chave === "dispensa";
          return (
            <Reveal key={c.chave} delay={i * 80}>
              <div
                className="h-full flex flex-col gap-3 rounded-2xl border p-6 card-interactive"
                style={{
                  background: destaque ? "var(--accent-tint)" : "var(--card)",
                  borderColor: destaque ? "var(--info-borda)" : "var(--border)",
                }}
              >
                {destaque && (
                  <span
                    className="self-start text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1"
                    style={{ background: "var(--card)", color: "var(--accent-claro)" }}
                  >
                    Mais rápido
                  </span>
                )}
                <h3 className="font-serif text-xl font-bold">{c.nome}</h3>
                <p className="text-sm text-muted leading-relaxed flex-1">{c.resumo}</p>
                <p
                  className="text-xs font-bold border-t border-border pt-3 mt-1"
                  style={{ color: destaque ? "var(--accent-claro)" : "var(--brand-claro)" }}
                >
                  {c.base}
                </p>
              </div>
            </Reveal>
          );
        })}
      </div>

      {/* ── 2. o processo, pronto ── */}
      <div id="kit" className="mt-16 pt-12 border-t border-border">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4 mb-8">
            <div>
              <p className="font-serif text-2xl font-extrabold tracking-[-0.03em]">
                O jurídico só confere. Não redige.
              </p>
              <p className="text-sm text-muted leading-relaxed mt-2 max-w-[52ch]">
                Baixe sem cadastro, leve para a reunião, volte se fizer
                sentido.
              </p>
            </div>
            {/* Contornado: o kit é apoio ao processo, não o passo do funil.
                O fecho da página carrega a ação de converter, e já entrega
                o kit junto da proposta. */}
            <Link
              href="/kit"
              className="shrink-0 text-sm font-semibold text-muted hover:text-brand-claro transition"
            >
              Abrir o kit completo&nbsp;&nbsp;→
            </Link>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {kitBaixavel.map((d, i) => (
            <Reveal key={d.chave} delay={i * 60}>
              <Link
                href={`/kit#${d.chave}`}
                className="h-full flex items-center gap-3.5 rounded-2xl border border-border p-4 card-interactive hover:border-brand transition"
                style={{ background: "var(--card)" }}
              >
                <span
                  className="w-9 h-9 arco-card-sm flex items-center justify-center shrink-0"
                  style={{ background: "var(--brand-tint)", color: "var(--brand-claro)" }}
                >
                  <IconDownload className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-sm leading-tight">{d.nome}</span>
                  <span className="block text-xs text-muted mt-1 leading-relaxed">
                    {d.subtitulo}
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ── 3. depois da assinatura ── */}
      <div className="mt-16 pt-12 border-t border-border">
        <Reveal>
          <div className="mb-8">
            <p className="font-serif text-2xl font-extrabold tracking-[-0.03em]">
              Da assinatura ao portal no ar.
            </p>
            <p className="text-sm text-muted leading-relaxed mt-2 max-w-[52ch]">
              Sem licitação de infraestrutura, sem servidor na prefeitura e
              sem equipe de tecnologia dedicada.
            </p>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {IMPLANTACAO.map((p, i) => (
            <Reveal key={p.n} delay={i * 90}>
              <div
                className="h-full border rounded-2xl p-6 flex flex-col gap-3"
                style={{
                  background: p.fim ? "var(--accent-tint)" : "var(--card)",
                  borderColor: p.fim ? "var(--info-borda)" : "var(--border)",
                }}
              >
                <span
                  className="font-serif text-sm font-extrabold tracking-widest"
                  style={{ color: p.fim ? "var(--accent-claro)" : "var(--brand-claro)" }}
                >
                  {p.n}
                </span>
                <h3 className="font-semibold text-sm">{p.titulo}</h3>
                <p className="text-sm text-muted leading-relaxed">{p.texto}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
      </main>
      <SiteFooter />
    </div>
  );
}
