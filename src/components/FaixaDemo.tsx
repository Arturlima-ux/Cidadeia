"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * A faixa fixa da demonstração, e o guarda que explica o que está travado.
 *
 * O proxy já recusa toda gravação com 403 — é a proteção de verdade. Mas um
 * 403 cru vira "Algo deu errado" na tela, e o visitante entende que o
 * sistema quebrou. Este componente intercepta o envio de qualquer formulário
 * e o clique em qualquer link de download ANTES de sair do navegador, e diz
 * em uma linha por que não vai: "na demonstração, isto fica desligado".
 * Quem desligar o JavaScript ainda bate no proxy; a proteção não é aqui.
 */
export default function FaixaDemo() {
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    function avisar(texto: string) {
      setAviso(texto);
      window.clearTimeout((avisar as unknown as { t?: number }).t);
      (avisar as unknown as { t?: number }).t = window.setTimeout(() => setAviso(null), 4000);
    }
    function aoEnviar(e: Event) {
      e.preventDefault();
      e.stopPropagation();
      avisar("Na demonstração nada é gravado — este botão fica desligado.");
    }
    function aoClicar(e: MouseEvent) {
      const alvo = (e.target as HTMLElement | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!alvo) return;
      const href = alvo.getAttribute("href") ?? "";
      if (href.startsWith("/api/relatorios") || href.startsWith("/api/exportacao")) {
        e.preventDefault();
        avisar("Relatório e exportação ficam desligados na demonstração — os dados são fictícios.");
      }
    }
    document.addEventListener("submit", aoEnviar, true);
    document.addEventListener("click", aoClicar, true);
    return () => {
      document.removeEventListener("submit", aoEnviar, true);
      document.removeEventListener("click", aoClicar, true);
    };
  }, []);

  return (
    <>
      <div
        className="sticky top-0 z-40 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 sm:px-6 py-2.5 text-sm border-b"
        style={{ background: "rgba(255,184,77,.14)", borderColor: "rgba(255,184,77,.45)" }}
      >
        <span
          className="font-mono text-[11px] font-semibold tracking-[0.14em] rounded-md px-2 py-0.5"
          style={{ background: "#ffb84d", color: "#1a1300" }}
        >
          DEMONSTRAÇÃO
        </span>
        <span>
          Prefeitura de Vila Nova é fictícia.{" "}
          <span className="text-muted">Navegue por tudo; nada aqui pode ser alterado.</span>
        </span>
        <span className="ml-auto flex items-center gap-2">
          <a href="/sessao-encerrada?demo=1" className="text-xs text-muted hover:text-foreground transition mr-1">
            Sair
          </a>
          <Link
            href="/raio-x"
            className="text-xs font-semibold rounded-lg border border-border px-3 py-1.5 hover:border-brand transition"
          >
            Ver o Raio-X do meu município
          </Link>
          <Link
            href="/proposta"
            className="text-xs font-semibold rounded-lg px-3 py-1.5 bg-brand text-white hover:bg-brand-dark transition"
          >
            Pedir proposta →
          </Link>
        </span>
      </div>
      {aviso && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-md text-sm rounded-xl px-4 py-3 shadow-elevated border"
          style={{ background: "var(--card)", borderColor: "rgba(255,184,77,.45)" }}
        >
          {aviso}
        </div>
      )}
    </>
  );
}
