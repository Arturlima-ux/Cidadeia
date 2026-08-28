"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { projetarProximoPeriodo, MINIMO_PARA_PROJECAO } from "@/lib/projecao";

export type PontoSerie = { data: string; valor: number | null };

function formatarData(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
}

const LABEL_CONFIANCA: Record<string, string> = {
  baixa: "confiança baixa — poucos registros ainda",
  média: "confiança média",
  alta: "confiança alta",
};

export default function GraficoTendencia({
  titulo,
  serie,
  cor = "#1a5c35",
  sufixo = "",
}: {
  titulo: string;
  serie: PontoSerie[];
  cor?: string;
  sufixo?: string;
}) {
  const pontosValidos = serie.filter((p) => p.valor !== null);

  if (pontosValidos.length < 2) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
          {titulo}
        </p>
        <div className="border border-dashed border-border rounded-lg p-6 text-center text-xs text-muted">
          Ainda não há histórico suficiente para mostrar uma tendência —
          precisa de pelo menos 2 atualizações registradas ao longo do tempo.
          {pontosValidos.length === 1 && " (1 registro até agora.)"}
        </div>
      </div>
    );
  }

  const projecao = projetarProximoPeriodo(serie);

  const dadosFormatados = pontosValidos.map((p) => ({
    data: formatarData(p.data),
    valor: p.valor,
    projetado: null as number | null,
  }));

  if (projecao) {
    // Ponto de "ponte": repete o último valor real na série de projeção, pra
    // a linha tracejada nascer exatamente onde a linha real termina.
    dadosFormatados[dadosFormatados.length - 1] = {
      ...dadosFormatados[dadosFormatados.length - 1],
      projetado: dadosFormatados[dadosFormatados.length - 1].valor,
    };
    dadosFormatados.push({
      data: formatarData(projecao.proximaData),
      valor: null,
      projetado: projecao.valorProjetado,
    });
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
        {titulo}
      </p>
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer>
          <LineChart data={dadosFormatados} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" />
            <XAxis dataKey="data" tick={{ fontSize: 11 }} stroke="#999" />
            <YAxis tick={{ fontSize: 11 }} stroke="#999" width={44} />
            <Tooltip
              formatter={(v, nome) => [
                `${v}${sufixo}`,
                nome === "projetado" ? "Projeção" : "Real",
              ]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Line
              type="monotone"
              dataKey="valor"
              stroke={cor}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
              animationDuration={1000}
              animationEasing="ease-out"
            />
            {projecao && (
              <Line
                type="monotone"
                dataKey="projetado"
                stroke={cor}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={{ r: 3 }}
                connectNulls
                animationDuration={1000}
                animationEasing="ease-out"
                animationBegin={1000}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted mt-1">
        {pontosValidos.length} registros reais.
      </p>
      {projecao ? (
        <p className="text-[11px] text-muted mt-0.5">
          Linha tracejada: projeção estatística simples (regressão linear no
          histórico real, não é IA) para ~30 dias à frente —{" "}
          {LABEL_CONFIANCA[projecao.confianca]}.
        </p>
      ) : (
        <p className="text-[11px] text-muted mt-0.5">
          Projeção aparece a partir de {MINIMO_PARA_PROJECAO} registros reais
          (tem {pontosValidos.length} até agora).
        </p>
      )}
    </div>
  );
}
