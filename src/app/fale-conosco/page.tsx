import { Suspense } from "react";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Olho from "@/components/site/Olho";
import PecaUmaLigacao from "@/components/site/PecaUmaLigacao";
import ContatoEmail from "@/components/site/ContatoEmail";
import { linkWhatsappComercial } from "@/lib/contato-comercial";
import { compartilhamento } from "@/lib/seo";

export const metadata = compartilhamento({
  titulo: "Fale conosco",
  descricao: "Peça uma ligação ou escreva para a equipe do CidadeIA. Para a sua prefeitura, para o jurídico ou para o suporte.",
  caminho: "/fale-conosco",
});

// ── FALE CONOSCO: OS CANAIS QUE EXISTEM, E SÓ ELES ──
//
// A ligação é o canal principal (prefeitura resolve por telefone), e o
// e-mail vem ao lado. O WhatsApp só aparece quando o número comercial está
// configurado na Vercel; sem ele, nenhum botão promete um canal que não há.

export default async function FaleConoscoPage({
  searchParams,
}: {
  searchParams: Promise<{ [chave: string]: string | string[] | undefined }>;
}) {
  const { assunto } = await searchParams;
  const chave = typeof assunto === "string" ? assunto : null;

  return (
    <div className="tema-noite min-h-screen overflow-x-clip">
      <SiteHeader />
      <main id="conteudo">
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-14 sm:pt-24 pb-10">
          <Olho>Fale conosco</Olho>
          <h1 className="titulo-pagina mt-5 max-w-[18ch]">Fale com quem faz o CidadeIA.</h1>
          <p className="mt-6 text-lg text-muted leading-relaxed max-w-[58ch]">
            Sem central de atendimento e sem apresentação de vendas: quem atende é a equipe que constrói o sistema. A
            ligação é em dia útil, no horário que você escolher.
          </p>
        </section>

        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-16">
          <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-6 items-start">
            <div id="atendimento" className="scroll-mt-24 min-w-0">
              <PecaUmaLigacao
                origem="Fale conosco"
                linkWhatsapp={linkWhatsappComercial("Olá! Vim pelo site do CidadeIA e queria falar com a equipe.")}
              />
            </div>
            <div className="rounded-[24px] border border-border p-6 min-w-0" style={{ background: "var(--card)" }}>
              <p className="font-semibold">Prefere escrever?</p>
              <p className="text-sm text-muted mt-1 mb-4 leading-relaxed">O e-mail chega direto à equipe.</p>
              <Suspense fallback={null}>
                <ContatoEmail chave={chave} />
              </Suspense>
            </div>
          </div>
        </section>

        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-20 sm:pb-28">
          <ul className="grid sm:grid-cols-3 gap-4">
            {[
              { href: "/proposta", titulo: "Quero uma proposta", texto: "Valor, termo de referência e minuta de contrato em um dia útil." },
              { href: "/suporte", titulo: "Já sou cliente", texto: "Problema de acesso, dúvida de uso ou pedido para a sua conta." },
              { href: "/transparencia", titulo: "Sou morador", texto: "Protocolo, ouvidoria e pedido de informação vão direto à sua prefeitura, pelo portal." },
            ].map((c) => (
              <li key={c.href}>
                <Link
                  href={c.href}
                  className="group block h-full rounded-2xl border border-border hover:border-brand p-6 transition"
                  style={{ background: "var(--card)" }}
                >
                  <p className="font-semibold">{c.titulo}</p>
                  <p className="text-sm text-muted leading-relaxed mt-2">{c.texto}</p>
                  <p className="text-sm mt-4" style={{ color: "var(--brand-claro)" }}>
                    Seguir <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
