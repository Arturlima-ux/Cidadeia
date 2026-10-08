import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Olho from "@/components/site/Olho";
import BarrasPanorama from "@/components/site/BarrasPanorama";
import PecaUmaLigacao from "@/components/site/PecaUmaLigacao";
import { linkWhatsappComercial } from "@/lib/contato-comercial";
import { CARGOS } from "@/lib/cargos";
import { compartilhamento } from "@/lib/seo";

export const metadata = compartilhamento({
  titulo: "Por que CidadeIA",
  descricao:
    "O Tribunal de Contas olha para trás; o CidadeIA olha para a frente. Software de conformidade que lê o Tesouro Nacional e avisa a prefeitura antes do limite, do prazo e do apontamento.",
  caminho: "/por-que-cidadeia",
});

// ── UM POSICIONAMENTO SÓ ──
//
// Esta página falava de "painel único, IA aplicada" e prometia protocolo pelo
// WhatsApp, que o produto não tem. Era outro produto, genérico, contando
// outra história que a home. Agora diz a mesma coisa que o resto do site: o
// CidadeIA é software de conformidade. O Tribunal de Contas julga depois que
// o exercício fechou; o CidadeIA lê o mesmo dado enquanto ainda dá tempo.
// Cada "com o CidadeIA" abaixo existe hoje (lib/modulos-detalhe.ts).

const ANTES_E_DEPOIS = [
  {
    tema: "Despesa com pessoal",
    sem: "A prefeitura descobre que entrou no limite prudencial quando o alerta do Tribunal chega, e as nomeações já estavam feitas.",
    com: "A régua da LRF a cada RGF, com as vedações que já valem na faixa e o cronograma de recondução quando passa do limite.",
  },
  {
    tema: "Prazos do RREO e do RGF",
    sem: "O atraso aparece quando a transferência voluntária trava.",
    com: "Conferência diária no Tesouro e aviso por e-mail 15 dias antes do prazo e no dia em que atrasar.",
  },
  {
    tema: "Números do relatório",
    sem: "Número que não fecha vira apontamento e retificação.",
    com: "O aviso chega antes, enquanto a correção ainda é um assunto interno.",
  },
  {
    tema: "Saúde e educação",
    sem: "Os mínimos de 15% e 25% conferidos em dezembro, sem tempo de ajustar.",
    com: "Quanto falta aplicar e quanto o ritmo mensal precisa subir, durante o ano.",
  },
  {
    tema: "Transparência e ouvidoria",
    sem: "Portal atualizado à mão quando sobra tempo, e prazo da LAI contado no calendário de parede.",
    com: "Portal no ar e cada manifestação com protocolo e prazo legal contado, com aviso antes de vencer.",
  },
];

const PRINCIPIOS = [
  {
    titulo: "Só dado oficial.",
    texto:
      "Tesouro Nacional, IBGE, PNCP, DataSUS e INEP. Quando a fonte não respondeu, a tela diz isso; ela nunca preenche o vazio com estimativa.",
  },
  {
    titulo: "Regra com artigo ao lado.",
    texto:
      "Os avisos fiscais saem de regra fixa, com a base legal escrita. A inteligência artificial só sugere, e nada vira alerta oficial sem uma pessoa aprovar.",
  },
  {
    titulo: "Sem vender o que não existe.",
    texto:
      "A empresa é nova e não vai fingir uma história maior do que ela é. Cada módulo do site funciona hoje, e você confere antes de contratar.",
  },
];

