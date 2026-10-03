"use client";

import { useState, useTransition } from "react";
import { solicitarProjecao, type ResultadoProjecao } from "@/app/_heroi/projecao-actions";
import { CARGOS_LEAD } from "@/lib/leads";

// ── A TRAVA, E O QUE ELA NÃO PROMETE ──
//
// Os três fatos acima são abertos: dado público. Isto cobra o que é trabalho
// do software — a trajetória sobre vários períodos e o que ainda dá para
// fazer antes da fronteira.
//
// Enquanto o remetente for o gratuito do Resend, a entrega ao solicitante é
// recusada. A tela diz "recebido" e não "enviado", porque dizer "enviado"
// sobre um e-mail que não saiu é a promessa mais fácil de desmentir: a pessoa
// confere a caixa em trinta segundos.

export default function PedirProjecao({
  codigoIbge,
  municipio,
}: {
  codigoIbge: string;
  municipio: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoProjecao | null>(null);

  if (resultado?.ok) {
    return (
      <div
        className="rounded-xl border p-5"
        style={{ background: "var(--info-tint)", borderColor: "var(--info-borda)" }}
      >
        <p className="font-semibold text-sm" style={{ color: "var(--info)" }}>
          {resultado.enviadoParaVoce ? "Enviado." : "Pedido recebido."}
        </p>
        <p className="text-sm text-muted mt-2 leading-relaxed max-w-[58ch]">
          {resultado.enviadoParaVoce
            ? `A projeção de ${municipio} está na sua caixa de entrada.`
            : `A projeção de ${municipio} chega em até um dia útil. Ainda não enviamos por robô: ` +
              `o domínio de envio está em configuração, e preferimos dizer isso a prometer um ` +
              `e-mail que você conferiria em trinta segundos.`}
        </p>
      </div>
    );
  }

  return (
    <form
      className="rounded-xl border border-border p-5"
      style={{ background: "var(--card)" }}
      onSubmit={(e) => {
        e.preventDefault();
        const dados = Object.fromEntries(new FormData(e.currentTarget));
        iniciar(async () => setResultado(await solicitarProjecao({ ...dados, codigoIbge })));
      }}
    >
      <p className="font-semibold text-sm">Onde essa trajetória termina</p>
      <p className="text-sm text-muted mt-2 leading-relaxed max-w-[58ch]">
        Os números acima são públicos e ficam abertos. A projeção do fechamento do exercício e o
        que ainda dá para fazer antes da fronteira legal saem por e-mail institucional.
      </p>

      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        <input
          name="nome"
          required
          placeholder="Seu nome"
          className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
        <select
          name="cargo"
          required
          defaultValue=""
          className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"
        >
          <option value="" disabled>
            Seu cargo
          </option>
          {CARGOS_LEAD.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          name="email"
          type="email"
          required
          placeholder="E-mail institucional"
          className="sm:col-span-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
      </div>

      {resultado && !resultado.ok && (
        <p className="text-sm mt-3" style={{ color: "var(--urgente)" }}>
          {resultado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="elevar mt-4 bg-brand hover:bg-brand-dark text-sm font-semibold rounded-lg px-5 py-2.5 transition disabled:opacity-60"
        style={{ color: "var(--sobre-forte)" }}
      >
        {pendente ? "Montando…" : "Receber a projeção"}
      </button>
    </form>
  );
}
