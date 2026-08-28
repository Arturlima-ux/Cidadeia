import Link from "next/link";

const COLUNAS = [
  {
    titulo: "Produto",
    links: [
      { href: "/precos", label: "Preços" },
      { href: "/#modulos", label: "Módulos" },
      { href: "/#recursos", label: "Recursos" },
    ],
  },
  {
    titulo: "Empresa",
    links: [
      { href: "/por-que-cidadeia", label: "Por que CidadeIA" },
      { href: "/sobre", label: "Segurança & LGPD" },
      { href: "/faq", label: "Perguntas frequentes" },
      { href: "/suporte", label: "Suporte" },
    ],
  },
  {
    titulo: "Conta",
    links: [
      { href: "/login", label: "Entrar" },
      { href: "/cadastro", label: "Criar conta" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 grid sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <p className="font-serif text-lg font-bold">
            Cidade
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-hero)" }}>
              IA
            </span>
          </p>
          <p className="text-sm text-muted mt-2 leading-relaxed max-w-xs">
            Sistema operacional para prefeituras — dashboards, IA e relatórios num só lugar.
          </p>
        </div>
        {COLUNAS.map((c) => (
          <div key={c.titulo}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">{c.titulo}</p>
            <ul className="space-y-2">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted hover:text-foreground transition">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-5">
          <p className="text-xs text-muted">
            CidadeIA — feito para prefeituras brasileiras.
          </p>
        </div>
      </div>
    </footer>
  );
}
