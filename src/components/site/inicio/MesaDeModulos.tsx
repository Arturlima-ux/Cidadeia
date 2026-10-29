"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { m, useReducedMotion } from "motion/react";

// ── A MESA DE INSTRUMENTOS ──
//
// Eram seis cartões iguais, nome e uma frase, em grade de dois: a mesma cara
// de qualquer site de software. Mas cada módulo do CidadeIA vigia UMA coisa
// que costuma virar apontamento, e essa coisa tem forma própria: o prazo da
// LAI é um protocolo correndo, a despesa com pessoal é um ponteiro, os 200
// dias letivos são um calendário, a obra é o prazo contra a medição.
//
// Então cada módulo aparece como o instrumento dele. À esquerda, a pergunta
// que o módulo responde; à direita, o instrumento montando-se com um exemplo,
// e as três primeiras capacidades reais (lib/modulos-detalhe.ts). Os números
// do instrumento são de exemplo, e a tela diz isso.
//
// Movimento só quando a pessoa escolhe um módulo, e nenhum com movimento
// reduzido. O ponto de partida (initial) é o mesmo para todos: o servidor
// não sabe da preferência, e um `initial={false}` só no navegador fazia o
// React descartar e refazer a página inteira na hidratação. Para quem pediu
// menos movimento, a transição dura zero.

export type ModuloDaMesa = {
  chave: "essencial" | "gestao" | "saude" | "educacao" | "obras" | "licitacoes";
  nome: string;
  capacidades: string[];
};

const PERGUNTA: Record<ModuloDaMesa["chave"], string> = {
  essencial: "Todo pedido do cidadão tem número e resposta?",
  gestao: "Como está a prefeitura inteira hoje?",
  saude: "Qual unidade precisa de você hoje?",
  educacao: "Os 200 dias letivos vão fechar?",
  obras: "Cada obra está andando como deveria?",
  licitacoes: "O que a prefeitura já comprou e contratou no ano?",
};

