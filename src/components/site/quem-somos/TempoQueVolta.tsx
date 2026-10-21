"use client";

import { useId, useState } from "react";
import Link from "next/link";

// ── QUANTO TEMPO VOLTA PARA A EQUIPE ──
//
// A conta é da própria pessoa: quantos servidores e quantas horas por semana
// cada um gasta conferindo prazo, limite e relatório. Nenhum número nosso
// entra aqui, nem "economia média dos clientes": a calculadora só mostra, em
// horas por ano, o tamanho do trabalho que a pessoa mesma descreveu, e que é
// exatamente o que o sistema faz sozinho.

const SEMANAS_DE_TRABALHO = 48;
const HORAS_POR_SEMANA_CHEIA = 40;

export default function TempoQueVolta() {
  const id = useId();
  const [pessoas, setPessoas] = useState(2);
  const [horas, setHoras] = useState(4);

  const porAno = pessoas * horas * SEMANAS_DE_TRABALHO;
  const semanasCheias = porAno / HORAS_POR_SEMANA_CHEIA;
  const br = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

  return (
    <div className="rounded-[28px] border border-border p-6 sm:p-10 grid lg:grid-cols-2 gap-10" style={{ background: "var(--card)" }}>
      <div className="grid gap-8 content-start">
        <div>
          <label htmlFor={`${id}-pessoas`} className="flex items-baseline justify-between gap-4">
            <span className="font-medium">Quantas pessoas da equipe conferem prazos e limites?</span>
            <span className="text-2xl font-semibold tabular-nums">{pessoas}</span>
          </label>
          <input
            id={`${id}-pessoas`}
            type="range"
            min={1}
            max={10}
            value={pessoas}
            onChange={(e) => setPessoas(Number(e.target.value))}
            className="mt-3 w-full accent-[color:var(--brand)]"
          />
        </div>
        <div>
          <label htmlFor={`${id}-horas`} className="flex items-baseline justify-between gap-4">
            <span className="font-medium">Quantas horas por semana cada uma gasta nisso?</span>
            <span className="text-2xl font-semibold tabular-nums">{horas}h</span>
          </label>
          <input
            id={`${id}-horas`}
            type="range"
            min={1}
            max={20}
            value={horas}
            onChange={(e) => setHoras(Number(e.target.value))}
            className="mt-3 w-full accent-[color:var(--brand)]"
          />
          <p className="mt-2 text-xs text-muted leading-relaxed">
            Conferir prazos do RREO e do RGF, a despesa com pessoal, os mínimos de saúde e educação, o prazo da ouvidoria.
          </p>
        </div>
      </div>

      <div className="lg:border-l border-border lg:pl-10" aria-live="polite">
        <p className="text-sm text-muted">Pela sua conta, são</p>
        <p className="mt-1 text-5xl sm:text-6xl font-semibold tabular-nums tracking-[-0.045em]">
          {br(porAno)} <span className="text-2xl text-muted tracking-normal">horas por ano</span>
        </p>
        <p className="mt-3 text-muted leading-relaxed">
          O mesmo que {br(semanasCheias)} {semanasCheias < 1.5 ? "semana inteira" : "semanas inteiras"} de trabalho de uma pessoa, só
          conferindo.
        </p>
        <p className="mt-5 leading-relaxed">
          É esse trabalho que o CidadeIA faz sozinho, todo dia. A sua equipe fica com o que só gente faz: decidir e
          atender quem bate à porta da prefeitura.
        </p>
        <Link
          href="/proposta"
          className="elevar inline-block mt-6 bg-brand hover:bg-brand-dark text-white font-semibold rounded-full px-7 py-3.5"
        >
          Receber a proposta
        </Link>
        <p className="mt-3 text-xs text-muted">Conta feita só com os números que você informou, em 48 semanas de trabalho por ano.</p>
      </div>
    </div>
  );
}
