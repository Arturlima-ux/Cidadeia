"use client";

import { motion } from "motion/react";

// ── DO DADO À DECISÃO, EM TRÊS CARTÕES ──
//
// Era uma rolagem narrada: palco preso com três telas de altura, quase duas
// telas de rolagem para três passos. No desktop, quem rolava rápido passava
// por um vazio escuro; no print da página, a seção virava um buraco. Agora
// são três cartões lado a lado (empilhados no celular), cada um com o seu
// visual, que se monta ao entrar na tela. O conteúdo é o mesmo.
//
// Cada visual mostra o que o produto faz de verdade:
// 1. as bases públicas que ele lê (as mesmas da faixa "Lê direto de");
// 2. a conferência por exigência, cada uma com o artigo de lei;
// 3. o aviso chegando no painel e por e-mail ao prefeito, que é o que
//    lib/notificacoes.ts faz com alerta urgente. WhatsApp não aparece porque
//    o produto não envia por lá.

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
  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-28 sm:pt-36">
      <h2 className="inicio-h2 max-w-[18ch]">Do dado público à decisão.</h2>
      <ol className="mt-12 grid lg:grid-cols-3 gap-5">
        {PASSOS.map((p, i) => (
          <li key={p.titulo} className="flex flex-col">
            <span className="block text-4xl font-light tabular-nums tracking-[-0.05em] text-brand-claro">{i + 1}</span>
            <h3 className="mt-3 text-xl font-semibold tracking-[-0.025em]">{p.titulo}</h3>
            <p className="mt-2 text-muted leading-relaxed max-w-[38ch]">{p.texto}</p>
            <div className="mt-6 flex-1">
              <Visual passo={i} />
            </div>
          </li>
        ))}
      </ol>
    </section>
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
      className="h-full min-h-[320px] rounded-[24px] border border-border p-5 grid grid-cols-[auto_1fr_auto] items-center gap-2"
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
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium whitespace-nowrap"
          >
            {f}
          </motion.li>
        ))}
      </ul>

      {/* Os fios: traço que corre da fonte ao núcleo. */}
      <svg viewBox="0 0 200 300" className="w-full h-[220px] min-w-6" preserveAspectRatio="none" aria-hidden>
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
          className="w-20 h-20 rounded-2xl grid place-items-center border"
          style={{ borderColor: "var(--brand)", background: "var(--brand-tint)" }}
        >
          <span className="text-xs font-semibold text-center leading-tight">
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
    <div className="h-full min-h-[320px] rounded-[24px] border border-border p-5" style={{ background: "var(--card)" }}>
      <p className="text-xs text-muted">Conferência do exercício · Município de exemplo</p>
      <ul className="mt-3 flex flex-col">
        {CONFERENCIA.map((c, i) => (
          <motion.li
            key={c.item}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 + i * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0"
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COR_ESTADO[c.estado] }} />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium leading-snug">{c.item}</span>
              <span className="block text-xs text-muted mt-0.5">{c.lei}</span>
            </span>
            <span
              className="text-[11px] font-medium rounded-full border px-2 py-0.5 shrink-0"
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
    <div className="h-full min-h-[320px] rounded-[24px] border border-border p-5 flex flex-col justify-center gap-4 overflow-hidden" style={{ background: "var(--card)" }}>
      <motion.div
        initial={{ opacity: 0, y: -28, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border p-4"
        style={{ borderColor: "var(--urgente-borda)", background: "var(--urgente-tint)" }}
      >
        <div className="flex items-center justify-between gap-4 text-xs">
          <span className="font-semibold" style={{ color: "var(--urgente)" }}>Urgente · no painel</span>
          <span className="text-muted">agora</span>
        </div>
        <p className="mt-2 font-semibold tracking-[-0.02em] leading-snug">
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
        className="rounded-2xl border border-border p-4 flex items-center gap-3"
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
