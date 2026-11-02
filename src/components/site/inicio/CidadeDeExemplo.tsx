"use client";

import { useId } from "react";

// ── A CIDADE DE EXEMPLO, NO MAPA (novembro de 2026) ──
//
// Os módulos de Saúde, Obras e Gestão têm mapa da cidade no sistema (Leaflet
// com OpenStreetMap, components/MapaSecretaria.tsx), mas na home o visitante
// só lia a palavra "mapa". Pedido do fundador: mostrar o mapa na vitrine dos
// módulos, para ele pesar na venda.
//
// Aqui é um desenho, e não o mapa de verdade: a cidade é fictícia (os pontos
// são de exemplo, como o resto da vitrine) e um mapa de ruas real com pontos
// inventados confundiria. Também poupa a home de baixar a biblioteca e os
// azulejos do OpenStreetMap. Quadras são um padrão de linhas girado por
// bairro; avenidas e rio por cima; os pontos entram um a um e o destaque
// pulsa (transform e opacidade, só CSS: com o motion, os grupos do SVG
// ficavam presos no estado inicial, invisíveis). Só tokens de cor.

export type PontoDaCidade = {
  nome: string;
  x: number;
  y: number;
  cor: "info" | "medio" | "urgente";
  destaque?: boolean;
};

const BAIRROS: { nome: string; forma: string; giro: number; rotulo: [number, number] }[] = [
  { nome: "Planalto", forma: "M18 18 L132 12 L140 82 L28 94 Z", giro: 8, rotulo: [40, 36] },
  { nome: "Centro", forma: "M146 72 L226 62 L232 134 L152 142 Z", giro: 0, rotulo: [162, 128] },
  { nome: "Vila Nova", forma: "M236 16 L342 22 L338 100 L244 108 Z", giro: -12, rotulo: [300, 40] },
  { nome: "São José", forma: "M28 124 L138 152 L132 224 L22 216 Z", giro: 15, rotulo: [34, 140] },
  { nome: "Jardim", forma: "M150 164 L238 154 L246 228 L156 232 Z", giro: -5, rotulo: [212, 222] },
  { nome: "Boa Vista", forma: "M252 126 L342 118 L346 224 L258 228 Z", giro: 20, rotulo: [300, 140] },
];

const AVENIDAS = [
  "M0 112 C 80 102, 150 104, 360 94",
  "M186 0 C 180 80, 194 160, 204 240",
  "M14 240 L140 146 L242 110 L360 44",
];

const RIO = "M-10 236 C 40 214, 92 196, 142 150 S 236 132, 266 112 S 330 80, 370 70";

const ESTILO = `
.cidade-ponto { transform-box: fill-box; transform-origin: center; animation: cidade-entra 350ms var(--saida) both; }
@keyframes cidade-entra { from { opacity: 0; transform: scale(0.6); } }
.cidade-pulso { transform-box: fill-box; transform-origin: center; animation: cidade-pulso 2.4s var(--saida) infinite; }
@keyframes cidade-pulso { from { opacity: 0.7; transform: scale(0.5); } 75%, to { opacity: 0; transform: scale(1.6); } }
@media (prefers-reduced-motion: reduce) { .cidade-ponto { animation: none; } .cidade-pulso { animation: none; opacity: 0.35; } }
`;

export default function CidadeDeExemplo({
  pontos,
  descricao,
  className = "",
}: {
  pontos: PontoDaCidade[];
  /** O que o mapa mostra, para o leitor de tela. */
  descricao: string;
  className?: string;
}) {
  const base = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 360 240" className={`block w-full h-auto rounded-2xl ${className}`} role="img" aria-label={descricao}>
      <style href="cidadeia-cidade-exemplo" precedence="medium">
        {ESTILO}
      </style>
      <defs>
        {BAIRROS.map((b, i) => (
          <pattern
            key={b.nome}
            id={`${base}-quadra-${i}`}
            width="11"
            height="11"
            patternUnits="userSpaceOnUse"
            patternTransform={`rotate(${b.giro})`}
          >
            <path d="M0 0.5 H11 M0.5 0 V11" stroke="var(--foreground)" strokeOpacity="0.07" strokeWidth="1" fill="none" />
          </pattern>
        ))}
      </defs>
      <rect width="360" height="240" fill="var(--superficie)" />
      {BAIRROS.map((b, i) => (
        <path key={b.nome} d={b.forma} fill={`url(#${base}-quadra-${i})`} />
      ))}
      {/* o rio: margem na cor do fundo e a água por cima */}
      <path d={RIO} fill="none" stroke="var(--superficie)" strokeWidth="15" strokeLinecap="round" />
      <path d={RIO} fill="none" stroke="var(--info)" strokeOpacity="0.28" strokeWidth="8" strokeLinecap="round" />
      {AVENIDAS.map((d) => (
        <path key={d} d={d} fill="none" stroke="var(--foreground)" strokeOpacity="0.2" strokeWidth="2.2" strokeLinecap="round" />
      ))}
      {BAIRROS.map((b) => (
        <text
          key={b.nome}
          x={b.rotulo[0]}
          y={b.rotulo[1]}
          fill="var(--muted)"
          fontSize="8"
          fontWeight="500"
          letterSpacing="1.2"
          textAnchor="middle"
          style={{ textTransform: "uppercase" }}
        >
          {b.nome}
        </text>
      ))}
      {pontos.map((p, i) => (
        <g key={p.nome} className="cidade-ponto" style={{ animationDelay: `${150 + i * 60}ms` }}>
          {p.destaque && <circle className="cidade-pulso" cx={p.x} cy={p.y} r="12" fill="none" stroke={`var(--${p.cor})`} strokeWidth="1.5" />}
          <circle cx={p.x} cy={p.y} r={p.destaque ? 6 : 4.5} fill={`var(--${p.cor})`} stroke="var(--superficie)" strokeWidth="2" />
          {p.destaque && (
            // Perto da borda direita, o nome vai para o outro lado do ponto.
            <text
              x={p.x > 250 ? p.x - 12 : p.x + 12}
              y={p.y + 3.5}
              textAnchor={p.x > 250 ? "end" : "start"}
              fill="var(--foreground)"
              fontSize="10"
              fontWeight="600"
              paintOrder="stroke"
              stroke="var(--superficie)"
              strokeWidth="3"
            >
              {p.nome}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
