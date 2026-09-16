import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import Olho from "@/components/site/Olho";
import { compartilhamento } from "@/lib/seo";

// ── DEPOIS DA DEMONSTRAÇÃO ──
//
// Quem saía da demo caía na home, na mesma página que já tinha visto antes
// de entrar — como se nada tivesse acontecido. Aqui a conversa continua de
// onde parou: acabou de ver o painel funcionando, então os dois próximos
// passos naturais são ver o dado do SEU município e pedir a proposta dele.
//
// Página estática de propósito: a home não pode virar dinâmica só para ler
// um parâmetro de volta da demo.

export const metadata = compartilhamento({
  titulo: "Você viu o painel funcionando",
  descricao: "Os próximos passos depois da demonstração do CidadeIA: o Raio-X do seu município e a proposta.",
  caminho: "/demo/fim",
});

const PASSOS = [
  {
    titulo: "Veja o dado do seu município",
    texto:
      "O mesmo tipo de leitura que você acabou de ver, com os números que a sua prefeitura já publicou no Tesouro Nacional. Sem cadastro.",
    acao: "Abrir o Raio-X",
    href: "/raio-x",
    principal: false,
  },
  {
    titulo: "Peça a proposta da sua prefeitura",
    texto:
      "Escolha os módulos; o porte vem da população do IBGE, não de declaração. A proposta e o termo de referência, prontos para o jurídico, chegam em até um dia útil.",
    acao: "Montar proposta",
    href: "/proposta",
    principal: true,
  },
];

export default function FimDaDemoPage() {
  return (
    <div className="tema-noite min-h-screen">
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-8 pt-14 sm:pt-20 pb-20">
        <Reveal>
          <Olho>Demonstração encerrada</Olho>
          <h1 className="font-serif text-[2rem] sm:text-[2.6rem] leading-[1.05] font-extrabold tracking-[-0.035em] mt-5">
            Aquilo era a Prefeitura de Vila Nova. Falta a sua.
          </h1>
          <p className="text-muted leading-relaxed mt-4 max-w-[60ch]">
            Os números que você viu eram fictícios; as telas, os alertas e a base legal de cada
            frase são os do sistema de verdade. Dois caminhos a partir daqui:
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          {PASSOS.map((p, i) => (
            <Reveal key={p.href} delay={80 + i * 80}>
              <div className="h-full rounded-2xl border border-border p-6 flex flex-col" style={{ background: "var(--card)" }}>
                <h2 className="font-serif text-lg font-bold">{p.titulo}</h2>
                <p className="text-sm text-muted mt-2 leading-relaxed flex-1">{p.texto}</p>
                <Link
                  href={p.href}
                  className={
                    p.principal
                      ? "mt-5 text-center bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-5 py-3 transition shadow-elevated"
                      : "mt-5 text-center border border-border font-semibold text-sm rounded-xl px-5 py-3 transition hover:border-brand"
                  }
                >
                  {p.acao}&nbsp;&nbsp;→
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={240}>
          <p className="text-sm text-muted mt-8">
            Quer rever alguma tela?{" "}
            <Link href="/demo" className="font-semibold text-brand hover:underline">
              Entrar na demonstração de novo
            </Link>
            . Já pediu proposta?{" "}
            <Link href="/proposta/acompanhar" className="font-semibold text-brand hover:underline">
              Acompanhar o pedido
            </Link>
            .
          </p>
        </Reveal>
      </main>
      <SiteFooter />
    </div>
  );
}
