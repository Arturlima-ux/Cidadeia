"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Link from "next/link";
import type { PlanoAddon } from "@/lib/planos";

// ── BENTO GRID, E ONDE O `motion` GANHA O PESO QUE CUSTA ──
//
// A biblioteca são ~34 KB a mais na página que responde em 0,29 s, então ela
// precisa fazer o que CSS não faz. Faz duas coisas aqui:
//
//   `layoutId`  o realce da aba ativa VIAJA de uma aba para a outra, em vez
//               de sumir e reaparecer. É transição de layout compartilhado, e
//               não há como fazer em CSS sem medir posição à mão;
//   `AnimatePresence`  o conteúdo antigo sai enquanto o novo entra, com saída
//               animada — CSS sozinho não anima elemento que já foi removido
//               da árvore.
//
// Todo o resto (luz na borda, elevação, entrada ao rolar) continua em CSS,
// porque ali o navegador já faz melhor e de graça.
//
// ── A GRADE NÃO É DECORATIVA ──
//
// Os tiles têm tamanhos diferentes porque os módulos têm pesos diferentes: as
// duas bases — o portal e a gestão — ocupam o dobro, e as quatro secretarias
// entram como quadrados. Bento em que todo tile tem o mesmo tamanho é só uma
// grade com cantos arredondados.

export type ModuloBento = {
  chave: PlanoAddon;
  nome: string;
  resumo: string;
  capacidades: string[];
  automacao: string | null;
  href: string;
  /** Qual slot da paleta identifica este módulo em todo o produto. */
  serie: number;
  /** Tiles maiores para as duas bases. */
  largo: boolean;
};

export default function BentoModulos({ modulos }: { modulos: ModuloBento[] }) {
  const [ativo, setAtivo] = useState<PlanoAddon | null>(null);
  const semMovimento = useReducedMotion();

  const aberto = modulos.find((m) => m.chave === ativo) ?? null;

  return (
    <div>
      {/* ── AS ABAS ── */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Módulos">
        {modulos.map((m) => {
          const selecionado = ativo === m.chave;
          return (
            <button
              key={m.chave}
              role="tab"
              aria-selected={selecionado}
              onClick={() => setAtivo(selecionado ? null : m.chave)}
              // Contorno quando não está ativa. Sem ele a fileira lia como uma
              // lista de palavras soltas, e ninguém descobria que são
              // controles — a pílula só aparecia depois do clique que nunca
              // acontecia.
              className="relative rounded-full px-4 py-2 text-sm font-semibold transition border"
              style={{
                color: selecionado ? "var(--sobre-forte)" : "var(--foreground)",
                borderColor: selecionado ? "transparent" : "var(--border)",
              }}
            >
              {/* O realce viaja entre as abas porque as duas compartilham o
                  mesmo layoutId. É o único motivo de a biblioteca estar aqui. */}
              {selecionado && (
                <motion.span
                  layoutId="aba-ativa"
                  className="absolute inset-0 rounded-full"
                  style={{ background: `var(--serie-${m.serie})` }}
                  transition={
                    semMovimento
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 420, damping: 34 }
                  }
                />
              )}
              <span className="relative z-10">{m.nome}</span>
            </button>
          );
        })}
      </div>

      {/* ── O DETALHE DA ABA ABERTA ── */}
      <AnimatePresence mode="wait" initial={false}>
        {aberto && (
          <motion.div
            key={aberto.chave}
            initial={semMovimento ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={semMovimento ? { opacity: 1 } : { opacity: 0, y: -8 }}
            transition={{ duration: semMovimento ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 rounded-2xl border border-border p-6"
            style={{ background: "var(--card)" }}
          >
            <p className="text-sm leading-relaxed max-w-[64ch]">{aberto.resumo}</p>
            <ul className="mt-4 grid sm:grid-cols-2 gap-x-8 gap-y-2">
              {aberto.capacidades.map((c) => (
                <li key={c} className="text-sm text-muted flex gap-2.5">
                  <span
                    aria-hidden
                    className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: `var(--serie-${aberto.serie})` }}
                  />
                  {c}
                </li>
              ))}
            </ul>
            {aberto.automacao && (
              <p className="text-xs text-muted mt-4 pt-3 border-t border-border leading-relaxed">
                <span className="font-semibold">Roda sozinho:</span> {aberto.automacao}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── A GRADE ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {modulos.map((m) => (
          <Link
            key={m.chave}
            href={m.href}
            onMouseEnter={() => setAtivo(m.chave)}
            onFocus={() => setAtivo(m.chave)}
            className={`borda-viva card-interactive group relative overflow-hidden rounded-2xl border p-6 tile-bento ${
              m.largo ? "sm:col-span-2 sm:row-span-1" : ""
            }`}
            style={{
              // ── POR QUE NÃO É `var(--card)` ──
              //
              // A primeira versão usava o fundo e a borda do cartão comum, e o
              // bento ficou indistinguível da grade que ele substituiu —
              // mudou o layout, não a aparência. Aqui cada tile carrega um
              // vidro escuro com um vinco da cor do módulo no canto: é o que
              // faz a grade ler como objeto, e não como lista com cantos
              // arredondados.
              borderColor: "var(--border)",
              // A luz na borda, no hover, é a cor do próprio módulo. Ver
              // `.borda-viva` em globals.css: o brilho corre pela borda, não
              // é uma sombra colorida por fora.
              ["--cor-viva" as string]: `var(--serie-${m.serie})`,
            }}
          >
            <p className="font-semibold text-sm">{m.nome}</p>
            <p className="text-xs text-muted mt-2 leading-relaxed">{m.resumo}</p>
            <p
              className="text-xs font-semibold mt-4 inline-flex items-center gap-1.5"
              style={{ color: `var(--serie-${m.serie})` }}
            >
              Conhecer
              <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
