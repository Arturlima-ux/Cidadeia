import Link from "next/link";
import BotaoPainelTeste from "./teste/BotaoPainelTeste";

// ── O MENU DA MESA DA EQUIPE ──
//
// Cada página do admin tinha o seu menu, numa ordem diferente e numa linha só
// que não quebrava: no celular, "Caixa de saída" virava três linhas, os itens
// seguintes saíam da tela e esticavam a página para o lado (o fundo escuro
// acabava no meio e o resto ficava branco). Agora o menu é um só, em abas.
// No celular a faixa de abas rola para o lado dentro dela mesma, sem esticar
// a página; a partir do tablet, as abas quebram linha normalmente.

const ITENS = [
  { href: "/admin/pedidos", rotulo: "Pedidos" },
  { href: "/admin/interessados", rotulo: "Interessados" },
  { href: "/admin/financeiro", rotulo: "Financeiro" },
  { href: "/admin/clientes", rotulo: "Clientes" },
  { href: "/admin/saida", rotulo: "Caixa de saída" },
  { href: "/admin/medicao", rotulo: "Medição" },
] as const;

export type PaginaAdmin = (typeof ITENS)[number]["href"];

export default function NavAdmin({ atual, comPainelDeTeste = false }: { atual: PaginaAdmin; comPainelDeTeste?: boolean }) {
  return (
    <nav aria-label="Mesa da equipe" className="basis-[calc(100%+2rem)] sm:basis-auto -mx-4 sm:mx-0 min-w-0">
      <ul className="flex items-center gap-2 overflow-x-auto sm:flex-wrap px-4 sm:px-0 pb-1 after:content-[''] after:shrink-0 after:w-2 sm:after:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ITENS.map((i) => {
          const ativo = i.href === atual;
          return (
            <li key={i.href} className="shrink-0">
              <Link
                href={i.href}
                aria-current={ativo ? "page" : undefined}
                className={`block whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${
                  ativo ? "border-brand bg-brand-tint text-brand font-semibold" : "border-border text-muted hover:text-foreground hover:border-foreground/30"
                }`}
              >
                {i.rotulo}
              </Link>
            </li>
          );
        })}
        {comPainelDeTeste && (
          <li className="shrink-0 whitespace-nowrap">
            <BotaoPainelTeste />
          </li>
        )}
      </ul>
    </nav>
  );
}
