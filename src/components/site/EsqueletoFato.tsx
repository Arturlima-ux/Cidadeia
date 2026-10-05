import { Linha } from "@/components/Esqueleto";

// Esqueleto com a FORMA do cartão de fato: rótulo curto, número grande, duas
// linhas de leitura e três de carimbo. Retângulo genérico faria a tela saltar
// quando o Tesouro respondesse.

export default function EsqueletoFato({ titulo }: { titulo: string }) {
  return (
    <div
      className="rounded-xl border border-border p-5"
      style={{ background: "var(--superficie)" }}
      aria-busy="true"
    >
      <span className="sr-only">Consultando {titulo} no Tesouro Nacional.</span>
      <p className="text-xs font-semibold text-muted" aria-hidden>
        {titulo}
      </p>
      <div aria-hidden className="mt-2 flex flex-col gap-2">
        <Linha largura="w-28" altura="h-8" />
        <Linha largura="w-full" altura="h-3" />
        <Linha largura="w-4/5" altura="h-3" />
      </div>
      <div aria-hidden className="mt-4 pt-3 border-t border-border flex flex-col gap-1.5">
        <Linha largura="w-3/5" altura="h-2" />
        <Linha largura="w-2/5" altura="h-2" />
      </div>
    </div>
  );
}
