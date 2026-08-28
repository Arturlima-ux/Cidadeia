"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// Paleta de status validada (references/palette.md do skill de dataviz) —
// ordem fixa por severidade, nunca por contagem.
const STATUS = [
  { chave: "urgente", label: "Urgente", cor: "#d03b3b" },
  { chave: "medio", label: "Médio", cor: "#fab219" },
  { chave: "info", label: "Informação", cor: "#0ca30c" },
] as const;

export default function BarraAlertasPrioridade({
  contagens,
}: {
  contagens: Record<string, number>;
}) {
  const dados = STATUS.map((s) => ({
    label: s.label,
    valor: contagens[s.chave] ?? 0,
    cor: s.cor,
  })).filter((d) => d.valor > 0);

  const total = dados.reduce((acc, d) => acc + d.valor, 0);

  if (total === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-3">
        Alertas em aberto por prioridade
      </p>
      <div className="flex items-center gap-4">
        <div style={{ width: 110, height: 110 }} className="shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={dados}
                dataKey="valor"
                nameKey="label"
                innerRadius={32}
                outerRadius={50}
                paddingAngle={dados.length > 1 ? 3 : 0}
                startAngle={90}
                endAngle={450}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {dados.map((d) => (
                  <Cell key={d.label} fill={d.cor} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, nome) => [`${v} alerta${Number(v) > 1 ? "s" : ""}`, String(nome)]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5">
          {dados.map((d) => (
            <div key={d.label} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.cor }} />
                {d.label}
              </span>
              <span className="font-semibold tabular-nums">{d.valor}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
