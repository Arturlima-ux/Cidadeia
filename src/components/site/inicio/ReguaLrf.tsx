"use client";

import { useEffect, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  LIMITE_ALERTA,
  LIMITE_PESSOAL,
  LIMITE_PRUDENCIAL,
  type SituacaoPessoal,
} from "@/lib/despesa-pessoal";
import { formatarMoeda } from "@/lib/formatadores";

// A régua da LRF é o objeto mais reconhecível do mundo de quem compra: todo
// secretário de fazenda conhece os patamares do art. 59. Sem município
// escolhido ela corre um valor de exemplo, dito como exemplo na tela. Com
// município, corre o número que a própria prefeitura declarou no RGF, e a
// primeira dobra vira demonstração ao vivo.
//
// Os patamares vêm de lib/despesa-pessoal.ts, a mesma fonte do Raio-X.

export type DadoRegua =
  | { modo: "exemplo"; aviso?: string }
  | { modo: "carregando"; municipio: string }
  | {
      modo: "real";
      municipio: string;
      percentual: number;
      situacao: SituacaoPessoal;
      periodo: string;
      margemAtePrudencial: number;
      /** A RCL ajustada não veio no anexo; o percentual usa a base de reserva. */
      baseDeReserva: boolean;
    };

const EXEMPLO = 52.4;

