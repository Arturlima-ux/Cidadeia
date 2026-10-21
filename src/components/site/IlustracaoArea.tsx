// ── AS SEIS PARTES DA PREFEITURA, DESENHADAS ──
//
// Ilustrações próprias, em vetor, no traço e nas cores do site: nenhuma
// foto de banco, nenhum rosto inventado. Pessoas aparecem só como silhueta
// abstrata, sem rosto — a cena mostra o lugar e o gesto, e ninguém ali
// pode ser confundido com servidor ou cliente de verdade.
//
// Cores só por token (var(--…)): acompanham o tema e passam no teste de
// design-system, que proíbe cor literal fora de lib/email-modelo.ts.

export type AreaIlustrada = "essencial" | "gestao" | "saude" | "educacao" | "obras" | "licitacoes";

const COR_DA_AREA: Record<AreaIlustrada, string> = {
  essencial: "var(--brand)",
  gestao: "var(--accent)",
  saude: "var(--info)",
  educacao: "var(--medio)",
  obras: "var(--brand-claro)",
  licitacoes: "var(--urgente)",
};

const LINHA = "var(--brand-claro)";
const FUNDO = "var(--superficie)";
const BLOCO = "var(--card)";

export default function IlustracaoArea({
  area,
  className = "",
  titulo,
}: {
  area: AreaIlustrada;
  className?: string;
  /** Texto para leitor de tela. Sem ele, a ilustração é decorativa. */
  titulo?: string;
}) {
  const cor = COR_DA_AREA[area];
  return (
    <svg
      viewBox="0 0 240 150"
      className={className}
      role={titulo ? "img" : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* chão e brilho comuns a todas */}
      <rect x="0" y="0" width="240" height="150" rx="16" fill={FUNDO} />
      <ellipse cx="120" cy="128" rx="96" ry="10" fill={cor} fillOpacity="0.10" />
      <circle cx="196" cy="34" r="40" fill={cor} fillOpacity="0.07" />
      {area === "essencial" && <Atendimento cor={cor} />}
      {area === "gestao" && <Gabinete cor={cor} />}
      {area === "saude" && <Ubs cor={cor} />}
      {area === "educacao" && <Escola cor={cor} />}
      {area === "obras" && <Obra cor={cor} />}
      {area === "licitacoes" && <Compras cor={cor} />}
    </svg>
  );
}

