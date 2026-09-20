import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pedidosProposta, prefeituras, usuarios } from "@/db/schema";
import { lerSessao } from "@/lib/sessao";
import { NOME_PLANO_ADDON } from "@/lib/planos";
import { formatarMoeda } from "@/lib/formatadores";
import { ehAdmin, linkCadastroDoPedido, modulosDoPedido, STATUS_PEDIDO, type StatusPedido } from "@/lib/pedidos";
import BotaoAvancar from "./BotaoAvancar";
import { empresaDoAmbiente, pendenciasDaEmpresa } from "@/lib/proposta-comercial";

// ── A MESA DA EQUIPE ──
//
// Todos os pedidos de proposta, do mais novo ao mais velho, com o que a
// equipe precisa para agir: quem pediu, o que pediu, se já tem conta, e um
// botão que avança o pedido no caminho (recebido → proposta enviada →
// contratado). "Contratado" liga os módulos na conta do cliente na hora.
//
// Só entra quem está em ADMIN_EMAILS. Para todo o resto — inclusive um
// prefeito logado — a página não existe (404), não "acesso negado".

export const dynamic = "force-dynamic";

export default async function AdminPedidosPage() {
  const sessao = await lerSessao();
  if (!sessao) redirect("/login");
  const [u] = await db.select({ email: usuarios.email }).from(usuarios).where(eq(usuarios.id, sessao.usuarioId)).limit(1);
  if (sessao.demo || !ehAdmin(u?.email)) notFound();

  const pedidos = await db
    .select({ pedido: pedidosProposta, contaNome: prefeituras.nome })
    .from(pedidosProposta)
    .leftJoin(prefeituras, eq(pedidosProposta.prefeituraId, prefeituras.id))
    .orderBy(desc(pedidosProposta.createdAt))
    .limit(200);

  const base = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://cidadeia.vercel.app";
  const pendencias = pendenciasDaEmpresa(empresaDoAmbiente());

  return (
    <div className="min-h-screen bg-background px-4 sm:px-8 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-bold">Pedidos de proposta</h1>
            <p className="text-sm text-muted mt-1">
              {pedidos.length} pedido{pedidos.length === 1 ? "" : "s"} · mesa da equipe · {u?.email}
            </p>
          </div>
          <Link href="/dashboard" className="text-sm font-semibold text-brand hover:underline">
            Ir para o painel →
          </Link>
        </div>

        {pendencias.length > 0 && (
          <p
            className="text-sm rounded-xl px-4 py-3 border leading-relaxed"
            style={{ color: "var(--medio)", background: "var(--medio-tint)", borderColor: "var(--medio-borda)" }}
          >
            A proposta em PDF sai com campos entre colchetes até você preencher na Vercel:{" "}
            <code className="text-xs">{pendencias.join(", ")}</code>. Razão social, CNPJ, endereço,
            representante, e-mail e telefone de suporte.
          </p>
        )}

        {pedidos.length === 0 && (
          <p className="text-sm text-muted border border-dashed border-border rounded-2xl p-8 text-center">
            Nenhum pedido ainda. Eles chegam de /proposta.
          </p>
        )}

        {pedidos.map(({ pedido: p, contaNome }) => {
          const status = p.status as StatusPedido;
          const modulos = modulosDoPedido(p.modulos).map((m) => NOME_PLANO_ADDON[m]);
          const data = new Date(p.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
          return (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-5 grid md:grid-cols-[1fr_auto] gap-4">
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="font-semibold">
                    {p.municipio}/{p.uf}
                    <span className="text-muted font-normal"> · {new Intl.NumberFormat("pt-BR").format(p.populacao)} hab.</span>
                  </p>
                  <span className="text-[11px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 border border-border">
                    {STATUS_PEDIDO[status]?.rotulo ?? status}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    {p.id.slice(-8).toUpperCase()} · {data}
                  </span>
                </div>
                <p className="text-sm">
                  <span className="font-semibold">{modulos.join(" + ") || "sem módulos"}</span>
                  {p.mensal != null && <span className="text-muted"> · {formatarMoeda(p.mensal)}/mês pela tabela</span>}
                </p>
                <p className="text-sm text-muted">
                  {p.nome}
                  {p.cargo ? `, ${p.cargo}` : ""} ·{" "}
                  <a className="underline" href={`mailto:${p.email}`}>
                    {p.email}
                  </a>
                  {p.telefone ? ` · ${p.telefone}` : ""}
                </p>
                {p.observacao && <p className="text-sm text-muted italic">“{p.observacao}”</p>}
                <p className="text-sm">
                  {contaNome ? (
                    <>
                      Conta: <span className="font-semibold">{contaNome}</span>
                    </>
                  ) : (
                    <>
                      <span style={{ color: "var(--medio)" }} className="font-semibold">
                        Sem conta.
                      </span>{" "}
                      Link para o cliente criar:{" "}
                      <code className="text-xs bg-brand-tint/50 rounded px-1.5 py-0.5 break-all">
                        {base}
                        {linkCadastroDoPedido(p.id)}
                      </code>
                    </>
                  )}
                </p>
              </div>
              <div className="md:text-right flex flex-col items-start md:items-end gap-3">
                <BotaoAvancar pedidoId={p.id} status={status} temConta={Boolean(p.prefeituraId)} />
                {/* O PDF nasce do pedido: município, faixa, módulos e valores
                    da tabela. É o que vai por e-mail com o kit. */}
                <a
                  href={`/admin/pedidos/${p.id}/proposta`}
                  className="text-sm font-semibold border border-border rounded-xl px-4 py-2 hover:border-brand hover:text-brand transition whitespace-nowrap"
                >
                  Baixar proposta (PDF)
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
