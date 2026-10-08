import Link from "next/link";
import {
  PANORAMA,
  dataDoPanorama,
  faixasDoPanorama,
  fracao,
  numeroBr,
  type ContagemPanorama,
} from "@/lib/panorama";

// ── O BRASIL NA RÉGUA DA LRF ──
//
// Três barras, uma por faixa da despesa com pessoal, com a consequência e o
// artigo de cada uma. Os números vêm da conferência semanal (lib/panorama.ts)
// e cada barra é proporcional ao total de prefeituras com o RGF publicado:
// a barra cheia seria o país inteiro.

export default function BarrasPanorama({
  contagem = PANORAMA.brasil,
  onde = "do Brasil",
  comLinks = true,
}: {
  contagem?: ContagemPanorama;
  /** "do Brasil", "de Minas Gerais"… */
  onde?: string;
  comLinks?: boolean;
}) {
  const faixas = faixasDoPanorama(contagem);
  return (
    <div className="rounded-[28px] border border-border p-6 sm:p-10" style={{ background: "var(--card)" }}>
      <p className="text-sm text-muted">
        Despesa com pessoal das prefeituras {onde}, conferência de {dataDoPanorama()}
      </p>
      <p className="mt-2 text-2xl sm:text-3xl font-semibold tracking-[-0.03em] max-w-[34ch]">
        Das {numeroBr(contagem.comNumero)} prefeituras com o RGF publicado:
      </p>
      <ul className="mt-8 grid gap-7">
        {faixas.map((f) => {
          const largura = (f.valor / Math.max(1, contagem.comNumero)) * 100;
          return (
            <li key={f.chave}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <p>
                  <span className="text-3xl font-semibold tabular-nums tracking-[-0.04em]" style={{ color: f.cor }}>
                    {numeroBr(f.valor)}
                  </span>{" "}
                  <span className="font-medium">{f.rotulo}</span>{" "}
                  <span className="text-sm text-muted">({f.regua})</span>
                </p>
                <p className="text-sm text-muted tabular-nums">{fracao(f.valor, contagem)}</p>
              </div>
              <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "var(--sutil)" }} aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${Math.max(largura, 0.6)}%`, background: f.cor }} />
              </div>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                {f.consequencia} <span className="text-xs">({f.base})</span>
              </p>
            </li>
          );
        })}
      </ul>
      <p className="mt-8 text-sm text-muted leading-relaxed max-w-[70ch]">
        Além disso, {numeroBr(contagem.rgfAtrasado)} estavam com o RGF seguinte vencido e ainda não entregue, e{" "}
        {numeroBr(contagem.numerosQueNaoFecham)} tinham números que não fecham no relatório mais recente.
      </p>
      <p className="mt-3 text-xs text-muted">
        Fonte: Tesouro Nacional (Siconfi), RGF mais recente de cada prefeitura, conferido pelo CidadeIA. Os
        percentuais são os que cada prefeitura declarou.
      </p>
      {comLinks && (
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
          <Link href="/panorama" className="inicio-sublinhado text-sm">
            Ver por estado
          </Link>
          <Link href="/raio-x" className="inicio-sublinhado text-sm text-muted">
            Ver onde está a sua cidade
          </Link>
        </div>
      )}
    </div>
  );
}
