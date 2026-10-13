import { LIMITE_ALERTA, LIMITE_PESSOAL, LIMITE_PRUDENCIAL } from "@/lib/despesa-pessoal";
import { PANORAMA, dataDoPanorama, fracao, numeroBr, passaramDoAlerta } from "@/lib/panorama";

// ── A RÉGUA DO BRASIL, ANTES DE ESCOLHER A CIDADE ──
//
// O topo mostrava um "52,4%" vermelho de um município de exemplo. Quem
// chegava achava que era o da cidade dele, ou que era inventado. Agora, até a
// pessoa escolher o município, a régua mostra o país de verdade: como estão
// as prefeituras que publicaram o RGF, faixa por faixa, com a data da
// conferência. Escolhida a cidade, volta a ReguaLrf com o número dela.
//
// Uma barra só, empilhada: cada faixa da LRF com a sua largura real e o nome
// e a contagem escritos embaixo (cor de status nunca anda sozinha).

const pct = (v: number) => `${v.toFixed(1).replace(".", ",").replace(",0", "")}%`;

export default function ReguaBrasil() {
  const b = PANORAMA.brasil;
  const passaram = passaramDoAlerta(b);
  const abaixo = b.comNumero - passaram;
  const faixas = [
    { nome: "Abaixo do alerta", regua: `até ${pct(LIMITE_ALERTA)}`, valor: abaixo, cor: "var(--info)" },
    { nome: "Alerta", regua: `${pct(LIMITE_ALERTA)} a ${pct(LIMITE_PRUDENCIAL)}`, valor: b.alerta, cor: "var(--medio)" },
    { nome: "Prudencial", regua: `${pct(LIMITE_PRUDENCIAL)} a ${pct(LIMITE_PESSOAL)}`, valor: b.prudencial, cor: "var(--urgente)" },
    { nome: "Acima do limite", regua: `mais de ${pct(LIMITE_PESSOAL)}`, valor: b.acimaDoLimite, cor: "var(--urgente)", forte: true },
  ];

  return (
    <figure
      className="rounded-[22px] border border-border p-6 sm:p-8"
      style={{ background: "var(--card)" }}
      aria-label={`Despesa com pessoal das prefeituras do Brasil: ${numeroBr(passaram)} de ${numeroBr(b.comNumero)} já passaram do alerta da LRF.`}
    >
      <div className="flex items-start justify-between gap-4">
        <figcaption className="text-sm text-muted leading-snug max-w-[24ch]">
          Despesa com pessoal das prefeituras do Brasil
        </figcaption>
        <div className="text-right">
          <p className="text-4xl sm:text-5xl font-semibold tabular-nums tracking-[-0.04em]" style={{ color: "var(--urgente)" }}>
            {numeroBr(passaram)}
          </p>
          <p className="text-xs text-muted mt-1">já passaram do alerta</p>
        </div>
      </div>

      {/* A barra: largura de cada faixa proporcional às prefeituras nela,
          com 2px de fundo entre os trechos. */}
      <div className="mt-8 flex h-3 gap-[2px]" aria-hidden>
        {faixas.map((f, i) => (
          <span
            key={f.nome}
            title={`${f.nome}: ${numeroBr(f.valor)} prefeituras (${fracao(f.valor, b)})`}
            className={`h-full ${i === 0 ? "rounded-l-full" : ""} ${i === faixas.length - 1 ? "rounded-r-full" : ""}`}
            style={{
              width: `${(f.valor / Math.max(1, b.comNumero)) * 100}%`,
              background: f.cor,
              opacity: i === 0 ? 0.35 : f.forte ? 1 : 0.75,
            }}
          />
        ))}
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3">
        {faixas.map((f, i) => (
          <li key={f.nome} className="flex items-start gap-2 text-sm">
            <span
              className="mt-1.5 w-2 h-2 rounded-full shrink-0"
              style={{ background: f.cor, opacity: i === 0 ? 0.35 : f.forte ? 1 : 0.75 }}
            />
            <span className="min-w-0">
              <span className="font-semibold tabular-nums">{numeroBr(f.valor)}</span>{" "}
              <span className="text-muted">{f.nome.toLowerCase()}</span>
              <span className="block text-xs text-muted">{f.regua}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-5 pt-5 border-t border-border text-sm leading-relaxed">
        <span className="font-semibold">E a sua prefeitura?</span>{" "}
        <span className="text-muted">Digite o município e veja o número que ela declarou ao Tesouro.</span>
      </p>
      <p className="mt-3 text-xs text-muted leading-relaxed">
        {numeroBr(b.comNumero)} prefeituras com o RGF publicado. Fonte: Tesouro Nacional (Siconfi), conferência de{" "}
        {dataDoPanorama()}.
      </p>
    </figure>
  );
}
