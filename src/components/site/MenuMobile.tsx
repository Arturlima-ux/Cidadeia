"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ItemMenu } from "@/lib/menu-do-site";

// ── A NAVEGAÇÃO NO CELULAR ──
//
// Abaixo de 1024px a barra de links simplesmente sumia: quem abria o site
// no celular — e é assim que secretário e vereador abrem — via só a marca e
// dois botões. Os itens do menu — hoje Raio-X, Demonstração, Como
// contratar, Diagnóstico e FAQ — não existiam para essa pessoa. Aqui eles
// voltam, atrás de um botão, na mesma ordem do desktop (a lista chega por
// propriedade, de SiteHeader: uma fonte só para os dois).

export default function MenuMobile({ links, sessao }: { links: ItemMenu[]; sessao: boolean }) {
  const [aberto, setAberto] = useState(false);

  // Fechar com Esc e travar a rolagem do fundo enquanto o painel está aberto.
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", aoTeclar);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        className="flex items-center justify-center w-10 h-10 rounded-xl border border-border hover:border-brand transition"
      >
        <span className="sr-only">Menu</span>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          {aberto ? (
            <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {aberto && (
        <>
          {/* Ancorado no <header> (sticky, logo é bloco de contenção): fica
              exatamente embaixo dele em qualquer altura de tela, sem número
              mágico de pixels. */}
          <div
            className="absolute left-0 right-0 top-full border-b border-border shadow-elevated max-h-[70vh] overflow-y-auto"
            style={{ background: "var(--background)" }}
          >
            <nav className="max-w-[1200px] mx-auto px-4 sm:px-8 py-4 flex flex-col">
              {links.map((l) =>
                l.filhos ? (
                  // Produtos abre no lugar, com os módulos e o "conheça".
                  <details key={l.href} className="group border-b border-border">
                    <summary className="py-3 text-base font-medium flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      {l.label}
                      <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden className="transition-transform group-open:rotate-180">
                        <path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </summary>
                    <div className="pb-3 grid gap-4">
                      {l.filhos.map((g) => (
                        <div key={g.titulo}>
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted mb-1">{g.titulo}</p>
                          {g.links.map((f) => (
                            <Link
                              key={f.href}
                              href={f.href}
                              onClick={() => setAberto(false)}
                              className="block py-2 pl-3 text-sm hover:text-brand transition"
                            >
                              {f.label}
                            </Link>
                          ))}
                        </div>
                      ))}
                      <Link href={l.href} onClick={() => setAberto(false)} className="pl-3 text-sm font-semibold text-brand-claro">
                        Ver todos os produtos →
                      </Link>
                    </div>
                  </details>
                ) : (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setAberto(false)}
                    className="py-3 border-b border-border text-base font-medium hover:text-brand transition"
                  >
                    {l.label}
                  </Link>
                )
              )}
              <Link
                href={sessao ? "/dashboard" : "/login"}
                onClick={() => setAberto(false)}
                className="py-3 border-b border-border text-base font-medium hover:text-brand transition"
              >
                {sessao ? "Ir para o painel" : "Entrar"}
              </Link>
              <Link
                href="/proposta"
                onClick={() => setAberto(false)}
                className="mt-4 text-center bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-5 py-3 transition"
              >
                Receber proposta&nbsp;&nbsp;→
              </Link>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
