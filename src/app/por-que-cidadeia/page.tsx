import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import { IconX, IconCheck } from "@/components/icons";

export const metadata = {
  title: "Por que CidadeIA — CidadeIA",
};

const PROBLEMAS = [
  "Cada secretaria organiza os dados do seu jeito — planilha, papel, WhatsApp — e ninguém tem o panorama completo.",
  "Prestação de contas e relatório pro TCE feitos na correria, juntando número de gente diferente na véspera do prazo.",
  "A população e a imprensa cobram transparência, e manter um portal atualizado à mão consome tempo que a equipe não tem.",
  "Um problema numa secretaria só chega até o prefeito quando já virou crise — não existe um lugar único pra ver o que está acontecendo.",
  "Atendimento ao cidadão depende de ir presencialmente ou ligar — sem canal digital simples de protocolo e ouvidoria.",
  "Decisão importante tomada no feeling, porque os números reais levam dias pra serem consolidados manualmente.",
];

const SOLUCOES = [
  "Cada secretaria tem seu próprio painel, e o prefeito enxerga todas — dado consolidado automaticamente, num só lugar.",
  "Relatório executivo em PDF pronto a qualquer momento, com dado já organizado — sem virar a noite montando planilha.",
  "Portal da Transparência e Ouvidoria inclusos e sempre atualizados, porque nascem dos mesmos dados que você já registra.",
  "IA analisa os indicadores e sinaliza padrões preocupantes com justificativa — uma pessoa aprova antes de virar alerta oficial.",
  "Protocolo de atendimento direto pelo WhatsApp — o cidadão abre uma solicitação sem sair de casa.",
  "Números reais disponíveis na hora, com histórico e projeção — decisão embasada em dado, não em achismo.",
];

export default function PorQueCidadeIAPage() {
  return (
    <div className="tema-noite min-h-screen">
      <SiteHeader />

      <Reveal>
        <section className="max-w-2xl mx-auto px-4 sm:px-8 pt-16 pb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-dark bg-brand-tint border border-brand/15 inline-block px-3 py-1 rounded-full">
            Por que CidadeIA
          </p>
          <h1 className="font-serif text-4xl font-bold mt-4">
            Gerir uma prefeitura não devia depender de planilha solta e sorte.
          </h1>
          <p className="text-muted text-base mt-4 leading-relaxed">
            O CidadeIA nasceu pra dar à gestão pública o mesmo tipo de ferramenta que
            só grande empresa privada tinha acesso: painel único, dado consolidado,
            IA aplicada — sem depender de uma equipe de TI própria pra rodar.
          </p>
        </section>
      </Reveal>

      <section className="max-w-5xl mx-auto px-4 sm:px-8 pb-14">
        <div className="grid md:grid-cols-2 gap-5">
          <Reveal direcao="right">
            <div className="h-full">
              <p className="text-xs font-semibold uppercase tracking-wide text-danger mb-3">
                A realidade hoje
              </p>
              <div className="space-y-3">
                {PROBLEMAS.map((texto) => (
                  <div key={texto} className="flex items-start gap-3 bg-card border border-border rounded-xl p-4">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ color: "var(--urgente)", background: "var(--urgente-tint)" }}>
                      <IconX className="w-3.5 h-3.5" />
                    </span>
                    <p className="text-sm text-muted leading-relaxed">{texto}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal direcao="left" delay={100}>
            <div className="h-full">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand mb-3">
                Com CidadeIA
              </p>
              <div className="space-y-3">
                {SOLUCOES.map((texto) => (
                  <div key={texto} className="flex items-start gap-3 bg-brand-tint border border-brand/15 rounded-xl p-4">
                    {/* Era um círculo branco: sobre o fundo escuro virava um
                        ponto aceso no meio do texto. O disco agora usa o
                        token da marca e funciona nos dois temas. */}
                    <span className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center shrink-0 mt-0.5">
                      <IconCheck className="w-3.5 h-3.5" />
                    </span>
                    <p className="text-sm leading-relaxed">{texto}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Reveal>
        <section className="max-w-3xl mx-auto px-4 sm:px-8 pb-16">
          <div className="bg-card border border-border rounded-2xl p-7 sm:p-9">
            <h2 className="font-serif text-2xl font-bold">O que a gente acredita</h2>
            <p className="text-sm text-muted mt-4 leading-relaxed">
              Prefeito bom não perde tempo caçando número — ele decide com o número na
              mão. É pra isso que o CidadeIA existe: tirar a gestão pública do papel e
              da planilha espalhada, com dashboards por secretaria, IA que só fala com
              dado real (nunca inventa) e relatórios prontos pra qualquer cobrança —
              seja do TCE, da imprensa ou da população.
            </p>
            <p className="text-sm text-muted mt-3 leading-relaxed">
              A plataforma é nova e está crescendo junto com cada prefeitura que
              confia nela — não vamos fingir uma história maior do que ela é. O que
              garantimos é: cada módulo já funciona de verdade, com os dados que você
              cadastra, sem promessa de "em breve".
            </p>
          </div>
        </section>
      </Reveal>

      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: "var(--gradient-hero)",
            backgroundSize: "220% 220%",
            animation: "shimmer-text 10s ease-in-out infinite alternate",
          }}
        />
        <Reveal>
          <div className="relative max-w-2xl mx-auto px-4 sm:px-8 py-16 text-center text-white">
            <h2 className="font-serif text-3xl font-bold">
              Sua gestão merece ver o próprio resultado com clareza.
            </h2>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
              {/* Era "Criar conta grátis" — conta que nasce sem módulo e cujo
                  botão de ativar aponta para um checkout inexistente. O
                  diagnóstico é a ação gratuita que funciona de verdade. */}
              <Link
                href="/diagnostico"
                className="group bg-white text-brand-dark font-semibold text-sm rounded-full px-6 py-3 hover:bg-white/90 transition inline-flex items-center gap-1.5"
              >
                Fazer o diagnóstico
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/precos"
                className="text-sm font-semibold text-white/90 hover:text-white transition underline underline-offset-4"
              >
                Ver módulos e preços
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
