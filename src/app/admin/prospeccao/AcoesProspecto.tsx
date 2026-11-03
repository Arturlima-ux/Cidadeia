"use client";

import { useState, useTransition } from "react";
import { ETAPAS, ROTULO_SITUACAO, type Situacao } from "@/lib/prospeccao";
import { anotar, apagarProspecto, definirProxima, mudarSituacao, registrarFollowup } from "./actions";

// As ações de um prospecto. O botão de destaque é o passo seguinte do funil;
// o resto fica num "Mais", para o cartão não virar um painel de controle.

const botao = "whitespace-nowrap rounded-full border border-border px-3.5 py-2 text-xs font-medium hover:border-brand transition disabled:opacity-50";
const campo = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";

export default function AcoesProspecto({ id, situacao, hoje }: { id: string; situacao: Situacao; hoje: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [acao, setAcao] = useState("");
  const [data, setData] = useState(hoje);

  const rodar = (f: () => Promise<{ ok: boolean; erro?: string }>, depois?: () => void) =>
    iniciar(async () => {
      const r = await f();
      setErro(r.ok ? null : r.erro ?? "Não deu certo.");
      if (r.ok) depois?.();
    });

  const i = ETAPAS.indexOf(situacao as (typeof ETAPAS)[number]);
  const seguinte = i >= 0 && i < ETAPAS.length - 1 ? ETAPAS[i + 1] : situacao === "pausada" ? "abordada" : null;

  return (
    // Largura fixa e conteúdo preso no topo: sem isso a coluna esticava até a
    // altura do cartão e o botão do passo seguinte virava uma pílula alta.
    <div className="grid content-start gap-2 justify-items-start lg:justify-items-end lg:w-[22rem]">
      <div className="flex flex-wrap items-start gap-1.5 lg:justify-end">
        {seguinte && (
          <button
            type="button"
            disabled={pendente}
            onClick={() => rodar(() => mudarSituacao(id, seguinte))}
            className="whitespace-nowrap rounded-full bg-brand text-white px-3.5 py-2 text-xs font-semibold hover:bg-brand-dark transition disabled:opacity-50"
          >
            {situacao === "pausada" ? "Reativar" : `Passar para ${ROTULO_SITUACAO[seguinte].toLowerCase()}`}
          </button>
        )}
        {situacao === "abordada" && (
          <button type="button" disabled={pendente} onClick={() => rodar(() => registrarFollowup(id))} className={botao}>
            Fiz o follow-up, sem resposta
          </button>
        )}
      </div>

      <details className="w-full">
        <summary className="cursor-pointer text-xs text-muted hover:text-foreground lg:text-right">Mais ações</summary>
        <div className="mt-3 grid gap-3 rounded-2xl border border-border p-3" style={{ background: "var(--background)" }}>
          <label className="grid gap-1.5">
            <span className="text-xs text-muted">Mudar a etapa</span>
            <select
              className={campo}
              value=""
              disabled={pendente}
              onChange={(e) => {
                const s = e.target.value as Situacao;
                if (s) rodar(() => mudarSituacao(id, s, nota), () => setNota(""));
              }}
            >
              <option value="">Escolha…</option>
              {[...ETAPAS, "pausada", "descartada"]
                .filter((s) => s !== situacao)
                .map((s) => (
                  <option key={s} value={s}>
                    {ROTULO_SITUACAO[s as Situacao]}
                  </option>
                ))}
            </select>
          </label>

          <form
            className="grid gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              rodar(() => definirProxima(id, acao, data), () => setAcao(""));
            }}
          >
            <span className="text-xs text-muted">Próxima ação</span>
            <input className={campo} value={acao} onChange={(e) => setAcao(e.target.value)} maxLength={160} placeholder="Ligar para a secretaria" />
            <div className="flex gap-2">
              <input type="date" className={campo} value={data} min={hoje} onChange={(e) => setData(e.target.value)} />
              <button type="submit" disabled={pendente || !acao.trim()} className={botao}>
                Agendar
              </button>
            </div>
          </form>

          <form
            className="grid gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              rodar(() => anotar(id, nota), () => setNota(""));
            }}
          >
            <span className="text-xs text-muted">Anotar (o que a pessoa disse, uma objeção, um combinado)</span>
            <textarea className={campo} rows={2} value={nota} onChange={(e) => setNota(e.target.value)} maxLength={1000} />
            <button type="submit" disabled={pendente || !nota.trim()} className={`${botao} justify-self-start`}>
              Anotar
            </button>
          </form>

          <button
            type="button"
            disabled={pendente}
            onClick={() => {
              if (window.confirm("Apagar este prospecto e todo o histórico dele? Não tem volta.")) rodar(() => apagarProspecto(id));
            }}
            className="justify-self-start text-xs font-medium hover:underline"
            style={{ color: "var(--urgente)" }}
          >
            Apagar (pediu para não ser procurado)
          </button>
        </div>
      </details>

      {erro && (
        <p role="alert" className="text-xs font-medium" style={{ color: "var(--urgente)" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
