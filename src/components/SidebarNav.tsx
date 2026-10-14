"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
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
  // Um item só aceso: o de endereço mais específico. "Saúde" e "Qualidade
  // da APS" casam com /secretarias/saude/aps; acende só o segundo.
  const casa = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(href + "/");
  const ativoHref = grupos
    .flatMap((g) => g.itens.map((i) => i.href))
    .filter(casa)
    .sort((a, b) => b.length - a.length)[0];

  // ── AS SETAS DO TECLADO NO MENU ──
  // O menu rola sozinho, separado da página. Com o cursor em cima dele (ou o
  // foco num item), as setas para cima e para baixo rolam o MENU, e não a
  // página do lado. Com o foco num item, elas passam de um item para o outro.
  const menu = useRef<HTMLElement>(null);
  const sobre = useRef(false);
  useEffect(() => {
    function teclas(e: KeyboardEvent) {
      const nav = menu.current;
      if (!nav || e.altKey || e.ctrlKey || e.metaKey) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo?.closest("input, textarea, select, [contenteditable=true]")) return;
      const focoNoMenu = !!alvo && nav.contains(alvo);
      if (!sobre.current && !focoNoMenu) return;

      if (focoNoMenu && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        const links = [...nav.querySelectorAll<HTMLAnchorElement>("a[href]")];
        const i = links.indexOf(alvo as HTMLAnchorElement);
        const proximo = links[i + (e.key === "ArrowDown" ? 1 : -1)];
        if (proximo) {
          e.preventDefault();
          proximo.focus();
          proximo.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
        return;
      }
      const passo =
        e.key === "ArrowDown" ? 56 : e.key === "ArrowUp" ? -56 :
        e.key === "PageDown" ? nav.clientHeight * 0.85 : e.key === "PageUp" ? -nav.clientHeight * 0.85 :
        e.key === "Home" ? -nav.scrollHeight : e.key === "End" ? nav.scrollHeight : 0;
      if (!passo) return;
      e.preventDefault();
      // Seta: passo imediato, para segurar a tecla e o menu correr junto
      // (rolagem suave seguida se atropela e anda um passo só).
      nav.scrollBy({ top: passo, behavior: e.key.startsWith("Arrow") ? "auto" : "smooth" });
    }
    window.addEventListener("keydown", teclas);
    return () => window.removeEventListener("keydown", teclas);
  }, []);

  return (
    <nav
      ref={menu}
      onPointerEnter={() => {
        sobre.current = true;
      }}
      onPointerLeave={() => {
        sobre.current = false;
      }}
      className="flex-1 px-3 py-4 space-y-5 overflow-y-auto rolagem-discreta"
    >
      {grupos.map((grupo) => (
        <div key={grupo.titulo}>
          <p className="px-3 mb-1.5 text-xs font-semibold text-muted/80">
            {grupo.titulo}
          </p>
          <div className="space-y-0.5">
            {grupo.itens.map((item) => {
              const ativo = item.href === ativoHref;
              const Icone = ICONES[item.icone];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  // Sobe ANTES de navegar: assim a nova tela abre no topo.
                  // Fazer isso depois não bastava — o Next ajusta a rolagem
                  // por conta e desfazia o reset de forma intermitente.
                  onClick={() => window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })}
                  className={`relative flex items-center gap-2.5 pl-3 pr-3 py-2 text-sm transition ${
                    ativo
                      ? "arco-card-sm bg-brand-tint text-brand-legivel font-semibold"
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
