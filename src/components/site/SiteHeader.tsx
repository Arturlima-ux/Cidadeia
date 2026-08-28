import Link from "next/link";

const LINKS = [
  { href: "/por-que-cidadeia", label: "Por que CidadeIA" },
  { href: "/precos", label: "Preços" },
  { href: "/#modulos", label: "Módulos" },
  { href: "/faq", label: "FAQ" },
  { href: "/sobre", label: "Segurança" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="font-serif text-lg font-bold tracking-tight">
          Cidade
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>
            IA
          </span>
        </Link>
        <nav className="hidden lg:flex items-center gap-5 text-sm text-muted">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-foreground transition">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold text-muted hover:text-foreground transition">
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="text-sm font-semibold bg-brand hover:bg-brand-dark text-white rounded-full px-4 py-2 transition"
          >
            Criar conta
          </Link>
        </div>
      </div>
    </header>
  );
}
