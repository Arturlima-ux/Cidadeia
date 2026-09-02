"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ── MODO APRESENTAÇÃO ──
//
// Uma tela para o gabinete do prefeito ou para uma sessão na câmara: painéis
// grandes que trocam sozinhos, sem mouse e sem operador.
//
// A regra que muda o desenho: ninguém opera isto. Não há botão dentro dos
// painéis, o texto é grande o suficiente para ser lido do fundo da sala, e um
// painel sem dado diz que não há dado em vez de mostrar zero — num telão, zero
// vira notícia, e notícia errada numa sessão pública é difícil de desfazer.

export type PainelTelao = {
  chave: string;
  rotulo: string;
  valor: string;
  /** Explica o número. Aparece embaixo, menor. */
  contexto: string | null;
  /** Muda a cor do número. Semântico, não decorativo. */
  tom: "neutro" | "bom" | "atencao" | "ruim";
  /** true quando o dado não existe — o painel diz isso em vez de exibir zero. */
  semDado: boolean;
};

const COR: Record<PainelTelao["tom"], string> = {
  neutro: "var(--foreground)",
  bom: "var(--info)",
  atencao: "var(--medio)",
  ruim: "var(--urgente)",
};

const SEGUNDOS_POR_PAINEL = 12;

export default function Telao({
  paineis,
  municipio,
}: {
  paineis: PainelTelao[];
  municipio: string;
}) {
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [restante, setRestante] = useState(SEGUNDOS_POR_PAINEL);

  useEffect(() => {
    if (pausado || paineis.length <= 1) return;
    const id = setInterval(() => {
      setRestante((r) => {
        if (r <= 1) {
          setAtual((a) => (a + 1) % paineis.length);
          return SEGUNDOS_POR_PAINEL;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [pausado, paineis.length]);

  // Espaço pausa e retoma: numa sessão da câmara alguém vai querer segurar um
  // número enquanto fala sobre ele, e procurar o mouse no meio da fala é pior
  // do que a tela trocar.
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.code === "Space") {
        e.preventDefault();
        setPausado((p) => !p);
      }
      if (e.code === "ArrowRight") {
        setAtual((a) => (a + 1) % paineis.length);
        setRestante(SEGUNDOS_POR_PAINEL);
      }
      if (e.code === "ArrowLeft") {
        setAtual((a) => (a - 1 + paineis.length) % paineis.length);
        setRestante(SEGUNDOS_POR_PAINEL);
      }
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [paineis.length]);

  if (paineis.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="font-serif text-3xl font-bold">Nada para apresentar ainda</p>
        <p className="text-muted max-w-md leading-relaxed">
          O telão mostra os números que já estão cadastrados. Preencha os
          indicadores das secretarias e a base dos mínimos constitucionais para
          esta tela ganhar conteúdo.
        </p>
        <Link href="/dashboard" className="text-brand font-semibold hover:underline mt-2">
          Voltar ao painel
        </Link>
      </div>
    );
  }

  const painel = paineis[atual];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-8 sm:px-12 py-6">
        <p className="font-serif text-lg sm:text-xl font-bold">{municipio}</p>
        <Link
          href="/dashboard"
          className="text-sm text-muted hover:text-foreground transition"
        >
          Sair do modo apresentação
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <p className="text-sm sm:text-base font-semibold uppercase tracking-[0.2em] text-muted">
          {painel.rotulo}
        </p>

        {painel.semDado ? (
          <p className="font-serif text-4xl sm:text-6xl font-bold mt-8 text-muted max-w-[16ch] leading-tight">
            Sem dado cadastrado
          </p>
        ) : (
          <p
            className="font-serif font-extrabold tracking-[-0.04em] tabular-nums mt-6 leading-none"
            style={{ color: COR[painel.tom], fontSize: "clamp(4rem, 18vw, 14rem)" }}
          >
            {painel.valor}
          </p>
        )}

        {painel.contexto && (
          <p className="text-base sm:text-2xl text-muted mt-8 max-w-[26ch] sm:max-w-[34ch] leading-snug">
            {painel.contexto}
          </p>
        )}
      </main>

      <footer className="px-8 sm:px-12 py-8 flex items-center justify-between gap-6">
        <div className="flex items-center gap-2.5" aria-hidden>
          {paineis.map((p, i) => (
            <span
              key={p.chave}
              className="rounded-full transition-all"
              style={{
                width: i === atual ? 28 : 8,
                height: 8,
                background: i === atual ? "var(--brand)" : "var(--border)",
              }}
            />
          ))}
        </div>

        <p className="text-xs sm:text-sm text-muted tabular-nums">
          {pausado ? "pausado · espaço para voltar" : `troca em ${restante}s · espaço para pausar`}
        </p>
      </footer>
    </div>
  );
}
