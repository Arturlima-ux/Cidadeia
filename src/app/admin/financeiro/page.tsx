import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { faturas, pedidosProposta, usuarios } from "@/db/schema";
import { lerSessao } from "@/lib/sessao";
import { ehAdmin } from "@/lib/pedidos";
import { formatarMoeda } from "@/lib/formatadores";
import {
  CARENCIA_DIAS,
  competenciaDe,
  dataCurta,
  diasEntre,
  hojeEmBrasilia,
  rotuloCompetencia,
} from "@/lib/cobranca";
import { instrucoesDePagamento, protocolo } from "@/lib/cobranca-servidor";
import { AcoesFatura, BotaoGerarCobrancas } from "./AcoesFatura";

export const dynamic = "force-dynamic";

// ── O DINHEIRO, FATURA POR FATURA ──
//
// Em aberto primeiro, com o atraso escrito por extenso e a conta que já
// travou marcada. Prefeitura paga por ordem bancária, sem aviso automático do
// banco: quem vê o crédito no extrato confirma aqui, e é essa confirmação que
// liga os módulos (primeira fatura) ou destrava a conta (as seguintes).

export default async function AdminFinanceiroPage() {
  const sessao = await lerSessao();
  if (!sessao || sessao.demo) redirect("/login");
  const [u] = await db.select({ email: usuarios.email }).from(usuarios).where(eq(usuarios.id, sessao.usuarioId)).limit(1);
  if (!ehAdmin(u?.email)) notFound();

  const hoje = hojeEmBrasilia();
  const linhas = await db
    .select({ f: faturas, p: pedidosProposta })
    .from(faturas)
    .innerJoin(pedidosProposta, eq(faturas.pedidoId, pedidosProposta.id))
    .orderBy(desc(faturas.vencimento))
    .limit(500);

  const abertas = linhas
    .filter((l) => l.f.status === "aberta")
    .sort((a, b) => a.f.vencimento.localeCompare(b.f.vencimento));
  const pagas = linhas.filter((l) => l.f.status === "paga").slice(0, 30);
  const canceladas = linhas.filter((l) => l.f.status === "cancelada").slice(0, 10);

  const emAtraso = abertas.filter((l) => diasEntre(l.f.vencimento, hoje) > 0);
  const recebidoNoMes = linhas
    .filter((l) => l.f.status === "paga" && l.f.pagaEm && competenciaDe(l.f.pagaEm) === competenciaDe(hoje))
    .reduce((s, l) => s + l.f.valor, 0);
  const instrucoes = instrucoesDePagamento();

  const numeros = [
    { rotulo: "A receber", valor: formatarMoeda(abertas.reduce((s, l) => s + l.f.valor, 0)), nota: `${abertas.length} fatura(s) em aberto` },
    { rotulo: "Em atraso", valor: formatarMoeda(emAtraso.reduce((s, l) => s + l.f.valor, 0)), nota: `${emAtraso.length} fatura(s)` },
    { rotulo: "Recebido no mês", valor: formatarMoeda(recebidoNoMes), nota: rotuloCompetencia(competenciaDe(hoje)) },
  ];

  return (
    <div className="tema-noite min-h-screen bg-background px-4 sm:px-8 py-10">
      <div className="max-w-[1200px] mx-auto space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.04em]">Financeiro</h1>
            <p className="text-sm text-muted mt-2">
              Mensalidade antecipada. Carência de {CARENCIA_DIAS} dias depois do vencimento; depois disso, a conta trava até o pagamento.
            </p>
          </div>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/admin/pedidos" className="text-muted hover:text-foreground">Pedidos</Link>
            <span className="font-medium">Financeiro</span>
            <Link href="/admin/medicao" className="text-muted hover:text-foreground">Medição</Link>
          </nav>
        </div>

        <div className="grid sm:grid-cols-3 border border-border rounded-[22px] overflow-hidden" style={{ background: "var(--card)" }}>
          {numeros.map((n, i) => (
            <div key={n.rotulo} className={`p-5 ${i > 0 ? "sm:border-l border-t sm:border-t-0 border-border" : ""}`}>
              <span className="block text-sm text-muted">{n.rotulo}</span>
              <span className="block text-3xl font-semibold tabular-nums tracking-[-0.04em] mt-1">{n.valor}</span>
              <span className="block text-xs text-muted mt-1">{n.nota}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="text-sm text-muted max-w-[70ch] leading-relaxed">
            A rotina diária emite a mensalidade de cada contrato ativo e avisa o cliente três dias antes do vencimento, no atraso e
            na suspensão.{" "}
            {instrucoes ? (
              <>As instruções de pagamento vão em todo e-mail.</>
            ) : (
              <span style={{ color: "var(--medio)" }}>
                Configure PAGAMENTO_INSTRUCOES na Vercel (banco, agência, conta, PIX): sem ela, o e-mail da fatura sai sem os dados de pagamento.
              </span>
            )}
          </p>
          <BotaoGerarCobrancas />
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-[-0.025em]">Em aberto</h2>
          {abertas.length === 0 && <p className="text-sm text-muted">Nenhuma fatura em aberto.</p>}
          <ul className="border-t border-border">
            {abertas.map(({ f, p }) => {
              const atraso = diasEntre(f.vencimento, hoje);
              const travou = atraso > CARENCIA_DIAS && p.status === "ativo";
              const primeira = p.status === "contratado";
              const situacao =
                atraso > 0
                  ? travou
                    ? `${atraso} dias em atraso, conta travada`
                    : `${atraso} dia(s) em atraso`
                  : atraso === 0
                    ? "vence hoje"
                    : `vence em ${-atraso} dia(s)`;
              const cor = travou ? "var(--urgente)" : atraso > 0 ? "var(--medio)" : "var(--muted)";
              return (
                <li key={f.id} className="py-5 border-b border-border grid sm:grid-cols-[1fr_auto] gap-4 items-start">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {p.municipio}, {p.uf}{" "}
                      <span className="text-muted font-normal">
                        · {rotuloCompetencia(f.competencia)}
                        {primeira ? " · primeira fatura" : ""}
                      </span>
                    </p>
                    <p className="text-sm mt-1">
                      <span className="tabular-nums font-medium">{formatarMoeda(f.valor)}</span>
                      <span className="text-muted"> · vencimento {dataCurta(f.vencimento)} · </span>
                      <span style={{ color: cor }}>{situacao}</span>
                    </p>
                    <p className="text-xs text-muted mt-1">
                      Protocolo {protocolo(p.id)}
                      {p.numeroContrato ? `, contrato ${p.numeroContrato}` : ""}
                      {p.numeroEmpenho ? `, empenho ${p.numeroEmpenho}` : ""}, {p.email}
                    </p>
                  </div>
                  <AcoesFatura faturaId={f.id} hoje={hoje} primeira={primeira} />
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-[-0.025em]">Pagas</h2>
          {pagas.length === 0 && <p className="text-sm text-muted">Nenhum pagamento confirmado ainda.</p>}
          <ul className="border-t border-border">
            {pagas.map(({ f, p }) => (
              <li key={f.id} className="py-3 border-b border-border flex flex-wrap justify-between gap-2 text-sm">
                <span>
                  {p.municipio}, {p.uf} <span className="text-muted">· {rotuloCompetencia(f.competencia)}</span>
                </span>
                <span className="text-muted tabular-nums">
                  {formatarMoeda(f.valor)} · pago em {f.pagaEm ? dataCurta(f.pagaEm) : "?"} · {f.formaPagamento}
                  {f.notaFiscal ? ` · NF ${f.notaFiscal}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {canceladas.length > 0 && (
          <details>
            <summary className="text-sm text-muted cursor-pointer">Canceladas ({canceladas.length})</summary>
            <ul className="mt-3 border-t border-border">
              {canceladas.map(({ f, p }) => (
                <li key={f.id} className="py-3 border-b border-border text-sm text-muted">
                  {p.municipio}, {p.uf} · {rotuloCompetencia(f.competencia)} · {formatarMoeda(f.valor)} · {f.observacao}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
