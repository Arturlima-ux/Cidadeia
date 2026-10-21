import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Olho from "@/components/site/Olho";
import { compartilhamento } from "@/lib/seo";

export const metadata = compartilhamento({
  titulo: "Carreiras",
  descricao: "Trabalhar no CidadeIA: o que a empresa faz, que tipo de gente procura e como deixar o seu contato.",
  caminho: "/carreiras",
});

// ── CARREIRAS, SEM VAGA INVENTADA ──
//
// A empresa é nova e não tem vaga aberta agora. Página de carreiras com
// vaga que não existe é a primeira coisa que um candidato sério confere, e
// a primeira mentira que ele encontra. Então a página diz o que é verdade:
// não há vaga aberta, este é o tipo de pessoa que vai fazer falta, e aqui
// se deixa o contato para quando houver.

const PERFIS = [
  {
    titulo: "Quem já viveu a prefeitura por dentro",
    texto: "Contador público, controlador interno, servidor de finanças ou de planejamento: quem sabe o que o RGF custa para fechar.",
  },
  {
    titulo: "Quem escreve software que não pode errar",
    texto: "Desenvolvimento web com TypeScript, dado público e testes. Aqui um número errado na tela vira apontamento do Tribunal.",
  },
  {
    titulo: "Quem conversa com prefeitura",
    texto: "Implantação, suporte e relacionamento com secretarias, com paciência para explicar a mesma regra do jeito de cada um.",
  },
];

export default function CarreirasPage() {
  return (
    <div className="tema-noite min-h-screen overflow-x-clip">
      <SiteHeader />
      <main id="conteudo">
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-14 sm:pt-24 pb-14">
          <Olho>Carreiras</Olho>
          <h1 className="titulo-pagina mt-5 max-w-[20ch]">Gestão pública, dado aberto e software que não pode errar.</h1>
          <p className="mt-6 text-lg text-muted leading-relaxed max-w-[62ch]">
            O CidadeIA lê o que as prefeituras já enviam ao Tesouro e avisa antes do limite, do prazo e do apontamento. É
            uma empresa nova, e cada pessoa que entra muda o produto de verdade.
          </p>
        </section>

        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-14">
          <div className="rounded-[24px] border border-border p-6 sm:p-8" style={{ background: "var(--card)" }}>
            <p className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--medio)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} aria-hidden />
              Nenhuma vaga aberta agora
            </p>
            <p className="mt-3 text-lg leading-relaxed max-w-[60ch]">
              Preferimos dizer isso a anunciar vaga que não existe. Quando abrir, ela aparece aqui primeiro. Enquanto isso,
              o contato que você deixar fica com a equipe.
            </p>
          </div>
        </section>

        <section className="border-t border-border" style={{ background: "var(--superficie)" }}>
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
            <h2 className="inicio-h2 max-w-[18ch]">Quem vai fazer falta.</h2>
            <ul className="mt-10 grid md:grid-cols-3 gap-8">
              {PERFIS.map((p) => (
                <li key={p.titulo} className="border-t border-border pt-5">
                  <p className="font-semibold tracking-[-0.01em]">{p.titulo}</p>
                  <p className="text-muted leading-relaxed mt-2">{p.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-8 items-center">
            <div>
              <h2 className="inicio-h2 max-w-[18ch]">Deixe o seu contato.</h2>
              <p className="text-muted mt-4 max-w-[52ch] leading-relaxed">
                Conte o que você faz e onde trabalhou com gestão pública, e mande o link do seu currículo ou LinkedIn. O
                assunto do e-mail já vai preenchido.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 lg:justify-end">
              <Link
                href="/fale-conosco?assunto=carreiras"
                className="elevar inline-block bg-brand hover:bg-brand-dark text-white font-semibold rounded-full px-7 py-3.5"
              >
                Enviar meu contato
              </Link>
              <Link href="/quem-somos" className="inicio-sublinhado text-muted self-center">
                Conhecer a empresa
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
