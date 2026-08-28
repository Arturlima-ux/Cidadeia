"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import SidebarNav, { type NavItem } from "./SidebarNav";
import { IconSair } from "./icons";

function IconMenu({ aberto }: { aberto: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      {aberto ? (
        <path d="M6 6l12 12M18 6L6 18" />
      ) : (
        <path d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  );
}

export default function DashboardSidebar({
  grupos,
  prefeituraNome,
  sairAction,
}: {
  grupos: { titulo: string; itens: NavItem[] }[];
  prefeituraNome: string;
  sairAction: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();

  // Fecha o drawer automaticamente ao navegar pra uma nova página.
  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        className="md:hidden fixed top-3 left-3 z-50 w-10 h-10 rounded-full bg-card border border-border shadow-elevated flex items-center justify-center text-foreground"
      >
        <IconMenu aberto={aberto} />
      </button>

      {aberto && (
        <div
          aria-hidden
          onClick={() => setAberto(false)}
          className="md:hidden fixed inset-0 bg-black/40 z-40"
        />
      )}

      <aside
        className={`w-64 shrink-0 border-r border-border bg-card flex flex-col fixed inset-y-0 left-0 z-40 transition-transform duration-300 md:static md:translate-x-0 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link href="/dashboard/conta" className="px-5 py-5 border-b border-border block hover:bg-black/5 transition">
          <p className="font-serif text-lg font-bold tracking-tight">
            Cidade
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-hero)" }}
            >
              IA
            </span>
          </p>
          <p className="text-xs text-muted mt-1 truncate">{prefeituraNome}</p>
        </Link>
        <SidebarNav grupos={grupos} />
        <div className="px-3 py-4 border-t border-border">
          <form action={sairAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted hover:bg-black/5 hover:text-foreground transition"
            >
              <IconSair className="w-4 h-4 shrink-0" />
              Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
