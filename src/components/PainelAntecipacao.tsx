import Link from "next/link";
import type { Antecipacao } from "@/lib/antecipacao";

// ── O QUE AINDA NÃO ACONTECEU ──
//
// Esta seção é a única do painel que fala de futuro, e por isso ela se separa
// visualmente do resto: tudo acima é fato medido, aqui é trajetória projetada.
// Misturar as duas coisas na mesma lista faria o gestor levar uma previsão a
// uma reunião como se fosse apuração.
//
// Quando não há trajetória suficiente, a seção DESAPARECE — não mostra estado
// vazio. Um bloco dizendo "nenhuma previsão disponível" ocuparia o lugar mais
// nobre da tela para informar que não há informação; e, pior, sugeriria que o
// produto está medindo quando ainda não tem histórico para medir.

const TOM: Record<Antecipacao["prioridade"], { cor: string; fundo: string; borda: string }> = {
  urgente: { cor: "var(--urgente)", fundo: "var(--urgente-tint)", borda: "var(--urgente-borda)" },
  medio: { cor: "var(--medio)", fundo: "var(--medio-tint)", borda: "var(--medio-borda)" },
  info: { cor: "var(--info)", fundo: "var(--info-tint)", borda: "var(--info-borda)" },
};

export default function PainelAntecipacao({ antecipacoes }: { antecipacoes: Antecipacao[] }) {
  if (antecipacoes.length === 0) return null;

  return (
    <section className="arco-card border border-border p-6" style={{ background: "var(--card)" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
        <h2 className="font-serif text-lg font-bold">O que vem, se nada mudar</h2>
        <span className="text-xs font-mono text-muted shrink-0">
          {antecipacoes.length} {antecipacoes.length === 1 ? "trajetória" : "trajetórias"}
        </span>
      </div>
      <p className="text-xs text-muted mb-4 leading-relaxed max-w-[64ch]">
        Nada aqui já aconteceu. São fronteiras com consequência legal que a trajetória medida
        atravessa, e a data é o momento em que ainda dá para mudar a rota — não o momento do
        problema.
      </p>

      <div className="flex flex-col gap-3">
        {antecipacoes.map((a) => {
          const tom = TOM[a.prioridade];
          return (
            <Link
              key={a.chave}
              href={a.destino}
              className="group block rounded-xl border px-4 py-3.5 transition hover:brightness-[1.03]"
              style={{ background: tom.fundo, borderColor: tom.borda }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-sm font-semibold leading-snug">{a.titulo}</p>
                {/* O QUANDO é o que esta seção existe para dizer, então é o
                    maior elemento da linha. */}
                <p
                  className="text-sm font-semibold tabular-nums shrink-0"
                  style={{ color: tom.cor }}
                >
                  {a.quando}
                </p>
              </div>

              <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-[64ch]">{a.oQue}</p>

              <p className="text-xs mt-2.5 leading-relaxed max-w-[64ch]">
                <span className="font-semibold" style={{ color: tom.cor }}>
                  Enquanto dá:
                </span>{" "}
                <span className="text-muted">{a.acao}</span>
              </p>

              {/* ── O MÉTODO, SEMPRE VISÍVEL ──
                  Previsão sem o método ao lado é palpite com cara de certeza.
                  Num produto de conformidade o gestor precisa poder desconfiar
                  do número ANTES de levá-lo a uma reunião — e a ressalva de
                  base curta vem escrita junto. */}
              <p className="text-[11px] text-muted mt-3 pt-2.5 border-t leading-relaxed flex flex-wrap items-baseline gap-x-2" style={{ borderColor: tom.borda }}>
                <span className="font-mono">{a.base}</span>
                {a.fundamento && <span className="font-mono">· {a.fundamento}</span>}
                <span
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-x-1"
                  style={{ color: tom.cor }}
                >
                  →
                </span>
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
