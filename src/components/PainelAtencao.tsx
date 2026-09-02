import Link from "next/link";
import type { DeteccaoAutomatica } from "@/lib/deteccao-automatica";
import {
  IconAlertas,
  IconObras,
  IconLicitacoes,
  IconVisaoGeral,
  IconCheck,
} from "@/components/icons";

// ── O QUE PRECISA DA SUA ATENÇÃO ──
//
// A Visão Geral abria com saudação, receita e despesas — números que dizem
// como está, não o que fazer. O que exige decisão ficava numa tela separada,
// e a tela que ninguém visita é a que deixa o problema crescer.
//
// Agora esta lista abre o painel. O financeiro continua logo abaixo: ele é
// contexto, não pauta.

const ICONE_POR_CATEGORIA: Record<
  DeteccaoAutomatica["categoria"],
  (p: React.SVGProps<SVGSVGElement>) => React.ReactElement
> = {
  prazo: IconLicitacoes,
  estagnacao: IconObras,
  dado_desatualizado: IconAlertas,
  financeiro: IconVisaoGeral,
};

/**
 * Para onde cada achado leva.
 *
 * É o que separa uma lista de problemas de uma lista de tarefas: sem o
 * destino, o gestor lê o alerta e continua sem saber onde agir.
 */
const DESTINO_POR_CATEGORIA: Record<DeteccaoAutomatica["categoria"], string> = {
  prazo: "/dashboard/atendimento",
  estagnacao: "/dashboard/secretarias/obras",
  dado_desatualizado: "/dashboard/alertas",
  financeiro: "/dashboard/minimos",
};

const TOM: Record<DeteccaoAutomatica["prioridade"], { cor: string; fundo: string; borda: string }> = {
  urgente: { cor: "var(--urgente)", fundo: "var(--urgente-tint)", borda: "var(--urgente-borda)" },
  medio: { cor: "var(--medio)", fundo: "var(--medio-tint)", borda: "var(--medio-borda)" },
  info: { cor: "var(--info)", fundo: "var(--info-tint)", borda: "var(--info-borda)" },
};

/**
 * Ordem: urgente antes de médio, médio antes de informativo.
 *
 * A ordem em que os detectores rodam é acidental — é a ordem do código, não a
 * da gravidade. Sem esta reordenação, uma obra parada poderia aparecer acima
 * de um mínimo constitucional em risco.
 */
const PESO: Record<DeteccaoAutomatica["prioridade"], number> = { urgente: 0, medio: 1, info: 2 };

export default function PainelAtencao({ achados }: { achados: DeteccaoAutomatica[] }) {
  const ordenados = [...achados].sort((a, b) => PESO[a.prioridade] - PESO[b.prioridade]);
  const urgentes = ordenados.filter((a) => a.prioridade === "urgente").length;

  if (ordenados.length === 0) {
    return (
      <section
        className="arco-card border p-6 flex items-start gap-3.5"
        style={{ background: "var(--info-tint)", borderColor: "var(--info-borda)" }}
      >
        <IconCheck className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--info)" }} />
        <div>
          <h2 className="font-serif text-lg font-bold">Nada exige decisão agora</h2>
          <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-2xl">
            Nenhuma regra disparou sobre os dados cadastrados: prazos em dia,
            obras com progresso registrado, indicadores atualizados e mínimos
            dentro do exigido. Se algo parece faltando, provavelmente é dado que
            ainda não foi lançado — a verificação só enxerga o que existe.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="arco-card border border-border p-6" style={{ background: "var(--card)" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <h2 className="font-serif text-lg font-bold">O que precisa da sua atenção</h2>
        <span className="text-xs font-mono text-muted shrink-0">
          {ordenados.length} {ordenados.length === 1 ? "item" : "itens"}
          {urgentes > 0 && (
            <span style={{ color: "var(--urgente)" }}> · {urgentes} urgente{urgentes > 1 ? "s" : ""}</span>
          )}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {ordenados.map((a, i) => {
          const tom = TOM[a.prioridade];
          const Icone = ICONE_POR_CATEGORIA[a.categoria];
          const destino = DESTINO_POR_CATEGORIA[a.categoria];

          return (
            <Link
              key={`${a.categoria}-${a.titulo}-${i}`}
              href={destino}
              className="flex gap-3.5 rounded-xl border px-4 py-3 transition hover:brightness-110"
              style={{ background: tom.fundo, borderColor: tom.borda }}
            >
              <Icone className="w-4 h-4 shrink-0 mt-0.5" style={{ color: tom.cor }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug">{a.titulo}</p>
                <p className="text-xs text-muted mt-1 leading-relaxed">{a.descricao}</p>
              </div>
              <span
                aria-hidden
                className="shrink-0 self-center text-sm"
                style={{ color: tom.cor }}
              >
                →
              </span>
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-muted mt-4 pt-3 border-t border-border leading-relaxed">
        Cada linha leva à tela onde se resolve. Tudo aqui vem de regra sobre o
        dado cadastrado — nenhum item depende de inteligência artificial nem de
        conexão com serviço externo.
      </p>
    </section>
  );
}
