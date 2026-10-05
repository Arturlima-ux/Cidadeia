"use client";

import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";

// ── DO DADO À DECISÃO, EM ROLAGEM ──
//
// Três passos com o texto fixo à esquerda e o visual mudando à direita
// conforme a pessoa rola. A seção tem três telas de altura; o palco interno é
// `sticky` e o passo ativo sai de `useScroll` do Motion.
//
// Cada visual mostra o que o produto faz de verdade:
// 1. as bases públicas que ele lê (as mesmas da faixa "Lê direto de");
// 2. a conferência por exigência, cada uma com o artigo de lei;
// 3. o aviso chegando no painel e por e-mail ao prefeito, que é o que
//    lib/notificacoes.ts faz com alerta urgente. WhatsApp não aparece porque
//    o produto não envia por lá.
//
// Com movimento reduzido, ou no celular, vira três blocos empilhados, sem
// palco preso: rolagem presa em tela pequena atrapalha mais do que mostra.

const PASSOS = [
  {
    titulo: "Escolha o município",
    texto: "O que já é público entra sozinho. Não há nada para instalar na prefeitura.",
  },
  {
    titulo: "O sistema confere",
    texto: "Cada exigência é conferida contra a lei, e cada desvio sai com o artigo que ele fere.",
  },
  {
    titulo: "Quem decide é avisado",
    texto: "O aviso chega antes do relatório oficial, no painel e por e-mail, com o que fazer.",
  },
];

const FONTES = ["Tesouro Nacional", "IBGE", "PNCP", "DataSUS", "INEP"];

const CONFERENCIA: { item: string; lei: string; estado: "ok" | "atencao" | "falha" }[] = [
  { item: "RREO do 4º bimestre entregue", lei: "LRF, art. 52", estado: "ok" },
  { item: "Saúde: 15,9% da receita aplicada", lei: "LC 141, art. 7º", estado: "ok" },
  { item: "Despesa com pessoal em 52,4%", lei: "LRF, art. 22", estado: "falha" },
  { item: "Ouvidoria com resposta fora do prazo", lei: "Lei 13.460, art. 16", estado: "atencao" },
  { item: "Portal da transparência atualizado", lei: "LAI, art. 8º", estado: "ok" },
];

const COR_ESTADO = {
  ok: "var(--info)",
  atencao: "var(--medio)",
  falha: "var(--urgente)",
};
const ROTULO_ESTADO = { ok: "Em dia", atencao: "Atenção", falha: "Fora da lei" };

