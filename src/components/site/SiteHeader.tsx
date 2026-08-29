import Link from "next/link";
import { MarcaCompleta } from "@/components/site/MarcaQuadra";

const LINKS = [
  { href: "/#solucoes", label: "Soluções" },
  { href: "/#como-contratar", label: "Como contratar" },
  { href: "/#conformidade", label: "Conformidade" },
  { href: "/precos", label: "Preços" },
  { href: "/por-que-cidadeia", label: "Quem somos" },
  { href: "/faq", label: "FAQ" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30">
      {/* Barra utilitária — é a assinatura do formato institucional: o
          cidadão e o servidor têm porta de entrada própria, separada da
          conversa comercial. */}
      <div
        className="text-white/75 text-xs"
        style={{ background: "var(--brand-profundo)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-2 flex items-center justify-between gap-4">
          <span className="hidden sm:inline">Atendimento: seg a sex, 8h às 18h</span>
          <div className="flex items-center gap-5 ml-auto">
            <Link href="/transparencia" className="hover:text-white transition">
              Portal do cidadão
            </Link>
            <Link href="/login" className="hover:text-white transition">
              Área do servidor
            </Link>
            <Link href="/suporte" className="text-white font-semibold hover:opacity-80 transition">
              Fale conosco
            </Link>
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-background/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-[74px] flex items-center justify-between gap-6">
          <Link href="/" aria-label="CidadeIA — início">
            <MarcaCompleta tamanho={30} />
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-muted">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-foreground transition">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/login"
              className="hidden sm:inline text-sm font-semibold hover:text-brand transition"
            >
              Entrar
            </Link>
            <Link
              href="/suporte?assunto=demonstracao"
              className="text-sm font-bold bg-brand hover:bg-brand-dark text-white rounded-xl px-4 sm:px-5 py-2.5 transition shadow-elevated"
            >
              Solicitar demonstração
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
