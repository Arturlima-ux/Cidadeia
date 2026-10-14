"use client";

import Link from "next/link";
import { useRef } from "react";
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
  // O menu rola sozinho, separado da página. O navegador já rola com as
  // setas o que estiver com o foco, de forma suave e na ordem certa. Então,
  // quando o cursor entra no menu, o foco vai para o menu (sem pular nada
  // na tela), e as setas passam a rolar ele, e não a página.
  //
  // A primeira versão rolava à mão, de 56 em 56 pixels, e pulava o foco de
  // link em link: travava ao segurar a tecla e o foco saía da ordem. O foco
  // só é puxado quando ninguém está digitando: um campo aberto na página
  // nunca perde o foco por causa do cursor passando no menu.
  const menu = useRef<HTMLElement>(null);
  function focarMenu() {
    const nav = menu.current;
    const ativo = document.activeElement as HTMLElement | null;
    if (!nav || (ativo && nav.contains(ativo))) return;
    if (ativo?.closest("input, textarea, select, [contenteditable=true]")) return;
    nav.focus({ preventScroll: true });
  }
  // Cursor saiu do menu: as setas voltam para a página, mesmo que o último
  // clique tenha sido num item do menu.
  function soltarMenu() {
    const ativo = document.activeElement as HTMLElement | null;
    if (ativo && menu.current?.contains(ativo)) ativo.blur();
  }

  return (
    <nav
      ref={menu}
      tabIndex={-1}
      aria-label="Menu do painel"
      onPointerEnter={focarMenu}
      onPointerLeave={soltarMenu}
      className="menu-painel flex-1 px-3 py-4 space-y-5 overflow-y-auto rolagem-discreta"
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
