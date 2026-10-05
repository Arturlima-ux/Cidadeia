import type { Fato } from "@/lib/fatos-do-municipio";

// ── UM FATO, COM TUDO QUE PERMITE DESCONFIAR DELE ──
//
// Número, leitura, de onde veio, que período mede, quando foi consultado e a
// norma que o cria. Sem carteira de clientes para exibir, é isto que constrói
// confiança: não peça fé, confira.
//
// A ausência tem desenho próprio, tracejado, porque ela não é falha da página.
// Município sem relatório publicado é a informação, não a falta dela.

export default function FatoDoMunicipio({ fato }: { fato: Fato }) {
  const ausente = fato.valor === null;

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        background: ausente ? "var(--card)" : "var(--superficie)",
        borderColor: "var(--border)",
        borderStyle: ausente ? "dashed" : "solid",
      }}
    >
      <p className="text-xs font-semibold text-muted">
        {fato.titulo}
      </p>

      {ausente ? (
        <p className="text-sm mt-2 leading-relaxed max-w-[58ch]">{fato.ausencia}</p>
      ) : (
        <>
          <p className="font-serif text-3xl font-bold tabular-nums mt-1.5 leading-none">
            {fato.valor}
          </p>
          <p className="text-sm text-muted mt-2.5 leading-relaxed max-w-[58ch]">{fato.leitura}</p>
        </>
      )}

      {fato.ressalva && (
        <p className="text-xs text-muted mt-3 leading-relaxed max-w-[58ch]">{fato.ressalva}</p>
      )}

      <div className="mt-4 pt-3 border-t border-border flex flex-col gap-1">
        {/* O carimbo é duplo: o período que o dado MEDE e quando o sistema
            consultou. Sem hora, porque o SICONFI publica por bimestre e por
            quadrimestre e hora sugeriria atualização que não existe. */}
        {fato.carimbo && (
          <p className="font-mono text-[11px] text-muted">
            {fato.carimbo.periodo} · consultado em {fato.carimbo.consultadoEm}
          </p>
        )}
        <p className="font-mono text-[11px] text-muted">{fato.fonte}</p>
        <p className="font-mono text-[11px] text-muted">{fato.fundamento}</p>
      </div>
    </div>
  );
}