export default function PorQueCidadeIAPage() {
  return (
    <div className="tema-noite min-h-screen overflow-x-clip">
      <SiteHeader />
      <main id="conteudo">
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-14 sm:pt-24 pb-14">
          <Olho>Por que CidadeIA</Olho>
          <h1 className="titulo-pagina mt-5 max-w-[20ch]">
            O Tribunal de Contas olha para trás. O CidadeIA olha para a frente.
          </h1>
          <p className="mt-6 text-lg text-muted leading-relaxed max-w-[62ch]">
            O Tribunal julga as contas depois que o exercício fechou, quando o limite já estourou e o prazo já venceu.
            O CidadeIA lê o mesmo dado, no Tesouro Nacional, enquanto ainda dá para corrigir. Não substitui a
            contabilidade nem a assessoria jurídica: é o aviso que chega antes do apontamento.
          </p>
        </section>

        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-16 sm:pb-24">
          <div className="rounded-[28px] border border-border overflow-hidden">
            <div className="hidden md:grid grid-cols-[minmax(0,3fr)_minmax(0,4fr)_minmax(0,4fr)] text-sm text-muted" style={{ background: "var(--superficie)" }}>
              <p className="px-6 py-4">Onde</p>
              <p className="px-6 py-4">Sem aviso</p>
              <p className="px-6 py-4" style={{ color: "var(--brand-claro)" }}>
                Com o CidadeIA
              </p>
            </div>
            {ANTES_E_DEPOIS.map((l) => (
              <div
                key={l.tema}
                className="grid md:grid-cols-[minmax(0,3fr)_minmax(0,4fr)_minmax(0,4fr)] border-t border-border first:border-t-0 md:first:border-t"
              >
                <p className="px-6 pt-5 md:py-5 font-semibold tracking-[-0.01em]">{l.tema}</p>
                <p className="px-6 pt-2 md:py-5 text-muted leading-relaxed">
                  <span className="md:hidden text-xs uppercase tracking-wide block mb-1">Sem aviso</span>
                  {l.sem}
                </p>
                <p className="px-6 pt-3 pb-5 md:py-5 leading-relaxed">
                  <span className="md:hidden text-xs uppercase tracking-wide block mb-1" style={{ color: "var(--brand-claro)" }}>
                    Com o CidadeIA
                  </span>
                  {l.com}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-16 sm:pb-24">
          <h2 className="inicio-h2 max-w-[20ch]">Não é hipótese. É o que o Tesouro mostra hoje.</h2>
          <div className="mt-8">
            <BarrasPanorama />
          </div>
        </section>

        <section className="border-t border-border" style={{ background: "var(--superficie)" }}>
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
            <h2 className="inicio-h2 max-w-[18ch]">O que a gente não negocia.</h2>
            <ul className="mt-10 grid md:grid-cols-3 gap-8">
              {PRINCIPIOS.map((p) => (
                <li key={p.titulo} className="border-t border-border pt-5">
                  <p className="font-semibold tracking-[-0.01em]">{p.titulo}</p>
                  <p className="text-muted leading-relaxed mt-2">{p.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <h2 className="inicio-h2 max-w-[18ch]">Três pessoas assinam o RGF.</h2>
          <p className="text-muted mt-4 max-w-[60ch] leading-relaxed">
            O prefeito, quem responde pelas finanças e o controle interno (LRF, art. 54). Cada um tem a sua página, com o
            que está em jogo para ele.
          </p>
          <ul className="mt-8 grid md:grid-cols-3 gap-4">
            {CARGOS.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/para/${c.slug}`}
                  className="group block h-full rounded-2xl border border-border hover:border-brand p-6 transition"
                  style={{ background: "var(--card)" }}
                >
                  <p className="font-semibold">{c.rotulo}</p>
                  <p className="text-sm text-muted leading-relaxed mt-2">{c.chamada}</p>
                  <p className="text-sm mt-4" style={{ color: "var(--brand-claro)" }}>
                    Ver a página <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-20 sm:pb-28">
          <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 lg:gap-16 items-start">
            <div>
              <h2 className="inicio-h2 max-w-[16ch]">Comece pelo número da sua cidade.</h2>
              <p className="text-muted mt-5 leading-relaxed max-w-[44ch]">
                O Raio-X é aberto e não pede cadastro. Quando quiser o processo de contratação, a proposta chega em um
                dia útil.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Link
                  href="/proposta"
                  className="elevar inline-block bg-brand hover:bg-brand-dark text-white font-semibold rounded-full px-7 py-3.5"
                >
                  Receber a proposta
                </Link>
                <Link href="/raio-x" className="inicio-sublinhado text-muted">
                  Ver o Raio-X
                </Link>
              </div>
            </div>
            <div id="atendimento" className="scroll-mt-24">
              <PecaUmaLigacao
                origem="Por que CidadeIA"
                linkWhatsapp={linkWhatsappComercial("Olá! Vim pelo site do CidadeIA e queria conversar sobre a minha prefeitura.")}
              />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
