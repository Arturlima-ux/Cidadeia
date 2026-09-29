"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { PERCENTUAL_MINIMO_AF, type PontoPnae } from "@/lib/pnae";

// ── O ANO CONTRA OS 30% ──
//
// Um gráfico só se justifica quando o dado tem FORMA. Aqui tem: uma curva
// que sobe contra uma linha horizontal, e a pergunta que ela responde —
// "no ritmo de hoje eu chego até dezembro?" — é a única do módulo que o
// número sozinho não responde.
//
// As outras telas continuam tabelas de propósito. Item, saldo, situação e
// quantidade a pedir são colunas de naturezas diferentes; viram tabela,
// não gráfico.
//
// ── DECISÕES DE DESENHO ──
//
// Uma série só, então nenhuma legenda: o título diz o que a linha é.
//
// A meta é uma LINHA DE REFERÊNCIA, não uma segunda série — ela não é um
// dado medido, é o piso da lei. Vem tracejada e com rótulo, para nunca ser
// lida como "a outra curva".
//
// Eixo Y começa em zero e vai até um teto que sempre contém a meta. Cortar
// o eixo para "dar destaque" é a forma mais comum de gráfico mentir, e num
// número que vai à prestação de contas isso não se faz.
//
// Os meses futuros ficam com a área apagada: a linha continua desenhada
// (o ano é o palco) mas sem fingir compra que não aconteceu.
//
// Cor: a série usa --brand; a meta usa --urgente quando estamos abaixo e
// --accent quando já passamos. Nunca é a cor sozinha que informa — o
// rótulo na linha diz "mínimo legal: 30%", e a tabela de compras logo
// abaixo é a visão alternativa que a acessibilidade exige.

type Props = {
  serie: PontoPnae[];
  atingiu: boolean;
  /** Para o texto alternativo: o percentual de hoje. */
  percentualAtual: number | null;
};

const moeda = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function GraficoPnae({ serie, atingiu, percentualAtual }: Props) {
  if (serie.length === 0) return null;

  const corSerie = "var(--brand-claro)";
  const corMeta = atingiu ? "var(--accent)" : "var(--urgente)";
  const maximo = Math.max(PERCENTUAL_MINIMO_AF * 1.25, ...serie.map((p) => p.percentual)) ;
  const fechados = serie.filter((p) => !p.futuro);
  const ultimoFechado = fechados[fechados.length - 1];

  return (
    <figure className="rounded-2xl border border-border p-4 sm:p-5" style={{ background: "var(--card)" }}>
      <figcaption className="mb-4">
        <h3 className="font-semibold text-sm">Agricultura familiar acumulada no ano</h3>
        <p className="text-xs text-muted mt-1 leading-relaxed">
          Percentual do repasse do PNAE já comprado do produtor local, mês a mês. A linha tracejada é o
          mínimo de {PERCENTUAL_MINIMO_AF}% do art. 14.
        </p>
      </figcaption>

      {/* O leitor de tela recebe a conclusão, não a série ponto a ponto —
          e a tabela de compras logo abaixo é a visão completa. */}
      <p className="sr-only">
        {percentualAtual === null
          ? "Sem repasse informado."
          : `Até ${ultimoFechado?.mes ?? "hoje"}, ${percentualAtual.toLocaleString("pt-BR", {
              maximumFractionDigits: 1,
            })}% do repasse foi comprado da agricultura familiar. O mínimo legal é ${PERCENTUAL_MINIMO_AF}%. A tabela de compras abaixo traz cada lançamento.`}
      </p>

      <div className="h-56 sm:h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={serie} margin={{ top: 8, right: 16, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="preenchimento-af" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={corSerie} stopOpacity={0.28} />
                <stop offset="100%" stopColor={corSerie} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            {/* Grade recessiva: horizontal só, para o olho comparar altura. */}
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="mes"
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, Math.ceil(maximo)]}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
              width={46}
            />

            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--muted)", marginBottom: 4 }}
              // A tipagem do recharts entrega `value` como ValueType, que
              // inclui undefined e arranjo. Estreitar aqui é mais honesto
              // que um `as number`: se vier outra coisa, o tooltip mostra
              // travessão em vez de "NaN%".
              formatter={(valor, _nome, item) => {
                const ponto = (item as { payload?: PontoPnae }).payload;
                if (ponto?.futuro) return ["mês ainda não encerrado", "Acumulado"];
                if (typeof valor !== "number") return ["—", "Acumulado"];
                return [
                  `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%${
                    ponto ? ` · ${moeda(ponto.acumulado)}` : ""
                  }`,
                  "Acumulado",
                ];
              }}
            />

            {/* A meta: linha de referência, não série. */}
            <ReferenceLine
              y={PERCENTUAL_MINIMO_AF}
              stroke={corMeta}
              strokeDasharray="6 4"
              strokeWidth={2}
              label={{
                value: `mínimo legal: ${PERCENTUAL_MINIMO_AF}%`,
                position: "insideTopRight",
                fill: corMeta,
                fontSize: 11,
              }}
            />

            <Area
              type="monotone"
              dataKey="percentual"
              stroke={corSerie}
              strokeWidth={2}
              fill="url(#preenchimento-af)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
