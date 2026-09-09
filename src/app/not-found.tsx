import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";

export const metadata = {
  title: "Página não encontrada — CidadeIA",
};

/**
 * 404 do site. Sem este arquivo o Next serve uma página nua — sem menu,
 * sem rodapé e sem nenhum caminho de volta: quem errasse a URL ficava preso.
 */
export default function NaoEncontrada() {
  return (
    // `tema-noite` porque o site inteiro é escuro. Sem isto o 404 aparecia
    // BRANCO, com o cabeçalho escuro por cima — quem erra um endereço já está
    // desconfiado, e uma página que parece de outro site confirma a desconfiança.
    //
    // Foi a fronteira de erro que teve o mesmo defeito, e passou despercebido
    // aqui pela mesma razão: ninguém abre o 404 de propósito.
    <div className="tema-noite min-h-screen bg-background flex flex-col">
      <SiteHeader />

      <main className="flex-1 flex items-center">
        <section className="max-w-xl mx-auto px-4 sm:px-8 py-20 text-center">
          <div
            aria-hidden
            className="arco-topo mx-auto mb-8 w-28 h-16 opacity-10"
            style={{ background: "var(--brand)" }}
          />

          <p className="font-serif text-6xl font-bold text-brand tabular-nums">404</p>

          <h1 className="font-serif text-3xl font-bold mt-4">
            Essa página não existe.
          </h1>

          <p className="text-muted mt-4 leading-relaxed">
            O endereço pode ter sido digitado errado, ou a página pode ter mudado
            de lugar. Nada aconteceu com os seus dados.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/"
              className="group bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full px-6 py-3 transition shadow-elevated inline-flex items-center gap-1.5"
            >
              Voltar para o início
              <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-foreground hover:text-brand transition"
            >
              Ir para o painel
            </Link>
          </div>

          <p className="text-xs text-muted mt-10">
            Se você chegou aqui por um link do próprio sistema,{" "}
            <Link href="/suporte" className="font-semibold text-brand hover:underline">
              avise a gente
            </Link>{" "}
            — é um erro nosso, não seu.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
