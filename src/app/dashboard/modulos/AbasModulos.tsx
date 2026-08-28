import Link from "next/link";

export default function AbasModulos({ ativa }: { ativa: "meus" | "marketplace" }) {
  const abas = [
    { id: "meus" as const, href: "/dashboard/modulos", label: "Meus módulos" },
    { id: "marketplace" as const, href: "/dashboard/modulos/marketplace", label: "Marketplace" },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-border">
      {abas.map((a) => (
        <Link
          key={a.id}
          href={a.href}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
            ativa === a.id
              ? "border-brand text-brand"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          {a.label}
        </Link>
      ))}
    </div>
  );
}
