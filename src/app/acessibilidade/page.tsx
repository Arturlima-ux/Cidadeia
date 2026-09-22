import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import Olho from "@/components/site/Olho";
import { compartilhamento } from "@/lib/seo";

// ── DECLARAÇÃO DE ACESSIBILIDADE ──
//
// O e-MAG (Modelo de Acessibilidade em Governo Eletrônico) pede que todo
// sítio público tenha uma página dizendo o que foi feito, o que falta e
// como reclamar. Aqui é só o que é verdade hoje: nada de "conformidade
// total" sem auditoria. O que ainda não foi verificado está escrito como
// não verificado — é mais crível, e é o que o jurídico da prefeitura
// espera ler.

export const metadata = compartilhamento({
  titulo: "Acessibilidade",
  descricao: "O que o CidadeIA e os portais das prefeituras fazem por acessibilidade, o que ainda falta e como avisar de uma barreira.",
  caminho: "/acessibilidade",
});

const FEITO = [
  "Navegação completa por teclado, com o foco sempre visível (contorno azul) em links, botões e campos.",
  "Link \"Pular para o conteúdo\" no início de cada página, para quem usa teclado ou leitor de tela não repetir o cabeçalho a cada página.",
  "Todo formulário — inclusive protocolo e ouvidoria do portal do cidadão — tem cada campo ligado ao seu rótulo, e as mensagens de erro são anunciadas ao leitor de tela.",
  "Contraste de texto e botões medido e mantido no mínimo de 4,5:1 (WCAG 2.1 nível AA), nos dois temas.",
  "Animações desligadas para quem configura o sistema com \"reduzir movimento\".",
  "Idioma declarado (português do Brasil), títulos únicos por página e um só título principal por tela.",
  "Nenhuma informação transmitida só por cor: prazo vencido, atrasado e urgente vêm com texto.",
  "Estrutura semântica: cabeçalho, navegação, conteúdo principal e rodapé marcados como tal.",
];

const FALTA = [
  "Auditoria completa com leitores de tela (NVDA, JAWS, VoiceOver) em todas as telas do painel interno.",
  "Verificação do modo de alto contraste do sistema operacional em todas as telas.",
  "Os mapas (unidades, escolas, obras) têm alternativa em lista, mas o mapa em si não é operável por teclado.",
  "Relatórios em PDF ainda não são marcados (PDF/UA).",
];

export default function AcessibilidadePage() {
  return (
    <div className="tema-noite min-h-screen">
      <SiteHeader />
      <main id="conteudo" className="max-w-3xl mx-auto px-4 sm:px-8 pt-14 sm:pt-20 pb-20">
        <Reveal>
          <Olho>Declaração de acessibilidade</Olho>
          <h1 className="font-serif text-[2rem] sm:text-[2.6rem] leading-[1.05] font-extrabold tracking-[-0.035em] mt-5">
            O que este site faz por quem acessa de outro jeito
          </h1>
          <p className="text-muted leading-relaxed mt-4">
            O CidadeIA e os portais públicos das prefeituras que ele hospeda seguem as Diretrizes de
            Acessibilidade para Conteúdo Web (WCAG 2.1) e o Modelo de Acessibilidade em Governo
            Eletrônico (e-MAG), como pedem a Lei Brasileira de Inclusão (Lei 13.146/2015, art. 63) e o
            Decreto 5.296/2004. Esta página diz o que já está feito, o que ainda falta e como avisar a
            gente de uma barreira. Atualizada em 21 de setembro de 2026.
          </p>
        </Reveal>

        <Reveal delay={80}>
          <section className="mt-10">
            <h2 className="font-serif text-xl font-bold">O que já está feito</h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {FEITO.map((t) => (
                <li key={t} className="flex gap-3 text-sm leading-relaxed">
                  <span aria-hidden="true" style={{ color: "var(--accent)" }} className="font-bold">
                    ✓
                  </span>
                  <span className="text-muted">{t}</span>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>

        <Reveal delay={140}>
          <section className="mt-10">
            <h2 className="font-serif text-xl font-bold">O que ainda não foi verificado</h2>
            <ul className="mt-4 flex flex-col gap-2.5">
              {FALTA.map((t) => (
                <li key={t} className="flex gap-3 text-sm leading-relaxed">
                  <span aria-hidden="true" className="text-muted font-bold">
                    –
                  </span>
                  <span className="text-muted">{t}</span>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>

        <Reveal delay={200}>
          <section className="mt-10 rounded-2xl border border-border p-6" style={{ background: "var(--card)" }}>
            <h2 className="font-serif text-xl font-bold">Encontrou uma barreira?</h2>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              Diga qual página, o que tentou fazer e com qual recurso (leitor de tela, teclado, zoom,
              alto contraste). A gente responde em até cinco dias úteis e corrige o que for do site.
            </p>
            <Link href="/suporte?assunto=acessibilidade" className="inline-block mt-4 text-sm font-semibold text-brand hover:underline">
              Avisar sobre uma barreira →
            </Link>
          </section>
        </Reveal>
      </main>
      <SiteFooter />
    </div>
  );
}
