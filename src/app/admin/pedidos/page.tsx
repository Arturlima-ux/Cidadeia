import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { eventos, pedidoEventos, pedidosProposta, prefeituras } from "@/db/schema";
import { lerSessao } from "@/lib/sessao";
import { emailDaEquipe } from "@/lib/equipe";
import { NOME_PLANO_ADDON } from "@/lib/planos";
import { formatarMoeda } from "@/lib/formatadores";
import {
  linkCadastroDoPedido,
  modulosDoPedido,
  type StatusPedido,
} from "@/lib/pedidos";
import AcoesPedido from "./AcoesPedido";
import EtapasPedido from "@/components/EtapasPedido";
import { empresaDoAmbiente, pendenciasDaEmpresa } from "@/lib/proposta-comercial";
import { DOCUMENTOS } from "@/lib/kit-contratacao";
import { protocolo } from "@/lib/cobranca-servidor";

export const dynamic = "force-dynamic";

// ── A MESA DA EQUIPE: DO CLIQUE AO DINHEIRO ──
//
// No topo, o caminho inteiro em números: quem visitou, consultou um
// município, abriu e enviou a proposta (eventos do site, 30 dias), e onde
// estão os pedidos hoje, até o contrato pago. Abaixo, os pedidos por etapa,
// cada um com a linha do tempo do que já aconteceu e a ação da vez.

const FILTROS: { chave: "abertos" | StatusPedido | "todos"; rotulo: string }[] = [
  { chave: "abertos", rotulo: "Em andamento" },
  { chave: "recebido", rotulo: "Recebidos" },
  { chave: "proposta_enviada", rotulo: "Proposta enviada" },
  { chave: "em_contratacao", rotulo: "Em contratação" },
  { chave: "contratado", rotulo: "Aguardando pagamento" },
  { chave: "ativo", rotulo: "Ativos" },
  { chave: "perdido", rotulo: "Encerrados" },
  { chave: "todos", rotulo: "Todos" },
];

/** Início da janela do funil do site. Fora do componente: lê o relógio. */
function inicioDaJanela(dias: number): string {
  return new Date(Date.now() - dias * 86_400_000).toISOString();
}