/** Silhueta sem rosto: cabeça e ombros, nada mais. */
function Silhueta({ x, y, cor, escala = 1 }: { x: number; y: number; cor: string; escala?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${escala})`}>
      <circle cx="0" cy="-22" r="8" fill={cor} fillOpacity="0.55" />
      <path d="M-14 4 C-14 -8 -8 -12 0 -12 C8 -12 14 -8 14 4 Z" fill={cor} fillOpacity="0.4" />
    </g>
  );
}

// Balcão de atendimento: o morador, o balcão, a senha e o protocolo no celular.
function Atendimento({ cor }: { cor: string }) {
  return (
    <g>
      {/* painel de senha */}
      <rect x="30" y="20" width="62" height="30" rx="6" fill={BLOCO} stroke={LINHA} strokeOpacity="0.35" />
      <text x="61" y="41" textAnchor="middle" fontSize="15" fontWeight="600" fill={cor}>042</text>
      {/* balcão */}
      <rect x="22" y="88" width="120" height="38" rx="6" fill={BLOCO} stroke={LINHA} strokeOpacity="0.35" />
      <rect x="22" y="84" width="120" height="8" rx="3" fill={cor} fillOpacity="0.5" />
      <Silhueta x={60} y={84} cor={LINHA} />
      {/* celular com o protocolo */}
      <rect x="160" y="40" width="50" height="86" rx="9" fill={BLOCO} stroke={LINHA} strokeOpacity="0.5" />
      <rect x="168" y="54" width="34" height="5" rx="2.5" fill={LINHA} fillOpacity="0.5" />
      <rect x="168" y="64" width="26" height="4" rx="2" fill={LINHA} fillOpacity="0.3" />
      <rect x="166" y="76" width="38" height="24" rx="5" fill={cor} fillOpacity="0.22" stroke={cor} strokeOpacity="0.7" />
      <path d="M176 88 l5 5 l10 -10" stroke={cor} strokeWidth="2.5" />
      {/* balão de conversa */}
      <path d="M118 34 h26 a6 6 0 0 1 6 6 v12 a6 6 0 0 1 -6 6 h-16 l-8 7 v-7 h-2 a6 6 0 0 1 -6 -6 v-12 a6 6 0 0 1 6 -6 z" fill={cor} fillOpacity="0.18" stroke={cor} strokeOpacity="0.6" />
      <rect x="120" y="42" width="22" height="3" rx="1.5" fill={LINHA} fillOpacity="0.6" />
      <rect x="120" y="49" width="14" height="3" rx="1.5" fill={LINHA} fillOpacity="0.4" />
    </g>
  );
}

// Gabinete: o prédio da prefeitura e o painel com o gráfico.
function Gabinete({ cor }: { cor: string }) {
  return (
    <g>
      {/* prédio com colunas */}
      <path d="M24 62 L78 36 L132 62 Z" fill={cor} fillOpacity="0.25" stroke={LINHA} strokeOpacity="0.4" />
      <rect x="28" y="62" width="100" height="62" fill={BLOCO} stroke={LINHA} strokeOpacity="0.35" />
      {[40, 60, 80, 100, 116].map((x) => (
        <rect key={x} x={x - 3} y="70" width="6" height="46" rx="2" fill={LINHA} fillOpacity="0.28" />
      ))}
      <rect x="22" y="122" width="112" height="6" rx="2" fill={LINHA} fillOpacity="0.3" />
      {/* bandeira */}
      <path d="M78 36 V18" stroke={LINHA} strokeOpacity="0.6" strokeWidth="1.5" />
      <path d="M78 18 h16 l-4 5 l4 5 h-16" fill={cor} fillOpacity="0.7" />
      {/* monitor com gráfico */}
      <rect x="148" y="44" width="72" height="52" rx="7" fill={BLOCO} stroke={LINHA} strokeOpacity="0.5" />
      <path d="M156 84 L170 76 L182 79 L196 64 L210 58" stroke={cor} strokeWidth="2.5" />
      <path d="M156 88 L170 85 L184 86 L198 80 L210 78" stroke="var(--medio)" strokeOpacity="0.8" strokeWidth="2" />
      <rect x="178" y="96" width="12" height="14" fill={LINHA} fillOpacity="0.3" />
      <rect x="166" y="110" width="36" height="5" rx="2.5" fill={LINHA} fillOpacity="0.35" />
    </g>
  );
}

// UBS: a unidade com a cruz, a prateleira de remédios e o termômetro do estoque.
function Ubs({ cor }: { cor: string }) {
  return (
    <g>
      <rect x="26" y="50" width="108" height="74" rx="6" fill={BLOCO} stroke={LINHA} strokeOpacity="0.35" />
      <rect x="20" y="44" width="120" height="10" rx="4" fill={cor} fillOpacity="0.45" />
      {/* cruz */}
      <rect x="70" y="20" width="20" height="20" rx="4" fill={cor} fillOpacity="0.25" stroke={cor} strokeOpacity="0.8" />
      <path d="M80 25 v10 M75 30 h10" stroke={cor} strokeWidth="3" />
      {/* porta e janelas */}
      <rect x="68" y="88" width="24" height="36" rx="3" fill={cor} fillOpacity="0.2" stroke={cor} strokeOpacity="0.5" />
      <rect x="38" y="66" width="20" height="16" rx="3" fill={LINHA} fillOpacity="0.2" />
      <rect x="102" y="66" width="20" height="16" rx="3" fill={LINHA} fillOpacity="0.2" />
      {/* prateleira */}
      <rect x="152" y="40" width="66" height="84" rx="6" fill={BLOCO} stroke={LINHA} strokeOpacity="0.45" />
      {[58, 84, 110].map((y) => (
        <path key={y} d={`M156 ${y} h58`} stroke={LINHA} strokeOpacity="0.35" />
      ))}
      {/* caixas de remédio em cada prateleira; as amarelas estão acabando */}
      {([[160, 46, 58, 1], [172, 48, 58, 1], [184, 50, 58, 0], [160, 70, 84, 1], [174, 72, 84, 1], [190, 70, 84, 1], [204, 76, 84, 0], [162, 96, 110, 1], [178, 102, 110, 0]] as const).map(([x, y, chao, cheio], i) => (
        <rect key={i} x={x} y={y} width="10" height={chao - y - 1} rx="2" fill={cheio ? cor : "var(--medio)"} fillOpacity={cheio ? 0.55 : 0.7} />
      ))}
    </g>
  );
}

// Escola: o prédio com o sino, o livro e o prato da merenda.
function Escola({ cor }: { cor: string }) {
  return (
    <g>
      <path d="M30 64 L82 38 L134 64 Z" fill={cor} fillOpacity="0.3" stroke={LINHA} strokeOpacity="0.4" />
      <rect x="34" y="64" width="96" height="60" fill={BLOCO} stroke={LINHA} strokeOpacity="0.35" />
      {/* sino */}
      <path d="M76 52 a6 6 0 0 1 12 0 v4 h-12 z" fill={cor} fillOpacity="0.8" />
      {/* janelas e porta */}
      {[44, 64, 100, 112].map((x, i) => (
        <rect key={i} x={x} y="74" width="12" height="12" rx="2" fill={LINHA} fillOpacity="0.22" />
      ))}
      <rect x="72" y="96" width="20" height="28" rx="3" fill={cor} fillOpacity="0.22" stroke={cor} strokeOpacity="0.5" />
      {/* livro aberto */}
      <path d="M150 58 q16 -8 30 0 v40 q-14 -8 -30 0 z" fill={BLOCO} stroke={LINHA} strokeOpacity="0.55" />
      <path d="M180 58 q14 -8 30 0 v40 q-16 -8 -30 0 z" fill={BLOCO} stroke={LINHA} strokeOpacity="0.55" />
      {[66, 74, 82].map((y) => (
        <g key={y}>
          <path d={`M156 ${y} q10 -4 18 0`} stroke={LINHA} strokeOpacity="0.35" />
          <path d={`M186 ${y} q10 -4 18 0`} stroke={LINHA} strokeOpacity="0.35" />
        </g>
      ))}
      {/* prato da merenda */}
      <ellipse cx="182" cy="118" rx="24" ry="7" fill={BLOCO} stroke={LINHA} strokeOpacity="0.5" />
      <ellipse cx="182" cy="116" rx="14" ry="4" fill={cor} fillOpacity="0.5" />
    </g>
  );
}

// Obra: o guindaste, a estrutura subindo e a barra de medição.
function Obra({ cor }: { cor: string }) {
  return (
    <g>
      {/* guindaste */}
      <path d="M52 124 V22 M52 22 H150 M52 34 L64 22 M150 22 V40" stroke={LINHA} strokeOpacity="0.6" strokeWidth="3" />
      {[34, 50, 66, 82, 98, 114].map((y) => (
        <path key={y} d={`M46 ${y} l12 10 M58 ${y} l-12 10`} stroke={LINHA} strokeOpacity="0.25" />
      ))}
      <rect x="140" y="40" width="20" height="12" rx="2" fill={cor} fillOpacity="0.6" />
      {/* estrutura em construção */}
      <rect x="96" y="70" width="70" height="54" fill={BLOCO} stroke={LINHA} strokeOpacity="0.4" />
      <path d="M96 88 h70 M96 106 h70 M119 70 v54 M143 70 v54" stroke={LINHA} strokeOpacity="0.3" />
      <rect x="96" y="58" width="44" height="12" fill={BLOCO} stroke={LINHA} strokeOpacity="0.4" strokeDasharray="3 3" />
      {/* medição: progresso contra o prazo */}
      <rect x="180" y="58" width="40" height="66" rx="6" fill={BLOCO} stroke={LINHA} strokeOpacity="0.45" />
      <rect x="188" y="72" width="8" height="44" rx="3" fill={LINHA} fillOpacity="0.15" />
      <rect x="188" y="88" width="8" height="28" rx="3" fill={cor} fillOpacity="0.8" />
      <rect x="204" y="72" width="8" height="44" rx="3" fill={LINHA} fillOpacity="0.15" />
      <rect x="204" y="82" width="8" height="34" rx="3" fill="var(--medio)" fillOpacity="0.7" />
    </g>
  );
}

// Compras: o processo, o contrato assinado e a caixa entregue.
function Compras({ cor }: { cor: string }) {
  return (
    <g>
      {/* pilha de processos */}
      <rect x="30" y="42" width="66" height="82" rx="6" fill={BLOCO} stroke={LINHA} strokeOpacity="0.3" transform="rotate(-6 63 83)" />
      <rect x="36" y="38" width="66" height="82" rx="6" fill={BLOCO} stroke={LINHA} strokeOpacity="0.5" />
      {[54, 64, 74, 84].map((y, i) => (
        <rect key={y} x="46" y={y} width={i === 3 ? 26 : 46} height="4" rx="2" fill={LINHA} fillOpacity="0.35" />
      ))}
      <path d="M48 104 q8 -8 14 0 t14 0" stroke={cor} strokeWidth="2" />
      {/* selo */}
      <circle cx="88" cy="106" r="9" fill={cor} fillOpacity="0.25" stroke={cor} strokeOpacity="0.8" />
      <path d="M84 106 l3 3 l6 -6" stroke={cor} strokeWidth="2" />
      {/* caixa entregue */}
      <path d="M130 78 L160 64 L190 78 L160 92 Z" fill={cor} fillOpacity="0.35" stroke={LINHA} strokeOpacity="0.5" />
      <path d="M130 78 V108 L160 122 V92 Z" fill={BLOCO} stroke={LINHA} strokeOpacity="0.5" />
      <path d="M190 78 V108 L160 122 V92 Z" fill={cor} fillOpacity="0.15" stroke={LINHA} strokeOpacity="0.5" />
      <path d="M145 71 L175 85 V97" stroke={LINHA} strokeOpacity="0.45" />
      {/* lista conferida */}
      <rect x="196" y="30" width="30" height="40" rx="5" fill={BLOCO} stroke={LINHA} strokeOpacity="0.45" />
      {[40, 50, 60].map((y) => (
        <g key={y}>
          <path d={`M201 ${y} l2 2 l4 -4`} stroke={cor} strokeWidth="1.5" />
          <rect x="210" y={y - 2} width="12" height="3" rx="1.5" fill={LINHA} fillOpacity="0.35" />
        </g>
      ))}
    </g>
  );
}
