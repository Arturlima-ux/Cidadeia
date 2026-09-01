import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import Diagnostico from "@/components/site/Diagnostico";
import { EXIGENCIAS, BLOCOS, NOME_BLOCO, exigenciasDoBloco } from "@/lib/diagnostico";

export const metadata = {
  title: "Diagnóstico de conformidade — CidadeIA",
  description:
    "Treze exigências da LAI, da Lei 13.460, da LRF e da LGPD. Responda e veja onde o município está exposto, com o artigo de cada uma.",
};

export default function DiagnosticoPage() {
  return (
    <div className="tema-noite min-h-screen">
      <SiteHeader />

      <section className="max-w-3xl mx-auto px-4 sm:px-8 pt-14 sm:pt-20 pb-10">
        <Reveal>
          <span
            className="inline-flex items-center gap-2.5 text-xs font-mono uppercase tracking-[0.16em]"
            style={{ color: "var(--brand-claro)" }}
          >
            <span className="block w-6 h-px" style={{ background: "currentColor" }} />
            Gratuito · sem cadastro
          </span>

          <h1 className="font-serif text-[2.6rem] leading-[1.0] sm:text-[3.3rem] sm:leading-[0.98] font-extrabold tracking-[-0.045em] mt-6">
            O que o seu município já descumpre?
          </h1>

          <p className="text-muted text-base sm:text-lg leading-relaxed mt-6 max-w-[54ch]">
            {EXIGENCIAS.length} exigências da LAI, da Lei 13.460, da Lei de
            Responsabilidade Fiscal e da LGPD. Responda em dois minutos e saia
            com a lista do que falta — cada uma com o artigo que a cria.
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-7">
            {BLOCOS.map((b) => (
              <span key={b} className="text-xs text-muted font-mono flex items-center gap-2">
                <span
                  className="w-[5px] h-[5px] rounded-full shrink-0"
                  style={{ background: "var(--accent)" }}
                />
                {NOME_BLOCO[b]}
                <span className="opacity-60">({exigenciasDoBloco(b).length})</span>
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-8 pb-8">
        <Reveal delay={120}>
          <Diagnostico />
        </Reveal>
      </section>

      {/* O aviso fica DEPOIS do questionário de propósito: quem chegou aqui
          já respondeu e vai ler o resultado — é nesse momento que precisa
          saber exatamente o que o número significa e o que não significa. */}
      <section className="max-w-3xl mx-auto px-4 sm:px-8 pb-20 sm:pb-28">
        <Reveal>
          <div className="border border-border rounded-2xl p-6 sm:p-7" style={{ background: "var(--card)" }}>
            <h2 className="font-serif text-lg font-bold">O que este diagnóstico não é</h2>
            <ul className="flex flex-col gap-3 mt-4 text-sm text-muted leading-relaxed">
              <li>
                <strong className="text-foreground font-semibold">
                  Não é auditoria do site do seu município.
                </strong>{" "}
                Nada é inspecionado automaticamente. O resultado sai das
                respostas que você marcou, e só vale o que elas valerem.
              </li>
              <li>
                <strong className="text-foreground font-semibold">
                  Não é parecer jurídico.
                </strong>{" "}
                As leis citadas têm regulamentação municipal própria em muitos
                casos. Leve a lista ao setor jurídico da prefeitura antes de
                agir sobre ela.
              </li>
              <li>
                <strong className="text-foreground font-semibold">
                  Não é lista de vendas.
                </strong>{" "}
                Parte das exigências o CidadeIA não resolve, e o resultado diz
                quais são. Contratar não zera a lista.
              </li>
              <li>
                <strong className="text-foreground font-semibold">
                  Não guardamos nada.
                </strong>{" "}
                As respostas ficam no seu navegador. Não há envio, não há
                cadastro e não pedimos e-mail para mostrar o resultado.
              </li>
            </ul>

            <p className="text-sm text-muted mt-6 pt-5 border-t border-border leading-relaxed">
              Achou uma exigência errada ou faltando?{" "}
              <Link href="/suporte?assunto=diagnostico" className="text-brand font-semibold hover:underline">
                Escreva para a gente
              </Link>{" "}
              — a lista é corrigida com base no que chega.
            </p>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
