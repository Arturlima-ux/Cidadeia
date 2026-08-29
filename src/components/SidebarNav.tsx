"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconVisaoGeral,
  IconIA,
  IconCentral,
  IconSaude,
  IconEducacao,
  IconObras,
  IconLicitacoes,
  IconHistorico,
  IconAlertas,
  IconConfiguracoes,
  IconModulos,
  IconDownload,
} from "@/components/icons";

const ICONES = {
  "visao-geral": IconVisaoGeral,
  ia: IconIA,
  central: IconCentral,
  saude: IconSaude,
  educacao: IconEducacao,
  obras: IconObras,
  licitacoes: IconLicitacoes,
  historico: IconHistorico,
  alertas: IconAlertas,
  configuracoes: IconConfiguracoes,
  modulos: IconModulos,
  download: IconDownload,
} as const;

export type IconKey = keyof typeof ICONES;

export type NavItem = { href: string; label: string; icone: IconKey };

export default function SidebarNav({
  grupos,
}: {
  grupos: { titulo: string; itens: NavItem[] }[];
}) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
      {grupos.map((grupo) => (
        <div key={grupo.titulo}>
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted/80">
            {grupo.titulo}
          </p>
          <div className="space-y-0.5">
            {grupo.itens.map((item) => {
              const ativo =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              const Icone = ICONES[item.icone];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2.5 pl-3 pr-3 py-2 text-sm transition ${
                    ativo
                      ? "arco-card-sm bg-brand-tint text-brand-dark font-semibold"
                      : "rounded-lg text-foreground/80 hover:bg-brand-tint/50 hover:text-foreground"
                  }`}
                >
                  {ativo && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-brand" />
                  )}
                  <Icone
                    className={`w-4 h-4 shrink-0 ${ativo ? "text-brand" : "text-foreground/50"}`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
