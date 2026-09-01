import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import SeletorPainelModulo from "@/components/site/SeletorPainelModulo";
import { PLANOS_ADDON } from "@/lib/planos";
import { IconAlertas, IconSaude, IconEducacao, IconObras, IconLicitacoes, IconVisaoGeral } from "@/components/icons";

const ICONE_ADDON: Record<string, (p: React.SVGProps<SVGSVGElement>) => React.ReactElement> = {
  essencial: IconAlertas,
  saude: IconSaude,
  educacao: IconEducacao,
  obras: IconObras,
  licitacoes: IconLicitacoes,
  gestao: IconVisaoGeral,
};

export const metadata = {
  title: "Preços — CidadeIA",
};

export default function PrecosPage() {
  return (
    <div className="tema-noite min-h-screen">
      <SiteHeader />

      <Reveal>
        <section className="max-w-3xl mx-auto px-4 sm:px-8 pt-16 pb-8 text-center">
          <h1 className="font-serif text-4xl font-bold">Preços</h1>
          <p className="text-muted text-base mt-4 leading-relaxed">
            Cada área é um módulo avulso, contratado separadamente conforme o que
            sua gestão precisa. Você paga só pelo que usa.
          </p>
        </section>
      </Reveal>

      <Reveal>
        <section className="max-w-4xl mx-auto px-4 sm:px-8 pb-16">
          <div className="text-center mb-8">
            <h2 className="font-serif text-2xl font-bold">O painel de cada módulo</h2>
            <p className="text-muted mt-2 leading-relaxed max-w-lg mx-auto">
              Mesmo formato pra toda secretaria — só muda a métrica de acordo com o que aquele módulo cuida.
            </p>
          </div>
          <SeletorPainelModulo />
        </section>
      </Reveal>

      <section className="max-w-4xl mx-auto px-4 sm:px-8 pb-16">
        <h2 className="font-serif text-xl font-bold mb-5">Módulos disponíveis</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {PLANOS_ADDON.map((p, i) => {
            const Icone = ICONE_ADDON[p.chave];
            return (
              <Reveal key={p.chave} delay={(i % 2) * 100}>
                <div className="card-interactive shadow-elevated bg-card border border-border rounded-2xl p-5 h-full">
                  <div
                    className="w-10 h-10 rounded-xl text-white flex items-center justify-center mb-4"
                    style={{ background: "var(--gradient-hero)" }}
                  >
                    <Icone className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-sm">{p.nome}</p>
                  <p className="text-sm text-muted mt-1.5 leading-relaxed">{p.descricao}</p>
                  <Link
                    href={`/suporte?modulo=${encodeURIComponent(p.nome)}`}
                    className="inline-block text-xs font-semibold text-brand hover:underline mt-3"
                  >
                    Sob consulta — pedir proposta →
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal>
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm font-semibold">O valor de cada módulo varia pelo porte do município.</p>
            <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-lg mx-auto">
              Contratação em prefeitura passa por proposta, processo e empenho —
              não por cartão. Fale com a gente e o valor dos módulos vem junto do
              termo de referência.
            </p>
            {/* A ação cheia era "Criar conta grátis", que leva a uma conta sem
                módulo nenhum e a um checkout ainda não configurado. Quem fecha
                a contratação é a proposta; a conta vem depois dela. */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/suporte?assunto=proposta"
                className="bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full px-6 py-2.5 transition"
              >
                Receber proposta
              </Link>
              <Link
                href="/diagnostico"
                className="text-sm font-semibold text-foreground hover:text-brand transition border border-border rounded-full px-6 py-2.5"
              >
                Fazer o diagnóstico
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
