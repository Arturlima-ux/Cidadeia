import Link from "next/link";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import { buscarMerendaDaRede } from "../merenda-actions";
import { buscarRedeDeEscolas } from "../rede-actions";
import {
  montarPedidoMerenda,
  cabeNaAgriculturaFamiliar,
  NOME_CATEGORIA_MERENDA,
  ROTULO_SITUACAO_MERENDA,
  DIAS_AULA_ATENCAO,
  DIAS_AULA_DE_REPOSICAO,
} from "@/lib/merenda";
import { PERCENTUAL_MINIMO_AF } from "@/lib/pnae";

// ── O PEDIDO DA MERENDA ──
// Tudo que acabou, acaba esta semana ou está abaixo de 10 dias de aula, em
// todas as escolas, com a quantidade que repõe um mês letivo. Sai em CSV.
// A coluna da agricultura familiar não é enfeite: é o lembrete de que
// aquele item pode fechar os 30% da Lei 11.947/2009.

export const metadata = { title: "Pedido da merenda" };
export const dynamic = "force-dynamic";

const COR = { falta: "var(--urgente)", critico: "var(--urgente)", atencao: "var(--medio)", ok: "var(--accent)", sem_consumo: "var(--muted)" } as const;

export default async function ReposicaoMerendaPage() {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("educacao")) return <BloqueioPlano plano="educacao" />;

  const [estoque, escolas] = await Promise.all([
    buscarMerendaDaRede(ctx.sessao.prefeituraId),
    buscarRedeDeEscolas(ctx.sessao.prefeituraId),
  ]);
  const nomeDe = new Map(escolas.map((e) => [e.id, e.nome]));
  const pedido = montarPedidoMerenda(estoque.map((l) => ({ ...l, escolaNome: nomeDe.get(l.escolaId) ?? "Escola" })));
  const porEscola = new Map<string, typeof pedido>();
  for (const i of pedido) porEscola.set(i.escolaNome, [...(porEscola.get(i.escolaNome) ?? []), i]);
  const cabemNaAf = pedido.filter((i) => cabeNaAgriculturaFamiliar(i.item)).length;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/dashboard/secretarias/educacao" className="text-xs font-semibold text-muted hover:text-brand transition">
          ← Secretaria da Educação
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3 mt-2">
          <div>
            <h1 className="font-serif text-2xl font-bold">Pedido da merenda</h1>
            <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-2xl">
              O que acabou, acaba esta semana ou tem menos de {DIAS_AULA_ATENCAO} dias de aula de
              cobertura em qualquer escola, com a quantidade que repõe {DIAS_AULA_DE_REPOSICAO} dias
              letivos. Calculado das contagens que as próprias escolas lançaram.
            </p>
          </div>
          {pedido.length > 0 && (
            <a
              href="/api/educacao/reposicao"
              className="border border-border hover:border-brand font-semibold text-sm rounded-xl px-4 py-2.5 transition whitespace-nowrap"
            >
              Baixar CSV ({pedido.length} itens)
            </a>
          )}
        </div>
      </div>

      {cabemNaAf > 0 && (
        <p className="text-sm leading-relaxed rounded-xl px-4 py-3 border" style={{ color: "var(--accent)", background: "var(--accent-tint)", borderColor: "var(--accent)" }}>
          <strong>{cabemNaAf} dos {pedido.length} itens deste pedido cabem na agricultura familiar.</strong> Comprar
          esses do produtor local por chamada pública conta para os {PERCENTUAL_MINIMO_AF}% do art. 14 —{" "}
          <Link href="/dashboard/secretarias/educacao/merenda" className="underline font-semibold">
            ver como está o ano
          </Link>
          .
        </p>
      )}

      {pedido.length === 0 ? (
        <p className="text-sm text-muted border border-dashed border-border rounded-2xl p-8 text-center">
          Nada para repor agora — nenhum item abaixo de {DIAS_AULA_ATENCAO} dias de aula nas contagens
          lançadas.
        </p>
      ) : (
        [...porEscola.entries()].map(([nome, itens]) => (
          <section key={nome} className="rounded-2xl border border-border bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
              <h2 className="font-semibold">{nome}</h2>
              <Link href={`/dashboard/secretarias/educacao/escolas/${itens[0]!.escolaId}`} className="text-xs font-semibold text-brand hover:underline">
                ficha →
              </Link>
            </div>
            <div className="overflow-x-auto rolagem-discreta">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-mono uppercase tracking-[0.12em] text-muted border-b border-border">
                    <th className="px-4 py-2 font-medium">Item</th>
                    <th className="px-4 py-2 font-medium text-right">Saldo</th>
                    <th className="px-4 py-2 font-medium text-right">Dá para</th>
                    <th className="px-4 py-2 font-medium">Situação</th>
                    <th className="px-4 py-2 font-medium text-right">Pedir</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((i) => (
                    <tr key={i.item} className="border-b border-border last:border-0">
                      <td className="px-4 py-2">
                        <span className="font-medium">{i.item}</span>
                        <span className="text-xs text-muted"> · {NOME_CATEGORIA_MERENDA[i.categoria]}</span>
                        {cabeNaAgriculturaFamiliar(i.item) && (
                          <span className="text-[10px] font-semibold ml-1.5 rounded-full px-1.5 py-0.5" style={{ color: "var(--accent)", background: "var(--accent-tint)" }}>
                            agric. familiar
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{i.saldo}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold" style={{ color: COR[i.situacao] }}>
                        {i.dias === null ? "—" : `${i.dias} d`}
                      </td>
                      <td className="px-4 py-2 text-xs font-semibold" style={{ color: COR[i.situacao] }}>
                        {ROTULO_SITUACAO_MERENDA[i.situacao]}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums font-bold">
                        {i.pedir} <span className="text-xs font-normal text-muted">{i.unidadeMedida}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
