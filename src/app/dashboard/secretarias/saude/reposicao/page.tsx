import Link from "next/link";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import { buscarEstoqueDaRede } from "../rede-actions";
import { buscarUnidadesSaude } from "../actions";
import { montarPedidoReposicao, NOME_CATEGORIA, ROTULO_SITUACAO, DIAS_DE_REPOSICAO, DIAS_ATENCAO } from "@/lib/estoque-saude";

// ── O PEDIDO DE REPOSIÇÃO ──
// Tudo que está em falta, acabando ou abaixo de 15 dias, em todas as
// unidades, com a quantidade que repõe 45 dias. Sai em CSV para a farmácia
// central ou o fornecedor. Ninguém precisa varrer unidade por unidade.

export const metadata = { title: "Pedido de reposição" };
export const dynamic = "force-dynamic";

const COR = { falta: "var(--urgente)", critico: "var(--urgente)", atencao: "var(--medio)", ok: "var(--accent)", sem_consumo: "var(--muted)" } as const;

export default async function ReposicaoPage() {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("saude")) return <BloqueioPlano plano="saude" />;

  const [estoque, unidades] = await Promise.all([buscarEstoqueDaRede(ctx.sessao.prefeituraId), buscarUnidadesSaude(ctx.sessao.prefeituraId)]);
  const nomeDe = new Map(unidades.map((u) => [u.id, u.nome]));
  const pedido = montarPedidoReposicao(
    estoque.map((l) => ({ ...l, unidadeId: l.unidadeId, unidadeNome: nomeDe.get(l.unidadeId) ?? "Unidade" }))
  );
  const porUnidade = new Map<string, typeof pedido>();
  for (const i of pedido) porUnidade.set(i.unidadeNome, [...(porUnidade.get(i.unidadeNome) ?? []), i]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/dashboard/secretarias/saude" className="text-xs font-semibold text-muted hover:text-brand transition">
          ← Secretaria da Saúde
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3 mt-2">
          <div>
            <h1 className="font-serif text-2xl font-bold">Pedido de reposição</h1>
            <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-2xl">
              O que está em falta, acabando ou com menos de {DIAS_ATENCAO} dias de cobertura em qualquer
              unidade, com a quantidade que repõe {DIAS_DE_REPOSICAO} dias. Calculado das contagens que as
              próprias unidades lançaram.
            </p>
          </div>
          {pedido.length > 0 && (
            <a
              href="/api/saude/reposicao"
              className="border border-border hover:border-brand font-semibold text-sm rounded-xl px-4 py-2.5 transition whitespace-nowrap"
            >
              Baixar CSV ({pedido.length} itens)
            </a>
          )}
        </div>
      </div>

      {pedido.length === 0 ? (
        <p className="text-sm text-muted border border-dashed border-border rounded-2xl p-8 text-center">
          Nada para repor agora — nenhum item abaixo de {DIAS_ATENCAO} dias de cobertura nas contagens lançadas.
        </p>
      ) : (
        [...porUnidade.entries()].map(([nome, itens]) => (
          <section key={nome} className="rounded-2xl border border-border bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
              <h2 className="font-semibold">{nome}</h2>
              <Link href={`/dashboard/secretarias/saude/unidades/${itens[0]!.unidadeId}`} className="text-xs font-semibold text-brand hover:underline">
                ficha →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-mono uppercase tracking-[0.12em] text-muted border-b border-border">
                    <th className="px-4 py-2 font-medium">Item</th>
                    <th className="px-4 py-2 font-medium text-right">Saldo</th>
                    <th className="px-4 py-2 font-medium text-right">Cobertura</th>
                    <th className="px-4 py-2 font-medium">Situação</th>
                    <th className="px-4 py-2 font-medium text-right">Pedir</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((i) => (
                    <tr key={i.item} className="border-b border-border last:border-0">
                      <td className="px-4 py-2">
                        <span className="font-medium">{i.item}</span>
                        <span className="text-xs text-muted"> · {NOME_CATEGORIA[i.categoria]}</span>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{i.saldo}</td>
                      <td className="px-4 py-2 text-right tabular-nums font-semibold" style={{ color: COR[i.situacao] }}>
                        {i.dias === null ? "—" : `${i.dias} d`}
                      </td>
                      <td className="px-4 py-2 text-xs font-semibold" style={{ color: COR[i.situacao] }}>
                        {ROTULO_SITUACAO[i.situacao]}
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
