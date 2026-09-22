import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import Olho from "@/components/site/Olho";
import FormularioAcompanhar from "./FormularioAcompanhar";
import { compartilhamento } from "@/lib/seo";

// ── ONDE ESTÁ O MEU PEDIDO ──
// Sem conta e sem login: protocolo + e-mail. Existe porque o pedido saía da
// tela e sumia — o cliente só voltava a saber de algo quando a equipe
// escrevia.

export const metadata = compartilhamento({
  titulo: "Acompanhar pedido de proposta",
  descricao:
    "Consulte o andamento do seu pedido de proposta do CidadeIA com o protocolo e o e-mail informados. Sem login.",
  caminho: "/proposta/acompanhar",
});

export default async function AcompanharPage({ searchParams }: { searchParams: Promise<{ protocolo?: string }> }) {
  const { protocolo } = await searchParams;
  const inicial = (protocolo ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);

  return (
    <div className="tema-noite min-h-screen">
      <SiteHeader />
      <main id="conteudo" className="max-w-2xl mx-auto px-4 sm:px-8 pt-14 sm:pt-20 pb-20">
        <Reveal>
          <Olho>Pedido de proposta</Olho>
          <h1 className="font-serif text-[2rem] sm:text-[2.6rem] leading-[1.05] font-extrabold tracking-[-0.035em] mt-5">
            Onde está o seu pedido
          </h1>
          <p className="text-muted leading-relaxed mt-4">
            Informe o protocolo que apareceu quando você pediu a proposta e o e-mail que usou. Os
            dois juntos — é o que impede que o pedido de uma prefeitura seja visto por outra.
          </p>
        </Reveal>
        <div className="mt-8">
          <Reveal delay={100}>
            <FormularioAcompanhar protocoloInicial={inicial} />
          </Reveal>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