export default function ComoFunciona() {
  const reduzir = useReducedMotion();
  const alvo = useRef<HTMLDivElement>(null);
  const [passo, setPasso] = useState(0);
  const { scrollYProgress } = useScroll({ target: alvo, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setPasso(v < 0.34 ? 0 : v < 0.67 ? 1 : 2);
  });

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-28 sm:pt-36">
      <h2 className="inicio-h2 max-w-[18ch]">Do dado público à decisão.</h2>

      {/* Celular e movimento reduzido: três blocos empilhados. */}
      <ol className={`mt-14 flex flex-col gap-16 ${reduzir ? "" : "lg:hidden"}`}>
        {PASSOS.map((p, i) => (
          <li key={p.titulo}>
            <TextoPasso indice={i} ativo />
            <div className="mt-8">
              <Visual passo={i} />
            </div>
          </li>
        ))}
      </ol>

      {/* Desktop: palco preso, texto à esquerda e visual à direita. */}
      {!reduzir && (
        <div ref={alvo} className="hidden lg:block relative" style={{ height: "300vh" }}>
          <div className="sticky top-0 h-screen flex items-center">
            <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-16 w-full items-center">
              <ol className="flex flex-col gap-10">
                {PASSOS.map((p, i) => (
                  <li key={p.titulo}>
                    <TextoPasso indice={i} ativo={i === passo} />
                  </li>
                ))}
              </ol>
              <div className="relative h-[520px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={passo}
                    className="absolute inset-0"
                    initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Visual passo={passo} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function TextoPasso({ indice, ativo }: { indice: number; ativo: boolean }) {
  const p = PASSOS[indice];
  return (
    <div className="transition-opacity duration-500" style={{ opacity: ativo ? 1 : 0.32 }}>
      <span className="block text-5xl font-light tabular-nums tracking-[-0.05em] text-brand-claro">
        {indice + 1}
      </span>
      <h3 className="mt-4 text-2xl font-semibold tracking-[-0.025em]">{p.titulo}</h3>
      <p className="mt-2 text-muted leading-relaxed max-w-[36ch]">{p.texto}</p>
    </div>
  );
}

function Visual({ passo }: { passo: number }) {
  if (passo === 0) return <VisualFontes />;
  if (passo === 1) return <VisualConferencia />;
  return <VisualAviso />;
}

// ── 1. As bases entrando ──
function VisualFontes() {
  return (
    <div
      className="h-full min-h-[420px] rounded-[28px] border border-border p-8 grid grid-cols-[auto_1fr_auto] items-center gap-4"
      style={{ background: "var(--card)" }}
    >
      <ul className="flex flex-col gap-3">
        {FONTES.map((f, i) => (
          <motion.li
            key={f}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium whitespace-nowrap"
          >
            {f}
          </motion.li>
        ))}
      </ul>

      {/* Os fios: traço que corre da fonte ao núcleo. */}
      <svg viewBox="0 0 200 300" className="w-full h-[300px]" preserveAspectRatio="none" aria-hidden>
        {FONTES.map((_, i) => {
          const y = 30 + i * 60;
          return (
            <path
              key={i}
              d={`M0 ${y} C 100 ${y}, 100 150, 200 150`}
              fill="none"
              stroke="var(--brand-claro)"
              strokeOpacity="0.45"
              strokeWidth="1.2"
              strokeDasharray="4 10"
              className="fio-dados"
              style={{ animationDelay: `${i * -0.35}s` }}
            />
          );
        })}
      </svg>

      <div className="flex flex-col items-center gap-3">
        <div
          className="w-24 h-24 rounded-3xl grid place-items-center border"
          style={{ borderColor: "var(--brand)", background: "var(--brand-tint)" }}
        >
          <span className="text-sm font-semibold text-center leading-tight">
            Seu
            <br />
            município
          </span>
        </div>
        <span className="text-xs text-muted">sem instalar nada</span>
      </div>
    </div>
  );
}

// ── 2. A conferência, item a item ──
function VisualConferencia() {
  return (
    <div className="h-full min-h-[420px] rounded-[28px] border border-border p-8" style={{ background: "var(--card)" }}>
      <p className="text-sm text-muted">Conferência do exercício · Município de exemplo</p>
      <ul className="mt-6 flex flex-col">
        {CONFERENCIA.map((c, i) => (
          <motion.li
            key={c.item}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 + i * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-4 py-3.5 border-b border-border last:border-b-0"
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COR_ESTADO[c.estado] }} />
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-medium leading-snug">{c.item}</span>
              <span className="block text-xs text-muted mt-0.5">{c.lei}</span>
            </span>
            <span
              className="text-xs font-medium rounded-full border px-3 py-1 shrink-0"
              style={{ color: COR_ESTADO[c.estado], borderColor: "currentColor" }}
            >
              {ROTULO_ESTADO[c.estado]}
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

// ── 3. O aviso chegando ──
function VisualAviso() {
  return (
    <div className="h-full min-h-[420px] rounded-[28px] border border-border p-8 flex flex-col justify-center gap-5 overflow-hidden" style={{ background: "var(--card)" }}>
      <motion.div
        initial={{ opacity: 0, y: -28, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border p-5"
        style={{ borderColor: "var(--urgente-borda)", background: "var(--urgente-tint)" }}
      >
        <div className="flex items-center justify-between gap-4 text-xs">
          <span className="font-semibold" style={{ color: "var(--urgente)" }}>Urgente · no painel</span>
          <span className="text-muted">agora</span>
        </div>
        <p className="mt-3 text-lg font-semibold tracking-[-0.02em] leading-snug">
          Despesa com pessoal passou do prudencial: 52,4%.
        </p>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Vedado criar cargo e conceder aumento (LRF, art. 22). Ação sugerida:
          suspender novas nomeações até o próximo RGF.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.55, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-border p-5 flex items-center gap-4"
      >
        <span
          className="w-10 h-10 rounded-full grid place-items-center text-sm font-semibold shrink-0"
          style={{ background: "var(--brand-tint)", color: "var(--brand-claro)" }}
          aria-hidden
        >
          @
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium">E-mail enviado à prefeita</span>
          <span className="block text-xs text-muted mt-0.5 truncate">
            Alerta urgente: despesa com pessoal acima do prudencial
          </span>
        </span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="text-xs text-muted"
      >
        Município de exemplo. O RGF oficial só sai no fim do quadrimestre.
      </motion.p>
    </div>
  );
}
