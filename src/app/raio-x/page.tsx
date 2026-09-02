import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import FormularioRaioX from "./FormularioRaioX";

export const metadata = {
  title: "Raio-X do município — CidadeIA",
  description:
    "Digite o nome da cidade e veja os números reais dela, puxados na hora do Tesouro Nacional. Sem cadastro.",
};

export default function RaioXPage() {
  return (
    <div className="tema-noite min-h-screen">
      <SiteHeader />

      <section className="max-w-4xl mx-auto px-4 sm:px-8 pt-14 sm:pt-20 pb-8">
        <Reveal>
          <span
            className="inline-flex items-center gap-2.5 text-xs font-mono uppercase tracking-[0.16em]"
            style={{ color: "var(--brand-claro)" }}
          >
            <span className="block w-6 h-px" style={{ background: "currentColor" }} />
            Sem cadastro · consulta ao vivo
          </span>

          <h1 className="font-serif text-[2.6rem] leading-[1.0] sm:text-[3.3rem] sm:leading-[0.98] font-extrabold tracking-[-0.045em] mt-6 max-w-[16ch]">
            O que já se sabe sobre a sua prefeitura.
          </h1>

          <p className="text-muted text-base sm:text-lg leading-relaxed mt-6 max-w-[56ch]">
            Digite o nome do município e a tela enche com os números que a
            própria prefeitura publicou no Tesouro Nacional — receita, quanto
            foi aplicado em cada área e quais relatórios obrigatórios estão
            faltando. Você não precisa nos contar nada.
          </p>
        </Reveal>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-8 pb-20 sm:pb-28">
        <Reveal delay={120}>
          <FormularioRaioX />
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}