export default function MesaDeModulos({ modulos, limiteDispensa }: { modulos: ModuloDaMesa[]; limiteDispensa: number }) {
  const [ativo, setAtivo] = useState(0);
  const [rodada, setRodada] = useState(0);
  const base = useId();
  const abas = useRef<(HTMLButtonElement | null)[]>([]);
  const m = modulos[ativo];

  function escolher(i: number) {
    if (i === ativo) return;
    setAtivo(i);
    setRodada((r) => r + 1);
  }

  function teclas(e: React.KeyboardEvent) {
    const n = modulos.length;
    let alvo: number | null = null;
    // Só as setas de lado trocam de módulo. Para cima e para baixo continuam
    // rolando a página, como em todo o resto do site: quem desce a página
    // pelo teclado depois de clicar num módulo não pode ficar preso na mesa.
    if (e.key === "ArrowRight") alvo = (ativo + 1) % n;
    if (e.key === "ArrowLeft") alvo = (ativo - 1 + n) % n;
    if (e.key === "Home") alvo = 0;
    if (e.key === "End") alvo = n - 1;
    if (alvo === null) return;
    e.preventDefault();
    escolher(alvo);
    abas.current[alvo]?.focus();
  }

  return (
    <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 lg:gap-12 items-start">
      {/* A régua de perguntas. No celular, uma faixa que rola de lado. */}
      <div
        role="tablist"
        aria-label="Módulos do CidadeIA"
        onKeyDown={teclas}
        className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 pb-1 snap-x"
      >
        {modulos.map((x, i) => {
          const sel = i === ativo;
          return (
            <button
              key={x.chave}
              ref={(el) => {
                abas.current[i] = el;
              }}
              role="tab"
              id={`${base}-aba-${x.chave}`}
              aria-selected={sel}
              aria-controls={`${base}-painel`}
              tabIndex={sel ? 0 : -1}
              onClick={() => escolher(i)}
              // Passo de tom, sem contorno: a pergunta escolhida acende no
              // roxo da marca; as outras ficam num cinza baixo e clareiam ao
              // passar o mouse (.mesa-aba em globals.css). Eram seis caixas
              // de contorno iguais (revisão de novembro de 2026).
              className="mesa-aba snap-start shrink-0 lg:shrink text-left rounded-2xl px-4 py-3.5 lg:px-5 lg:py-4 min-w-[220px] lg:min-w-0"
              data-sel={sel ? "1" : undefined}
            >
              <span className="block font-semibold tracking-[-0.02em]" style={{ color: sel ? "var(--brand-claro)" : undefined }}>
                {x.nome}
              </span>
              <span className={`block text-sm mt-0.5 leading-snug ${sel ? "text-foreground" : "text-muted"}`}>{PERGUNTA[x.chave]}</span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${base}-painel`}
        aria-labelledby={`${base}-aba-${m.chave}`}
        className="mesa-painel rounded-[28px] overflow-hidden"
        style={{ background: "var(--card)" }}
      >
        <div className="p-5 sm:p-9 min-h-[300px] sm:min-h-[340px] flex flex-col">
          <Instrumento key={`${m.chave}-${rodada}`} chave={m.chave} limiteDispensa={limiteDispensa} />
        </div>
        <div className="border-t border-border px-5 sm:px-9 py-5 sm:py-6" style={{ background: "var(--superficie)" }}>
          <ul className="grid gap-2 text-sm leading-relaxed">
            {m.capacidades.slice(0, 3).map((c) => (
              <li key={c} className="flex gap-2.5">
                <span className="mt-[0.55em] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--brand)" }} />
                <span className="text-muted">{c}</span>
              </li>
            ))}
          </ul>
          <Link href={`/modulos/${m.chave}`} className="inicio-sublinhado inline-block mt-4 text-sm font-medium">
            Tudo o que o módulo {m.nome} faz
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── os instrumentos ──

const ease = [0.16, 1, 0.3, 1] as const;

function Rotulo({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted">{children}</p>;
}

// ── O FECHO DE CADA EXEMPLO ──
// O instrumento mostra o número; o fecho diz o que ele significa. Antes era
// uma frase pequena e colorida no pé do painel, do mesmo peso que a legenda,
// e quem olhava via o gráfico e não a conclusão. Agora o problema vem em
// destaque e, embaixo, o que o sistema já fez ou o que vem a seguir.
// Figma: "Conclusão do instrumento" (Tom=Alerta / Tom=Urgente).
function Conclusao({
  tom,
  problema,
  children,
}: {
  tom: "medio" | "urgente";
  problema: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="mesa-conclusao mt-6 rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4"
      style={{ "--tom": `var(--${tom})` } as React.CSSProperties}
    >
      <p className="flex items-baseline gap-2.5 font-semibold tracking-[-0.01em] leading-snug">
        <span aria-hidden className="w-2 h-2 rounded-full shrink-0 translate-y-[-1px]" style={{ background: "var(--tom)" }} />
        {problema}
      </p>
      <p className="mesa-conclusao-consequencia mt-1 text-sm leading-relaxed pl-[18px]">{children}</p>
    </div>
  );
}

function Instrumento({ chave, limiteDispensa }: { chave: ModuloDaMesa["chave"]; limiteDispensa: number }) {
  switch (chave) {
    case "essencial":
      return <Protocolo />;
    case "gestao":
      return <Ponteiro />;
    case "saude":
      return <Rede />;
    case "educacao":
      return <Calendario />;
    case "obras":
      return <PrazoContraObra />;
    case "licitacoes":
      return <Dispensas limite={limiteDispensa} />;
  }
}

/** Essencial: o protocolo do cidadão, com os 20 dias da LAI correndo. */
function Protocolo() {
  const reduzir = useReducedMotion();
  const dias = 20;
  const passados = 14;
  return (
    <div className="flex-1 flex flex-col justify-center">
      <Rotulo>Exemplo: um pedido de informação feito pelo portal</Rotulo>
      <div className="mt-4 relative rounded-2xl border border-dashed p-5 sm:p-6" style={{ borderColor: "var(--border)" }}>
        {/* os recortes do canhoto */}
        <span aria-hidden className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-border" style={{ background: "var(--card)" }} />
        <span aria-hidden className="absolute -right-[9px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-border" style={{ background: "var(--card)" }} />
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-2xl sm:text-3xl font-semibold tabular-nums tracking-[-0.03em]">2026-00418</p>
          <p className="text-sm text-muted">Pedido de informação · Saúde</p>
        </div>
        <p className="mt-2 text-sm text-muted">“Quero a lista de médicos de cada UBS e o horário de atendimento.”</p>
        <div className="mt-6">
          <div className="flex justify-between text-xs text-muted mb-2">
            <span>Prazo da Lei de Acesso à Informação</span>
            <span className="tabular-nums">
              {passados} de {dias} dias
            </span>
          </div>
          <div className="flex gap-[3px]" aria-hidden>
            {Array.from({ length: dias }, (_, i) => (
              <m.span
                key={i}
                className="h-3 flex-1 rounded-[3px]"
                initial={{ opacity: 0, scaleY: 0.3 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={reduzir ? { duration: 0 } : { delay: i * 0.025, duration: 0.3, ease }}
                style={{
                  background: i < passados ? (i >= dias - 6 ? "var(--medio)" : "var(--brand)") : "var(--sutil)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <Conclusao tom="medio" problema="Faltam 6 dias para o prazo da Lei de Acesso.">
        O prazo é contado sozinho, e o pedido já está na fila da Saúde, que responde por aqui.
      </Conclusao>
    </div>
  );
}

/** Gestão: o ponteiro da despesa com pessoal e o próximo prazo. */
function Ponteiro() {
  const reduzir = useReducedMotion();
  const valor = 47.8; // % da RCL
  const ini = 40;
  const fim = 56;
  const ang = (v: number) => -90 + ((v - ini) / (fim - ini)) * 180;
  const arco = (a: number, b: number) => {
    const p = (v: number) => {
      const r = ((ang(v) - 90) * Math.PI) / 180;
      return [100 + 80 * Math.cos(r), 100 + 80 * Math.sin(r)];
    };
    const [x1, y1] = p(a);
    const [x2, y2] = p(b);
    return `M ${x1} ${y1} A 80 80 0 0 1 ${x2} ${y2}`;
  };
  return (
    <div className="flex-1 grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-center">
      <div>
        <Rotulo>Exemplo: despesa com pessoal sobre a receita corrente líquida</Rotulo>
        <svg viewBox="0 0 200 115" className="w-full max-w-[300px] mt-3" role="img" aria-label="47,8% da receita com pessoal; alerta em 48,6%, prudencial em 51,3% e máximo em 54%.">
          <path d={arco(ini, 48.6)} fill="none" stroke="var(--sutil)" strokeWidth="14" />
          <path d={arco(48.6, 51.3)} fill="none" stroke="var(--medio)" strokeOpacity="0.55" strokeWidth="14" />
          <path d={arco(51.3, fim)} fill="none" stroke="var(--urgente)" strokeOpacity="0.55" strokeWidth="14" />
          <m.g
            initial={{ rotate: ang(ini) }}
            animate={{ rotate: ang(valor) }}
            transition={reduzir ? { duration: 0 } : { duration: 1.4, ease }}
            style={{ transformOrigin: "100px 100px", transformBox: "view-box" }}
          >
            <line x1="100" y1="100" x2="100" y2="32" stroke="var(--foreground)" strokeWidth="3" strokeLinecap="round" />
          </m.g>
          <circle cx="100" cy="100" r="6" fill="var(--foreground)" />
        </svg>
        <p className="text-3xl font-semibold tabular-nums tracking-[-0.03em] -mt-1">47,8%</p>
        <p className="text-sm text-muted">alerta em 48,6% · prudencial em 51,3% · máximo 54%</p>
      </div>
      {/* Lista com fio, e não cartões dentro do painel: cartão dentro de
          cartão era o "bloco pesado" da revisão de acabamento. */}
      <dl className="grid divide-y divide-[color:var(--border)] border-y border-border">
        <div className="py-3.5">
          <dt className="text-xs text-muted">Próximo prazo no Tesouro</dt>
          <dd className="text-lg font-semibold mt-1">RGF do 3º quadrimestre</dd>
        </div>
        <div className="py-3.5">
          <dt className="text-xs text-muted">Mínimos do ano</dt>
          <dd className="text-sm mt-1">
            Educação <span className="font-semibold tabular-nums">23,1%</span> de 25% · faltam R$ 1,2 mi em 3 meses
          </dd>
        </div>
      </dl>
      <div className="sm:col-span-2 -mt-6">
        <Conclusao tom="medio" problema="O RGF do 3º quadrimestre vence em 12 dias e ainda não consta entregue.">
          A despesa com pessoal está em 47,8%, a 0,8 ponto do alerta: o próximo relatório já sai perto da linha.
        </Conclusao>
      </div>
    </div>
  );
}

/** Saúde: a rede de unidades, e a que precisa de você hoje. */
function Rede() {
  const reduzir = useReducedMotion();
  const unidades = [
    { n: "UBS Centro", s: 0 }, { n: "UBS Vila Nova", s: 2 }, { n: "UBS Boa Vista", s: 0 }, { n: "UPA 24h", s: 1 },
    { n: "UBS Planalto", s: 0 }, { n: "CAPS", s: 0 }, { n: "UBS Rural I", s: 0 }, { n: "UBS São José", s: 0 },
    { n: "Hospital Municipal", s: 1 }, { n: "UBS Rural II", s: 0 }, { n: "UBS Jardim", s: 0 }, { n: "Farmácia Central", s: 0 },
  ];
  const cor = ["var(--info)", "var(--medio)", "var(--urgente)"];
  return (
    <div className="flex-1 flex flex-col justify-center">
      <Rotulo>Exemplo: a rede trazida do CNES, cada unidade com a sua situação</Rotulo>
      <ul className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
        {unidades.map((u, i) => (
          <m.li
            key={u.n}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduzir ? { duration: 0 } : { delay: i * 0.04, duration: 0.35, ease }}
            className="rounded-xl border px-2.5 py-2 text-xs leading-tight"
            style={{ borderColor: u.s === 2 ? "var(--urgente-borda)" : "var(--border)", background: u.s === 2 ? "var(--urgente-tint)" : "transparent" }}
          >
            <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: cor[u.s] }} />
            {u.n}
          </m.li>
        ))}
      </ul>
      <Conclusao tom="urgente" problema="UBS Vila Nova precisa de você hoje.">
        Geladeira de vacinas parada há 2 dias, aberta como urgente. Insulina com 6 dias de cobertura: o pedido de reposição já
        saiu.
      </Conclusao>
    </div>
  );
}

/** Educação: os 200 dias letivos, um quadradinho por dia. */
function Calendario() {
  const reduzir = useReducedMotion();
  const dados = 166;
  const perdidos = new Set([31, 32, 77, 120, 121, 150]);
  return (
    <div className="flex-1 flex flex-col justify-center">
      <Rotulo>Exemplo: o calendário da rede, contra os 200 dias da LDB</Rotulo>
      <div className="mt-4 grid gap-[3px]" style={{ gridTemplateColumns: "repeat(25, minmax(0, 1fr))" }} aria-hidden>
        {Array.from({ length: 200 }, (_, i) => (
          <m.span
            key={i}
            className="aspect-square rounded-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reduzir ? { duration: 0 } : { delay: Math.min(i, dados) * 0.004, duration: 0.2 }}
            style={{
              background: perdidos.has(i) ? "var(--urgente)" : i < dados ? "var(--brand)" : "var(--sutil)",
            }}
          />
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
        <p>
          <span className="text-3xl font-semibold tabular-nums tracking-[-0.03em]">160</span>
          <span className="text-sm text-muted"> de 200 dias dados</span>
        </p>
        <p>
          <span className="text-3xl font-semibold tabular-nums tracking-[-0.03em]" style={{ color: "var(--urgente)" }}>
            6
          </span>
          <span className="text-sm text-muted"> perdidos (greve e chuva)</span>
        </p>
      </div>
      <Conclusao tom="medio" problema="Folga de 2 dias para fechar os 200.">
        Faltam 40 dias para os 200, e o calendário tem 42 dias de aula até dezembro. Mais uma chuva e não fecha.
      </Conclusao>
    </div>
  );
}

/** Obras: o prazo do contrato consumido contra o que foi medido. */
function PrazoContraObra() {
  const reduzir = useReducedMotion();
  const barra = (rotulo: string, pct: number, cor: string, atraso = 0) => (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-muted">{rotulo}</span>
        <span className="font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="h-4 rounded-full overflow-hidden" style={{ background: "var(--sutil)" }}>
        <m.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={reduzir ? { duration: 0 } : { duration: 1.1, delay: atraso, ease }}
          style={{ background: cor }}
        />
      </div>
    </div>
  );
  return (
    <div className="flex-1 flex flex-col justify-center">
      <Rotulo>Exemplo: contrato trazido do PNCP, medição lançada pela secretaria</Rotulo>
      <p className="mt-3 text-xl font-semibold tracking-[-0.02em]">Creche do Bairro São José</p>
      <p className="text-sm text-muted">Contrato de R$ 2,4 mi · término em 18/03/2027</p>
      <div className="mt-6 grid gap-5">
        {barra("Prazo do contrato já consumido", 82, "var(--medio)")}
        {barra("Obra medida", 41, "var(--brand)", 0.25)}
      </div>
      <Conclusao tom="urgente" problema="Faltam 18% do prazo para 59% da obra.">
        Sem medição há 47 dias. A notificação à contratada, pedindo as razões e o cronograma, já sai montada para o fiscal
        conferir.
      </Conclusao>
    </div>
  );
}

/** Licitações: as dispensas do mesmo objeto somadas contra o limite do ano. */
function Dispensas({ limite }: { limite: number }) {
  const reduzir = useReducedMotion();
  const compras = [
    { quando: "fev", valor: 14200 },
    { quando: "abr", valor: 11800 },
    { quando: "jun", valor: 16350 },
    { quando: "ago", valor: 9900 },
    { quando: "set", valor: 7300 },
  ];
  const total = compras.reduce((t, c) => t + c.valor, 0);
  const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  let acumulado = 0;
  return (
    <div className="flex-1 flex flex-col justify-center">
      <Rotulo>Exemplo: contratos do PNCP com o mesmo objeto, somados no exercício</Rotulo>
      <p className="mt-3 text-xl font-semibold tracking-[-0.02em]">Material de limpeza, cinco dispensas</p>
      <div className="mt-6 relative">
        <div className="flex h-10 rounded-xl overflow-hidden gap-[2px]" style={{ background: "var(--sutil)" }}>
          {compras.map((c, i) => {
            acumulado += c.valor;
            return (
              <m.div
                key={c.quando}
                className="h-full flex items-end justify-center pb-1 text-[11px] font-medium"
                initial={{ width: 0 }}
                animate={{ width: `${(c.valor / limite) * 100}%` }}
                transition={reduzir ? { duration: 0 } : { duration: 0.5, delay: i * 0.18, ease }}
                style={{ background: acumulado / limite > 0.85 ? "var(--medio)" : "var(--brand)", color: "var(--sobre-forte)" }}
              >
                {c.quando}
              </m.div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-muted mt-2">
          <span>R$ 0</span>
          <span>limite de dispensa: {reais(limite)}</span>
        </div>
      </div>
      <p className="mt-5">
        <span className="text-3xl font-semibold tabular-nums tracking-[-0.03em]">{Math.round((total / limite) * 100)}%</span>
        <span className="text-sm text-muted"> do limite usado ({reais(total)})</span>
      </p>
      <Conclusao tom="medio" problema="Mais uma compra dessas passa do limite e vira fracionamento.">
        O plano de contratações do ano que vem já sai montado deste histórico.
      </Conclusao>
    </div>
  );
}
