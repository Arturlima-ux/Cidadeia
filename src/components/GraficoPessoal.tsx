"use client";

import { useId, useMemo, useRef, useState } from "react";
import { FRONTEIRAS, pctBr, rotuloDoMes, type PontoPessoal } from "@/lib/visao-do-prefeito";
import { LIMITE_PESSOAL } from "@/lib/despesa-pessoal";

// ── A DESPESA COM PESSOAL COMO GRÁFICO DE BOLSA ──
//
// O jeito que todo mundo já sabe ler: o número grande em cima, quanto mudou
// no período ao lado, as abas de período, e o dedo (ou o mouse) passando pela
// linha mostra o valor e a data de cada apuração. Com as linhas da LRF por
// trás e, quando há aviso antecipado, a projeção pontilhada até a travessia.
//
// Na bolsa, subir é verde. Aqui subir é gasto com pessoal crescendo sobre a
// receita: vermelho. Descer é verde.

type Projecao = { em: string; limiar: number } | null;

const PERIODOS = [
  { chave: "1a", rotulo: "1A", meses: 12 },
  { chave: "2a", rotulo: "2A", meses: 24 },
  { chave: "max", rotulo: "Máx.", meses: Infinity },
] as const;

const ALTURA = 220;
const X0 = 2;
const X1 = 86;
const MES_MS = 30.44 * 86_400_000;