const pct = (v: number) =>
  `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const MARCOS = [
  { valor: LIMITE_ALERTA, nome: "Alerta", cor: "var(--medio)" },
  { valor: LIMITE_PRUDENCIAL, nome: "Prudencial", cor: "var(--urgente)" },
  { valor: LIMITE_PESSOAL, nome: "Máximo", cor: "var(--urgente)" },
];

function situacaoDe(v: number): SituacaoPessoal {
  if (v > LIMITE_PESSOAL) return "excedido";
  if (v >= LIMITE_PRUDENCIAL) return "prudencial";
  if (v >= LIMITE_ALERTA) return "alerta";
  return "confortavel";
}

const COR: Record<SituacaoPessoal, string> = {
  confortavel: "var(--info)",
  alerta: "var(--medio)",
  prudencial: "var(--urgente)",
  excedido: "var(--urgente)",
};

const TITULO: Record<SituacaoPessoal, string> = {
  confortavel: "Abaixo do alerta.",
  alerta: "Na faixa de alerta.",
  prudencial: "Limite prudencial atingido.",
  excedido: "Acima do limite da lei.",
};

function explicacao(s: SituacaoPessoal, margem: number | null): string {
  switch (s) {
    case "confortavel":
      return margem !== null
        ? `Cabem mais ${formatarMoeda(margem)} em doze meses até o prudencial, onde começam as vedações.`
        : "Ainda há folga até o prudencial, onde começam as vedações.";
    case "alerta":
      return "Acima de 90% do limite o Tribunal de Contas emite alerta ao município (LRF, art. 59).";
    case "prudencial":
      return "A partir daqui a prefeitura não pode criar cargo nem conceder aumento (LRF, art. 22).";
    case "excedido":
      return "O excedente precisa ser eliminado em dois quadrimestres, um terço já no primeiro (LRF, art. 23).";
  }
}

export default function ReguaLrf({ dado = { modo: "exemplo" } }: { dado?: DadoRegua }) {
  const reduzir = useReducedMotion();
  const alvo = dado.modo === "real" ? dado.percentual : dado.modo === "exemplo" ? EXEMPLO : null;

  // A escala acompanha o número: um município a 23% não pode sair da régua
  // pela esquerda, nem um a 61% pela direita.
  const inicio = Math.min(30, Math.floor(((alvo ?? 30) - 5) / 5) * 5);
  const fim = Math.max(60, Math.ceil(((alvo ?? 60) + 4) / 5) * 5);
  const posicao = (v: number) => Math.min(100, Math.max(0, ((v - inicio) / (fim - inicio)) * 100));

  const valor = useMotionValue(reduzir && alvo !== null ? alvo : inicio);
  const largura = useTransform(valor, (v) => `${posicao(v)}%`);
  const texto = useTransform(valor, pct);
  const [atual, setAtual] = useState(reduzir && alvo !== null ? alvo : inicio);

  useMotionValueEvent(valor, "change", (v) => setAtual(v));

  useEffect(() => {
    if (alvo === null) return;
    if (reduzir) {
      valor.set(alvo);
      return;
    }
    valor.set(inicio);
    const controle = animate(valor, alvo, {
      duration: 2.4,
      delay: dado.modo === "real" ? 0.2 : 0.7,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controle.stop();
  }, [alvo, inicio, reduzir, valor, dado.modo]);

  const carregando = dado.modo === "carregando";
  const chegou = alvo !== null && Math.abs(atual - alvo) < 0.05;
  const situacaoFinal =
    dado.modo === "real" ? dado.situacao : alvo !== null ? situacaoDe(alvo) : "confortavel";
  const corDoValor = situacaoDe(atual) === "confortavel" ? "var(--foreground)" : COR[situacaoDe(atual)];

  const legenda =
    dado.modo === "exemplo"
      ? "Despesa com pessoal sobre a receita corrente líquida"
      : `Despesa com pessoal de ${dado.municipio}`;

  const descricao =
    alvo !== null
      ? `${legenda}: ${pct(alvo)} da receita corrente líquida. ${TITULO[situacaoFinal]}`
      : `Consultando o Tesouro Nacional sobre ${dado.modo === "carregando" ? dado.municipio : ""}.`;

  return (
    <figure
      className="rounded-[22px] border border-border p-6 sm:p-8"
      style={{ background: "var(--card)" }}
      aria-label={descricao}
      aria-busy={carregando}
    >
      <div className="flex items-baseline justify-between gap-4">
        <figcaption className="text-sm text-muted leading-snug max-w-[26ch]">{legenda}</figcaption>
        {carregando ? (
          <span className="h-10 sm:h-12 w-28 rounded-lg animate-pulse" style={{ background: "var(--sutil)" }} />
        ) : (
          <motion.span
            className="text-4xl sm:text-5xl font-semibold tabular-nums tracking-[-0.04em] transition-colors duration-500"
            style={{ color: corDoValor }}
            aria-hidden
          >
            {texto}
          </motion.span>
        )}
      </div>

      {/* A trilha. As faixas pintam o trecho entre patamares com a cor do
          status; o preenchimento corre por cima. */}
      <div className="relative mt-8 mb-1 h-3 rounded-full" style={{ background: "var(--sutil)" }} aria-hidden>
        <div
          className="absolute inset-y-0 rounded-r-full"
          style={{ left: `${posicao(LIMITE_ALERTA)}%`, right: 0, background: "var(--urgente-tint)" }}
        />
        <div
          className="absolute inset-y-0"
          style={{
            left: `${posicao(LIMITE_ALERTA)}%`,
            width: `${posicao(LIMITE_PRUDENCIAL) - posicao(LIMITE_ALERTA)}%`,
            background: "var(--medio-tint)",
          }}
        />
        {!carregando && (
          <>
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: largura, background: "var(--foreground)" }}
            />
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-[3px]"
              style={{ left: largura, background: "var(--card)", borderColor: "var(--foreground)" }}
            />
          </>
        )}
      </div>

      {/* Os três patamares: risco na trilha e legenda embaixo, cada cor com o
          nome escrito (cor de status nunca anda sozinha). Rótulo pendurado em
          cada risco colidia no celular. */}
      <div className="relative h-2.5" aria-hidden>
        {MARCOS.map((m) => (
          <span
            key={m.nome}
            className="absolute top-0 w-px h-2.5 -translate-x-1/2 transition-colors duration-500"
            style={{ left: `${posicao(m.valor)}%`, background: atual >= m.valor ? m.cor : "var(--border)" }}
          />
        ))}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2" aria-hidden>
        {MARCOS.map((m) => {
          const passou = !carregando && atual >= m.valor;
          return (
            <li key={m.nome} className="flex items-center gap-2 text-xs sm:text-sm">
              <span
                className="w-2 h-2 rounded-full transition-colors duration-500"
                style={{ background: passou ? m.cor : "var(--border)" }}
              />
              <span className="text-muted">{m.nome}</span>
              <span
                className="tabular-nums font-medium transition-colors duration-500"
                style={{ color: passou ? "var(--foreground)" : "var(--muted)" }}
              >
                {pct(m.valor).replace(",0%", "%")}
              </span>
            </li>
          );
        })}
      </ul>

      {carregando ? (
        <p className="mt-5 pt-5 border-t border-border text-sm text-muted">
          Lendo o último relatório fiscal de {dado.municipio} no Tesouro Nacional.
        </p>
      ) : (
        <motion.p
          className="mt-5 pt-5 border-t border-border text-sm leading-relaxed"
          initial={false}
          animate={{ opacity: chegou ? 1 : 0, y: chegou ? 0 : 6 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="font-semibold" style={{ color: COR[situacaoFinal] }}>
            {TITULO[situacaoFinal]}
          </span>{" "}
          <span className="text-muted">
            {explicacao(situacaoFinal, dado.modo === "real" ? dado.margemAtePrudencial : null)}
            {dado.modo === "exemplo" && " O CidadeIA avisa quando o número começa a subir."}
          </span>
        </motion.p>
      )}

      <p className="mt-3 text-xs text-muted leading-relaxed">
        {dado.modo === "real"
          ? `Declarado pela prefeitura no ${dado.periodo}. Fonte: Tesouro Nacional, SICONFI.` +
            (dado.baseDeReserva
              ? " O anexo não trouxe a receita ajustada; o percentual usa a base de reserva do mesmo documento."
              : "")
          : dado.modo === "exemplo"
            ? (dado.aviso ?? "Município de exemplo. Escolha o seu para ver o número real.")
            : "Dado público, sem cadastro."}
      </p>
    </figure>
  );
}