export default async function AdminPedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ etapa?: string }>;
}) {
  if (!(await lerSessao())) redirect("/login");
  const email = await emailDaEquipe();
  if (!email) notFound();

  const { etapa } = await searchParams;
  const filtro = FILTROS.find((f) => f.chave === etapa)?.chave ?? "abertos";

  // ── o funil do site, 30 dias ──
  const corte = inicioDaJanela(30);
  let site: Record<string, number> = {};
  try {
    const linhas = await db
      .select({ tipo: eventos.tipo, visitantes: sql<number>`count(distinct ${eventos.visitante})::int` })
      .from(eventos)
      .where(gte(eventos.criadoEm, corte))
      .groupBy(eventos.tipo);
    site = Object.fromEntries(linhas.map((l) => [l.tipo, l.visitantes]));
  } catch (e) {
    console.error("[admin] funil do site:", e);
  }

  // ── os pedidos, por etapa ──
  const todos = await db
    .select({ pedido: pedidosProposta, contaNome: prefeituras.nome })
    .from(pedidosProposta)
    .leftJoin(prefeituras, eq(pedidosProposta.prefeituraId, prefeituras.id))
    .orderBy(desc(pedidosProposta.createdAt))
    .limit(500);

  const porEtapa = (s: StatusPedido) => todos.filter((t) => t.pedido.status === s);
  const receitaAtiva = porEtapa("ativo").reduce((soma, t) => soma + (t.pedido.valorContratado ?? t.pedido.mensal ?? 0), 0);
  const aReceber = porEtapa("contratado").reduce((soma, t) => soma + (t.pedido.valorContratado ?? 0), 0);

  const visiveis = todos.filter(({ pedido: p }) =>
    filtro === "todos" ? true : filtro === "abertos" ? p.status !== "ativo" && p.status !== "perdido" : p.status === filtro
  );

  const passos = visiveis.length
    ? await db
        .select()
        .from(pedidoEventos)
        .where(inArray(pedidoEventos.pedidoId, visiveis.map((v) => v.pedido.id)))
        .orderBy(asc(pedidoEventos.criadoEm))
    : [];

  const base = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://cidadeia.vercel.app";
  const pendencias = pendenciasDaEmpresa(empresaDoAmbiente());

  const etapasDoFunil = [
    { rotulo: "Visitaram o site", valor: site.visita ?? 0, nota: "30 dias" },
    { rotulo: "Consultaram um município", valor: site.raio_x ?? 0, nota: "30 dias" },
    { rotulo: "Abriram a proposta", valor: site.proposta_aberta ?? 0, nota: "30 dias" },
    { rotulo: "Pediram proposta", valor: site.proposta_enviada ?? 0, nota: "30 dias" },
    { rotulo: "Em negociação", valor: porEtapa("recebido").length + porEtapa("proposta_enviada").length + porEtapa("em_contratacao").length, nota: "hoje" },
    { rotulo: "Aguardando pagamento", valor: porEtapa("contratado").length, nota: aReceber ? `${formatarMoeda(aReceber)}/mês` : "hoje" },
    { rotulo: "Ativos", valor: porEtapa("ativo").length, nota: `${formatarMoeda(receitaAtiva)}/mês` },
  ];

  return (
    <div className="tema-noite min-h-screen bg-background px-4 sm:px-8 py-10">
      <div className="max-w-[1200px] mx-auto space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.04em]">Do clique ao pagamento</h1>
            <p className="text-sm text-muted mt-2">Mesa da equipe, {email}</p>
          </div>
          <nav className="flex items-center gap-5 text-sm">
            <span className="font-medium">Pedidos</span>
            <Link href="/admin/financeiro" className="text-muted hover:text-foreground">Financeiro</Link>
            <Link href="/admin/medicao" className="text-muted hover:text-foreground">Medição</Link>
            <Link href="/dashboard" className="text-muted hover:text-foreground">Painel</Link>
          </nav>
        </div>

        {/* O caminho inteiro, numa linha. */}
        <ol className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 border border-border rounded-[22px] overflow-hidden" style={{ background: "var(--card)" }}>
          {etapasDoFunil.map((e, i) => (
            <li key={e.rotulo} className={`p-4 sm:p-5 ${i > 0 ? "border-l border-border" : ""} ${i >= 4 ? "bg-sutil" : ""}`}>
              <span className="block text-3xl font-semibold tabular-nums tracking-[-0.04em]">{e.valor}</span>
              <span className="block text-sm mt-1 leading-snug">{e.rotulo}</span>
              <span className="block text-xs text-muted mt-1">{e.nota}</span>
            </li>
          ))}
        </ol>

        {pendencias.length > 0 && (
          <p
            className="text-sm rounded-xl px-4 py-3 border leading-relaxed"
            style={{ color: "var(--medio)", background: "var(--medio-tint)", borderColor: "var(--medio-borda)" }}
          >
            A proposta em PDF sai com campos entre colchetes até você preencher na Vercel:{" "}
            <code className="text-xs">{pendencias.join(", ")}</code>.
          </p>
        )}

        <nav className="flex flex-wrap gap-2" aria-label="Filtrar por etapa">
          {FILTROS.map((f) => {
            const n =
              f.chave === "todos"
                ? todos.length
                : f.chave === "abertos"
                  ? todos.filter((t) => t.pedido.status !== "ativo" && t.pedido.status !== "perdido").length
                  : porEtapa(f.chave).length;
            const ativo = f.chave === filtro;
            return (
              <Link
                key={f.chave}
                href={`/admin/pedidos?etapa=${f.chave}`}
                className="text-sm rounded-full border px-4 py-1.5 transition"
                style={{
                  borderColor: ativo ? "var(--brand)" : "var(--border)",
                  background: ativo ? "var(--brand-tint)" : "transparent",
                }}
              >
                {f.rotulo} <span className="text-muted tabular-nums">{n}</span>
              </Link>
            );
          })}
        </nav>

        {visiveis.length === 0 && (
          <p className="text-sm text-muted border border-dashed border-border rounded-2xl p-8 text-center">
            Nenhum pedido nesta etapa.
          </p>
        )}

        <div className="space-y-4">
          {visiveis.map(({ pedido: p, contaNome }) => {
            const status = p.status as StatusPedido;
            const modulos = modulosDoPedido(p.modulos).map((m) => NOME_PLANO_ADDON[m]);
            const data = new Date(p.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
            const historico = passos.filter((x) => x.pedidoId === p.id);
            return (
              <article key={p.id} className="rounded-[22px] border border-border p-5 sm:p-6" style={{ background: "var(--card)" }}>
                <div className="grid md:grid-cols-[1fr_auto] gap-6">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h2 className="text-xl font-semibold tracking-[-0.025em]">
                        {p.municipio}, {p.uf}
                      </h2>
                      <span className="text-sm text-muted">
                        {new Intl.NumberFormat("pt-BR").format(p.populacao)} hab., protocolo {protocolo(p.id)}, {data}
                      </span>
                    </div>

                    <EtapasPedido status={status} />

                    <p className="text-sm">
                      <span className="font-medium">{modulos.join(" + ") || "sem módulos"}</span>
                      {p.valorContratado != null ? (
                        <span className="text-muted"> · contrato de {formatarMoeda(p.valorContratado)}/mês, vence dia {p.diaVencimento}</span>
                      ) : p.mensal != null ? (
                        <span className="text-muted"> · {formatarMoeda(p.mensal)}/mês pela tabela</span>
                      ) : null}
                    </p>
                    {(p.numeroContrato || p.numeroEmpenho) && (
                      <p className="text-sm text-muted">
                        Contrato {p.numeroContrato ?? "?"}, empenho {p.numeroEmpenho ?? "?"}
                      </p>
                    )}
                    <p className="text-sm text-muted">
                      {p.nome}
                      {p.cargo ? `, ${p.cargo}` : ""},{" "}
                      <a className="underline" href={`mailto:${p.email}`}>
                        {p.email}
                      </a>
                      {p.telefone ? `, ${p.telefone}` : ""}
                    </p>
                    {p.observacao && <p className="text-sm text-muted italic">“{p.observacao}”</p>}
                    {p.motivoPerda && <p className="text-sm" style={{ color: "var(--medio)" }}>Encerrado: {p.motivoPerda}</p>}
                    <p className="text-sm">
                      {contaNome ? (
                        <>
                          Conta: <span className="font-medium">{contaNome}</span>
                        </>
                      ) : (
                        <>
                          <span style={{ color: "var(--medio)" }} className="font-medium">
                            Sem conta.
                          </span>{" "}
                          Link para o cliente criar:{" "}
                          <code className="text-xs rounded px-1.5 py-0.5 break-all bg-sutil">
                            {base}
                            {linkCadastroDoPedido(p.id)}
                          </code>
                        </>
                      )}
                    </p>

                    {historico.length > 0 && (
                      <details className="pt-1">
                        <summary className="text-sm text-brand-claro cursor-pointer">
                          Linha do tempo ({historico.length})
                        </summary>
                        <ol className="mt-3 border-l border-border pl-4 space-y-2">
                          {historico.map((h) => (
                            <li key={h.id} className="text-sm">
                              <span className="text-muted tabular-nums">
                                {new Date(h.criadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                              </span>{" "}
                              {h.descricao} <span className="text-xs text-muted">({h.autor})</span>
                            </li>
                          ))}
                        </ol>
                      </details>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <a
                        href={`/admin/pedidos/${p.id}/proposta`}
                        className="text-xs border border-border rounded-full px-3 py-1.5 hover:border-brand transition"
                      >
                        Proposta (PDF)
                      </a>
                      {DOCUMENTOS.filter((d) => d.geramos).map((d) => (
                        <a
                          key={d.chave}
                          href={`/admin/pedidos/${p.id}/kit/${d.chave}`}
                          className="text-xs border border-border rounded-full px-3 py-1.5 hover:border-brand transition"
                        >
                          {d.nome}
                        </a>
                      ))}
                    </div>
                  </div>

                  <AcoesPedido
                    pedidoId={p.id}
                    status={status}
                    temConta={Boolean(p.prefeituraId)}
                    valorTabela={p.valorContratado ?? p.mensal}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

