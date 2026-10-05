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
} from "@/lib/despesa-pessoal";

// A régua da LRF é o objeto mais reconhecível do mundo de quem compra: todo
// secretário de fazenda conhece os três patamares do art. 59. Ela abre a
// página no lugar de um gráfico genérico, e o valor corre até cruzar o
// prudencial, que é exatamente o aviso que o produto dá.
//
// Os patamares vêm de lib/despesa-pessoal.ts, a mesma fonte que calcula o
// Raio-X. O valor do exemplo é declarado como exemplo na própria tela.

const EXEMPLO = 52.4;
const INICIO = 30;
const FIM = 60;

const posicao = (v: number) => ((v - INICIO) / (FIM - INICIO)) * 100;
const pct = (v: number) =>
  `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const MARCOS = [
  { valor: LIMITE_ALERTA, nome: "Alerta", cor: "var(--medio)" },
  { valor: LIMITE_PRUDENCIAL, nome: "Prudencial", cor: "var(--urgente)" },
  { valor: LIMITE_PESSOAL, nome: "Máximo", cor: "var(--urgente)" },
];

export default function ReguaLrf() {
  const reduzir = useReducedMotion();
  const valor = useMotionValue(reduzir ? EXEMPLO : INICIO);
  const largura = useTransform(valor, (v) => `${posicao(v)}%`);
  const texto = useTransform(valor, pct);
  const [atual, setAtual] = useState(reduzir ? EXEMPLO : INICIO);

  useMotionValueEvent(valor, "change", (v) => setAtual(v));

  useEffect(() => {
    if (reduzir) {
      valor.set(EXEMPLO);
      return;
    }
    const controle = animate(valor, EXEMPLO, {
      duration: 2.4,
      delay: 0.7,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controle.stop();
  }, [reduzir, valor]);

  const chegou = atual >= EXEMPLO - 0.05;
  const corDoValor =
    atual >= LIMITE_PRUDENCIAL
      ? "var(--urgente)"
      : atual >= LIMITE_ALERTA
        ? "var(--medio)"
        : "var(--foreground)";

  return (
    <figure
      className="rounded-[22px] border border-border p-6 sm:p-8"
      style={{ background: "var(--card)" }}
      aria-label={`Exemplo: despesa com pessoal em ${pct(EXEMPLO)} da receita corrente líquida, acima do limite prudencial de ${pct(LIMITE_PRUDENCIAL)}.`}
    >
      <div className="flex items-baseline justify-between gap-4">
        <figcaption className="text-sm text-muted leading-snug max-w-[26ch]">
          Despesa com pessoal sobre a receita corrente líquida
        </figcaption>
        <motion.span
          className="text-4xl sm:text-5xl font-semibold tabular-nums tracking-[-0.04em] transition-colors duration-500"
          style={{ color: corDoValor }}
          aria-hidden
        >
          {texto}
        </motion.span>
      </div>

      {/* A trilha. As faixas pintam só o trecho entre patamares, com a cor do
          status; o preenchimento corre por cima. */}
      <div className="relative mt-8 h-3 rounded-full mb-1" style={{ background: "var(--sutil)" }} aria-hidden>
        <div
          className="absolute inset-y-0 rounded-r-full"
          style={{
            left: `${posicao(LIMITE_ALERTA)}%`,
            right: 0,
            background: "var(--urgente-tint)",
          }}
        />
        <div
          className="absolute inset-y-0"
          style={{
            left: `${posicao(LIMITE_ALERTA)}%`,
            width: `${posicao(LIMITE_PRUDENCIAL) - posicao(LIMITE_ALERTA)}%`,
            background: "var(--medio-tint)",
          }}
        />
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: largura, background: "var(--foreground)" }}
        />
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-[3px]"
          style={{
            left: largura,
            background: "var(--card)",
            borderColor: "var(--foreground)",
          }}
        />
      </div>

      {/* Os três patamares: risco na trilha e legenda embaixo, cada cor com o
          nome escrito (cor de status nunca anda sozinha, docs/design-system.md).
          Rótulo pendurado em cada risco colidia: 48,6 e 54 ficam a poucos
          pixels um do outro no celular. */}
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
          const passou = atual >= m.valor;
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

      <motion.p
        className="mt-5 pt-5 border-t border-border text-sm leading-relaxed"
        initial={false}
        animate={{ opacity: chegou ? 1 : 0, y: chegou ? 0 : 6 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="font-semibold" style={{ color: "var(--urgente)" }}>
          Limite prudencial atingido.
        </span>{" "}
        <span className="text-muted">
          A partir daqui a prefeitura não pode criar cargo nem conceder aumento
          (LRF, art. 22). O CidadeIA avisa quando o número começa a subir.
        </span>
      </motion.p>
      <p className="mt-3 text-xs text-muted">Município de exemplo.</p>
    </figure>
  );
}
