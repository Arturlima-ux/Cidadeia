"use client";

import { m } from "motion/react";
import { FONTES_OFICIAIS } from "@/lib/fontes-oficiais";

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
// 3. o trabalho que sai pronto, sem ninguém montar.

// ── AUTOMAÇÃO, E NÃO AVISO ──
// O terceiro passo era "avisa quem decide", e a seção inteira vendia alerta,
// o produto que o fundador deixou para trás: o CidadeIA faz o trabalho, não
// lembra alguém de fazê-lo (revisão de outubro de 2026). Os três passos agora
// são o que o sistema faz sozinho, e o terceiro mostra o trabalho pronto.
const PASSOS = [
  {
    titulo: "Os dados entram sozinhos",
    texto: "O que já é público vem das bases oficiais toda semana, sem digitar e sem instalar nada na prefeitura.",
  },
  {
    titulo: "A lei é conferida sozinha",
    texto: "Cada prazo e cada limite é conferido pelo sistema, com o artigo ao lado, sem planilha e sem ninguém precisar lembrar.",
  },
  {
    titulo: "O trabalho sai pronto",
    texto: "Pedido de reposição, ofício, aviso público e relatório saem montados. A equipe confere e assina.",
  },
];

// Cinco cabem nos fios do desenho; as outras aparecem como "e mais 4".
const FONTES = FONTES_OFICIAIS.slice(0, 5);
const OUTRAS_FONTES = FONTES_OFICIAIS.length - FONTES.length;

// 52,4% passou do limite prudencial (51,3%, LRF art. 22), mas não do limite
// da lei (54%, art. 20, III, b): é "acima do prudencial", e não "fora da
// lei". A revisão de outubro de 2026 apontou o rótulo errado, que um
// contador percebe em segundos. Por isso cada item pode ter o próprio rótulo.
const CONFERENCIA: { item: string; lei: string; estado: "ok" | "atencao" | "falha"; rotulo?: string }[] = [
  { item: "RREO do 4º bimestre entregue", lei: "LRF, art. 52", estado: "ok" },
  { item: "Saúde: 15,9% da receita aplicada", lei: "LC 141, art. 7º", estado: "ok" },
  { item: "Despesa com pessoal em 52,4%", lei: "LRF, art. 22 · prudencial 51,3%, limite 54%", estado: "falha", rotulo: "Acima do prudencial" },
  { item: "Ouvidoria com resposta fora do prazo", lei: "Lei 13.460, art. 16", estado: "atencao" },
  { item: "Portal da transparência atualizado", lei: "LAI, art. 8º", estado: "ok" },
];

const COR_ESTADO = {
  ok: "var(--info)",
  atencao: "var(--medio)",
  falha: "var(--urgente)",
};
const ROTULO_ESTADO = { ok: "Em dia", atencao: "Atenção", falha: "Urgente" };

export default function ComoFunciona() {
  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-28 sm:pt-36">
      <h2 className="inicio-h2 max-w-[18ch]">Do dado público ao trabalho feito.</h2>
      {/* grid-cols-1 e min-w-0 não são enfeite: sem eles, a coluna única do
          celular crescia até o conteúdo mais largo (os nomes das bases, que
          não quebram linha), e os três cartões saíam 90 px para fora da tela. */}
      <ol className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {PASSOS.map((p, i) => (
          <li key={p.titulo} className="flex flex-col min-w-0">
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
  return <VisualPronto />;
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
          <m.li
            key={f}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium whitespace-nowrap"
          >
            {f}
          </m.li>
        ))}
        {OUTRAS_FONTES > 0 && <li className="px-3 text-xs text-muted">e mais {OUTRAS_FONTES}</li>}
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
          <m.li
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
              {c.rotulo ?? ROTULO_ESTADO[c.estado]}
            </span>
          </m.li>
        ))}
      </ul>
    </div>
  );
}

// ── 3. O trabalho pronto ──
// Cada linha é uma rotina que existe no código, e não promessa:
// lib/estoque-saude (pedido de reposição em CSV), busca ativa (ofício ao
// Conselho Tutelar), lib/obra-parada-publica (aviso de obra paralisada,
// quando a decisão está completa), relatórios em PDF e o rascunho do plano
// de contratações (Licitações).
const PRONTOS = [
  { doc: "Pedido de reposição da farmácia", de: "Saúde · tudo abaixo de 15 dias de cobertura", formato: "CSV" },
  { doc: "Ofício ao Conselho Tutelar", de: "Educação · aluno há 15 dias fora da sala", formato: "para assinar" },
  { doc: "Aviso de obra paralisada", de: "Obras · motivo, responsável e reinício", formato: "no portal" },
  { doc: "Plano de contratações do ano seguinte", de: "Licitações · montado do histórico do PNCP", formato: "rascunho" },
  { doc: "Relatório executivo do mês", de: "Gestão · para a reunião ou a câmara", formato: "PDF" },
];

function VisualPronto() {
  return (
    <div className="h-full min-h-[320px] rounded-[24px] border border-border p-5" style={{ background: "var(--card)" }}>
      <p className="text-xs text-muted">Saiu pronto esta semana · Município de exemplo</p>
      <ul className="mt-3 flex flex-col">
        {PRONTOS.map((p, i) => (
          <m.li
            key={p.doc}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 + i * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0"
          >
            <span
              className="w-6 h-6 rounded-full grid place-items-center shrink-0"
              style={{ background: "var(--accent-tint)", color: "var(--accent-claro)" }}
              aria-hidden
            >
              <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10.5l4 4 8-9" />
              </svg>
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium leading-snug">{p.doc}</span>
              <span className="block text-xs text-muted mt-0.5">{p.de}</span>
            </span>
            <span className="text-[11px] font-medium rounded-full border border-border px-2 py-0.5 shrink-0 text-muted">{p.formato}</span>
          </m.li>
        ))}
      </ul>
    </div>
  );
}