function pp(v: number): string {
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${pctBr(Math.abs(v))} p.p.`;
}

function duracao(meses: number): string {
  if (meses < 1.5) return "no último mês";
  if (meses < 11) return `em ${Math.round(meses)} meses`;
  const anos = Math.round(meses / 12);
  return anos <= 1 ? "em 1 ano" : `em ${anos} anos`;
}

export default function GraficoPessoal({ serie, projecao }: { serie: PontoPessoal[]; projecao: Projecao }) {
  const id = useId();
  const area = useRef<HTMLDivElement>(null);
  const ultimoEm = Date.parse(serie.at(-1)!.em);

  // Abas que mostram pelo menos dois pontos; as outras somem, para não haver
  // botão que leva a um gráfico de um ponto só.
  const abas = PERIODOS.filter(
    (p) => p.meses === Infinity || serie.filter((s) => ultimoEm - Date.parse(s.em) <= p.meses * MES_MS).length >= 2
  );
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]["chave"]>("max");
  const [foco, setFoco] = useState<number | null>(null);

  const meses = PERIODOS.find((p) => p.chave === periodo)!.meses;
  const visiveis = useMemo(
    () => serie.filter((s) => ultimoEm - Date.parse(s.em) <= meses * MES_MS),
    [serie, ultimoEm, meses]
  );

  const geo = useMemo(() => {
    const t = (iso: string) => Date.parse(iso);
    const t0 = t(visiveis[0].em);
    const t1 = Math.max(t(visiveis.at(-1)!.em), projecao ? t(projecao.em) : -Infinity);
    const valores = visiveis.map((p) => p.percentual);
    const piso = Math.floor(Math.min(...valores, FRONTEIRAS[0].valor) - 3);
    const teto = Math.max(Math.ceil(Math.max(...valores) + 1.5), LIMITE_PESSOAL + 2);
    const x = (ms: number) => (t1 === t0 ? (X0 + X1) / 2 : X0 + ((ms - t0) / (t1 - t0)) * (X1 - X0));
    const y = (v: number) => 6 + ((teto - v) / (teto - piso)) * 82;
    const pontos = visiveis.map((p) => ({ x: x(t(p.em)), y: y(p.percentual) }));
    const ultimo = pontos.at(-1)!;
    const linha = pontos.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
    const preenchimento = `${linha} L${ultimo.x.toFixed(2)},100 L${pontos[0].x.toFixed(2)},100 Z`;
    const fim = projecao ? { x: x(t(projecao.em)), y: y(projecao.limiar) } : null;
    return { y, pontos, ultimo, linha, preenchimento, fim };
  }, [visiveis, projecao]);

  // O cabeçalho segue o dedo: mostra o ponto em foco e quanto ele mudou
  // desde o começo do período. Sem foco, mostra o último.
  const i = foco ?? visiveis.length - 1;
  const ponto = visiveis[i];
  const variacao = ponto.percentual - visiveis[0].percentual;
  const corVariacao = Math.abs(variacao) < 0.05 ? "var(--muted)" : variacao > 0 ? "var(--urgente)" : "var(--info)";
  const mesesDecorridos = (Date.parse(ponto.em) - Date.parse(visiveis[0].em)) / MES_MS;

  function focarPeloPonteiro(clientX: number) {
    const caixa = area.current?.getBoundingClientRect();
    if (!caixa) return;
    const pct = ((clientX - caixa.left) / caixa.width) * 100;
    let melhor = 0;
    for (let k = 1; k < geo.pontos.length; k++) {
      if (Math.abs(geo.pontos[k].x - pct) < Math.abs(geo.pontos[melhor].x - pct)) melhor = k;
    }
    setFoco(melhor);
  }

  function teclado(e: React.KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const atual = foco ?? visiveis.length - 1;
    setFoco(Math.max(0, Math.min(visiveis.length - 1, atual + (e.key === "ArrowRight" ? 1 : -1))));
  }

  const corFronteira = (nome: string) => (nome === "teto" ? "var(--urgente)" : "var(--medio)");
  const p = geo.pontos[i];

  return (
    <figure className="rounded-2xl border border-border p-4 sm:p-5" style={{ background: "var(--superficie)" }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div aria-live="polite">
          <figcaption className="text-xs tracking-[0.06em] text-muted">Despesa com pessoal · % da RCL ajustada</figcaption>
          <p className="mt-1.5 flex items-baseline gap-3 flex-wrap">
            <span className="text-3xl font-medium tracking-[-0.03em] tabular-nums">{pctBr(ponto.percentual)}%</span>
            {visiveis.length > 1 && (
              <span className="text-sm font-medium tabular-nums" style={{ color: corVariacao }}>
                {variacao > 0.05 ? "▲" : variacao < -0.05 ? "▼" : ""} {pp(variacao)}{" "}
                <span className="text-muted font-normal">{i === 0 ? "início do período" : duracao(mesesDecorridos)}</span>
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted tabular-nums">
            RGF de {ponto.rotulo}
            {foco === null ? " · último publicado" : ""}
          </p>
        </div>
        {abas.length > 1 && (
          <div role="tablist" aria-label="Período do gráfico" className="flex gap-1 rounded-full border border-border p-0.5">
            {abas.map((a) => (
              <button
                key={a.chave}
                role="tab"
                aria-selected={periodo === a.chave}
                onClick={() => {
                  setPeriodo(a.chave);
                  setFoco(null);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  periodo === a.chave ? "bg-[color:var(--brand)] text-white" : "text-muted hover:text-foreground"
                }`}
              >
                {a.rotulo}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        ref={area}
        tabIndex={0}
        role="img"
        aria-label={`Gráfico da despesa com pessoal. Use as setas para percorrer as apurações. Em foco: ${pctBr(ponto.percentual)}% em ${ponto.rotulo}.`}
        onPointerMove={(e) => focarPeloPonteiro(e.clientX)}
        onPointerDown={(e) => focarPeloPonteiro(e.clientX)}
        onPointerLeave={() => setFoco(null)}
        onKeyDown={teclado}
        onBlur={() => setFoco(null)}
        className="relative mt-4 cursor-crosshair select-none outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] rounded-lg"
        style={{ height: ALTURA, touchAction: "pan-y" }}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
            <clipPath id={`${id}-revela`}>
              <rect
                key={periodo}
                x={0}
                y={-5}
                width={100}
                height={110}
                className="motion-safe:animate-[preencher-barra_1.1s_cubic-bezier(.2,.7,.2,1)_both]"
                style={{ transformBox: "fill-box", transformOrigin: "left" }}
              />
            </clipPath>
          </defs>
          {FRONTEIRAS.map((f) => (
            <line
              key={f.nome}
              x1={0}
              x2={X1 + 1}
              y1={geo.y(f.valor)}
              y2={geo.y(f.valor)}
              stroke={corFronteira(f.nome)}
              strokeOpacity={0.5}
              strokeWidth={1}
              strokeDasharray="4 5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <g clipPath={`url(#${id}-revela)`}>
            <path d={geo.preenchimento} fill={`url(#${id}-area)`} />
            <path
              d={geo.linha}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2.25}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
          {geo.fim && (
            <line
              x1={geo.ultimo.x}
              y1={geo.ultimo.y}
              x2={geo.fim.x}
              y2={geo.fim.y}
              stroke="var(--medio)"
              strokeWidth={1.75}
              strokeDasharray="2 4"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {/* A linha vertical do cursor, como na bolsa. */}
          {foco !== null && (
            <line x1={p.x} x2={p.x} y1={0} y2={100} stroke="var(--foreground)" strokeOpacity={0.35} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          )}
        </svg>

        {FRONTEIRAS.map((f) => (
          <span
            key={f.nome}
            className="absolute right-0 -translate-y-full pb-0.5 font-mono text-[10px] tabular-nums pointer-events-none"
            style={{ top: `${geo.y(f.valor)}%`, color: corFronteira(f.nome) }}
          >
            {pctBr(f.valor)}%
          </span>
        ))}

        {/* As apurações, discretas; a em foco cresce. */}
        {geo.pontos.map((q, k) => (
          <span
            key={k}
            className="absolute rounded-full pointer-events-none transition-[width,height,margin] duration-150"
            style={{
              left: `${q.x}%`,
              top: `${q.y}%`,
              width: k === i ? 10 : 4,
              height: k === i ? 10 : 4,
              marginLeft: k === i ? -5 : -2,
              marginTop: k === i ? -5 : -2,
              background: k === i ? "var(--foreground)" : "var(--accent)",
              boxShadow: k === i ? "0 0 0 2px var(--accent)" : undefined,
              opacity: k === i || foco !== null ? 1 : 0.55,
            }}
            aria-hidden
          />
        ))}

        {/* O brilho do vídeo no último ponto, enquanto ninguém está olhando outro. */}
        {foco === null && (
          <span
            className="absolute w-14 h-14 -ml-7 -mt-7 rounded-full pointer-events-none motion-safe:animate-[respirar_2.6s_ease-in-out_infinite]"
            style={{
              left: `${geo.ultimo.x}%`,
              top: `${geo.ultimo.y}%`,
              background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 45%, transparent), transparent 70%)",
            }}
            aria-hidden
          />
        )}
        {geo.fim && (
          <span
            className="absolute w-2 h-2 -ml-1 -mt-1 rounded-full border-2 pointer-events-none"
            style={{ left: `${geo.fim.x}%`, top: `${geo.fim.y}%`, borderColor: "var(--medio)", background: "var(--superficie)" }}
            aria-hidden
          />
        )}

        {/* A etiqueta do cursor: valor e data, presa à linha vertical. */}
        {foco !== null && (
          <span
            className="absolute top-0 -translate-x-1/2 rounded-md border border-border px-2 py-1 text-[11px] font-medium tabular-nums whitespace-nowrap pointer-events-none shadow-lg"
            style={{
              left: `clamp(48px, ${p.x}%, calc(100% - 48px))`,
              background: "var(--card)",
            }}
          >
            {pctBr(ponto.percentual)}% · {ponto.rotulo}
          </span>
        )}
      </div>

      {/* Eixo do tempo: começo, último dado e, se houver, a travessia projetada. */}
      <div className="relative mt-2 h-4 font-mono text-[10px] text-muted tabular-nums">
        <span className="absolute" style={{ left: `${geo.pontos[0].x}%` }}>
          {visiveis[0].rotulo}
        </span>
        {visiveis.length > 1 && (!geo.fim || geo.fim.x - geo.ultimo.x > 12) && (
          <span className="absolute -translate-x-1/2" style={{ left: `${geo.ultimo.x}%` }}>
            {visiveis.at(-1)!.rotulo}
          </span>
        )}
        {geo.fim && projecao && (
          <span className="absolute -translate-x-1/2" style={{ left: `${geo.fim.x}%`, color: "var(--medio)" }}>
            {rotuloDoMes(projecao.em)}
          </span>
        )}
      </div>

      <p className="sr-only">
        {`A despesa com pessoal foi de ${pctBr(visiveis[0].percentual)}% em ${visiveis[0].rotulo} a ${pctBr(
          visiveis.at(-1)!.percentual
        )}% em ${visiveis.at(-1)!.rotulo}.`}
        {projecao ? ` No ritmo medido, chega a ${pctBr(projecao.limiar)}% por volta de ${rotuloDoMes(projecao.em)}.` : ""}
      </p>
    </figure>
  );
}
