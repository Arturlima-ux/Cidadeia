import Link from "next/link";
import { ehGestor } from "@/lib/sessao";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import { carregarValor, type Periodo } from "@/lib/valor-entregue-servidor";
import { frasesDoValor, plural } from "@/lib/valor-entregue";
import { dataDoBanco } from "@/lib/data-do-banco";
import { IconDownload } from "@/components/icons";

export const metadata = { title: "O que o CidadeIA fez" };

// ── A PROVA DE VALOR, NA TELA ──
// Tudo aqui é contagem do que aconteceu no sistema (lib/valor-entregue.ts):
// nada de economia estimada. É a tela que o prefeito abre quando alguém
// pergunta, na hora de renovar, "o que a gente ganhou com isso?".

const ROTULO: Record<Periodo, string> = { ano: "Este ano", "30dias": "Últimos 30 dias", mes: "Mês passado" };

const dataCurta = (t: string) =>
  dataDoBanco(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });

export default async function ValorPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const ctx = await contextoDashboard();
  if (!ehGestor(ctx.sessao)) {
    return <p className="text-sm text-muted max-w-lg">Disponível para o prefeito e os administradores.</p>;
  }
  const { periodo: bruto } = await searchParams;
  const periodo: Periodo = bruto === "30dias" || bruto === "mes" ? bruto : "ano";
  const v = await carregarValor(ctx.sessao.prefeituraId, periodo);
  const frases = frasesDoValor(v);

  const numeros = [
    { valor: v.resolvidos, rotulo: v.resolvidos === 1 ? "problema apontado e resolvido" : "problemas apontados e resolvidos" },
    {
      valor: v.mediaDias,
      rotulo: "dias, em média, do aviso à solução",
      formato: (n: number) => (n < 1 ? "<1" : n.toLocaleString("pt-BR")),
    },
    {
      valor: v.ouvidoria.percentualNoPrazo,
      rotulo: "das manifestações respondidas no prazo legal",
      formato: (n: number) => `${n}%`,
    },
    { valor: v.importados.total, rotulo: "registros que entraram sem ninguém digitar" },
  ];

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-muted mb-2">{ctx.prefeitura.nome}</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">O que o CidadeIA fez</h1>
          <p className="text-muted text-sm mt-2 max-w-2xl leading-relaxed">
            Só o que aconteceu de fato, contado no sistema: o que a vigia apontou e a equipe resolveu, os prazos
            cumpridos e o que entrou sozinho dos portais públicos. Sem estimativa.
          </p>
        </div>
        <a
          href={`/api/relatorios/valor?periodo=${periodo}`}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-brand/50 transition"
        >
          <IconDownload className="w-4 h-4" /> Baixar em PDF
        </a>
      </div>

      <nav aria-label="Período" className="flex gap-2 flex-wrap">
        {(["ano", "30dias", "mes"] as Periodo[]).map((p) => (
          <Link
            key={p}
            href={`/dashboard/valor?periodo=${p}`}
            aria-current={p === periodo ? "page" : undefined}
            className={`text-sm font-semibold rounded-full px-4 py-1.5 border transition ${
              p === periodo ? "bg-brand text-white border-brand" : "border-border text-muted hover:border-brand/40"
            }`}
          >
            {ROTULO[p]}
          </Link>
        ))}
      </nav>

      {v.vazio ? (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="font-semibold">Ainda não há o que contar {periodo === "ano" ? "neste ano" : "neste período"}.</p>
          <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-xl">
            A vigia confere os módulos toda manhã e a importação roda toda semana. Conforme os alertas forem
            resolvidos e as manifestações respondidas, esta tela se preenche sozinha.
          </p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {numeros.map((n) => (
              <div key={n.rotulo} className="rounded-2xl border border-border bg-card p-5">
                <p className="text-3xl font-semibold tracking-[-0.03em] tabular-nums">
                  {n.valor === null ? "—" : n.formato ? n.formato(n.valor) : n.valor.toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-muted mt-1.5 leading-snug">{n.rotulo}</p>
              </div>
            ))}
          </section>

          {frases.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold">Em uma frase cada</h2>
              <ul className="mt-3 space-y-2.5">
                {frases.map((f) => (
                  <li key={f} className="text-sm leading-relaxed flex gap-2.5">
                    <span aria-hidden className="mt-2 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--brand)" }} />
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {v.recentes.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
                <h2 className="font-semibold text-sm text-muted">Apontado e resolvido</h2>
                {v.porArea.length > 1 && (
                  <p className="text-xs text-muted">{v.porArea.map((a) => `${a.area} ${a.n}`).join(" · ")}</p>
                )}
              </div>
              <ul className="rounded-2xl border border-border bg-card divide-y divide-border">
                {v.recentes.map((r, i) => (
                  <li key={`${r.em}-${i}`} className="px-5 py-3.5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                    <div className="min-w-0">
                      <p className="text-sm font-medium break-words">{r.titulo}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {r.area}
                        {r.prioridade === "urgente" ? " · era urgente" : ""}
                      </p>
                    </div>
                    <p className="text-xs text-muted shrink-0 sm:text-right">
                      {r.desde ? `${dataCurta(r.desde)} → ` : ""}
                      {dataCurta(r.em)}
                      {r.dias !== null && <span className="block">{r.dias === 0 ? "resolvido no mesmo dia" : `${plural(r.dias, "dia", "dias")} até resolver`}</span>}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-semibold text-sm">Ouvidoria</h2>
              <p className="text-sm text-muted mt-2 leading-relaxed">
                {v.ouvidoria.recebidas
                  ? `${plural(v.ouvidoria.recebidas, "manifestação recebida", "manifestações recebidas")}, ${plural(v.ouvidoria.respondidas, "respondida", "respondidas")}` +
                    (v.ouvidoria.respondidas ? `; ${plural(v.ouvidoria.noPrazo, "dentro", "dentro")} do prazo legal.` : ".")
                  : "Nenhuma manifestação no período."}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-semibold text-sm">Entrou sozinho</h2>
              <p className="text-sm text-muted mt-2 leading-relaxed">
                {v.importados.total
                  ? [
                      v.importados.contratos && plural(v.importados.contratos, "contrato", "contratos"),
                      v.importados.processos && plural(v.importados.processos, "processo de compra", "processos de compra"),
                      v.importados.obras && plural(v.importados.obras, "obra", "obras"),
                      v.importados.unidades && plural(v.importados.unidades, "unidade de saúde", "unidades de saúde"),
                      v.importados.periodosFiscais && plural(v.importados.periodosFiscais, "período fiscal do Tesouro", "períodos fiscais do Tesouro"),
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : "Nada importado no período."}
              </p>
            </div>
          </section>
        </>
      )}

      <p className="text-xs text-muted">
        Todo dia 1º, o prefeito e os administradores recebem por e-mail o resumo do mês anterior, com este relatório em PDF.
      </p>
    </div>
  );
}
