import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { leads, pedidoEventos, pedidosProposta } from "@/db/schema";
import { lerSessao } from "@/lib/sessao";
import { emailDaEquipe } from "@/lib/equipe";
import { caminhoDoRaioX } from "@/lib/slug-municipio";
import { protocolo } from "@/lib/cobranca-servidor";
import {
  ROTULO_SITUACAO_LEAD,
  agendaComercial,
  prazoDeUmDiaUtil,
  prioridadeDoLead,
  situacaoDoLead,
  telefoneDoLead,
  type SituacaoLead,
} from "@/lib/oportunidades";
import AcoesInteressado from "./AcoesInteressado";

export const dynamic = "force-dynamic";

// ── A CAIXA DE INTERESSADOS ──
//
// Quem deixou e-mail no Raio-X, pediu a projeção ou pediu uma ligação ficava
// gravado numa tabela que nenhuma tela lia: só chegava ao e-mail. Aqui fica
// tudo, na ordem em que vale atender: o que está atrasado, quem pediu ligação,
// quem decide. Os pedidos de proposta continuam na mesa (/admin/pedidos);
// aqui aparecem só os que estouraram o prazo de um dia útil que o site promete.

const ORIGEM: Record<string, string> = {
  "raio-x": "Raio-X por e-mail",
  projecao: "Projeção de pessoal",
  ligacao: "Pediu ligação",
};

function inicioDaJanela(dias: number): string {
  return new Date(Date.now() - dias * 86_400_000).toISOString();
}
function agoraMs(): number {
  return Date.now();
}

function quando(iso: string, agora: number): string {
  const h = Math.round((agora - Date.parse(iso)) / 3_600_000);
  if (h < 1) return "agora há pouco";
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

export default async function InteressadosPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  if (!(await lerSessao())) redirect("/login");
  const email = await emailDaEquipe();
  if (!email) notFound();
  const { ver } = await searchParams;
  const mostrarTodos = ver === "todos";
  const agora = agoraMs();

  const [listaLeads, pedidos] = await Promise.all([
    db.select().from(leads).where(gte(leads.createdAt, inicioDaJanela(120))).orderBy(desc(leads.createdAt)).limit(500),
    db
      .select({
        id: pedidosProposta.id,
        municipio: pedidosProposta.municipio,
        uf: pedidosProposta.uf,
        nome: pedidosProposta.nome,
        email: pedidosProposta.email,
        telefone: pedidosProposta.telefone,
        status: pedidosProposta.status,
        createdAt: pedidosProposta.createdAt,
      })
      .from(pedidosProposta)
      .where(inArray(pedidosProposta.status, ["recebido"]))
      .orderBy(desc(pedidosProposta.createdAt))
      .limit(200),
  ]);

  const eventos = listaLeads.length
    ? await db
        .select({ pedidoId: pedidoEventos.pedidoId, tipo: pedidoEventos.tipo, descricao: pedidoEventos.descricao, criadoEm: pedidoEventos.criadoEm })
        .from(pedidoEventos)
        .where(inArray(pedidoEventos.pedidoId, listaLeads.map((l) => l.id)))
    : [];

  const linhas = listaLeads
    .map((l) => {
      const ev = eventos.filter((e) => e.pedidoId === l.id);
      const tel = telefoneDoLead(ev);
      const situacao = situacaoDoLead(ev);
      return { l, tel, situacao, prioridade: prioridadeDoLead(l, !!tel) };
    })
    .filter((x) => mostrarTodos || x.situacao === "novo" || x.situacao === "contatado")
    .sort(
      (a, b) =>
        Number(b.situacao === "novo") - Number(a.situacao === "novo") ||
        b.prioridade - a.prioridade ||
        b.l.createdAt.localeCompare(a.l.createdAt)
    );

  const agenda = agendaComercial(pedidos, agora);
  const ligacoesPendentes = linhas.filter((x) => x.situacao === "novo" && x.tel).length;
  const novos = linhas.filter((x) => x.situacao === "novo").length;

  const cor: Record<SituacaoLead, string> = {
    novo: "var(--urgente)",
    contatado: "var(--medio)",
    virou_pedido: "var(--info)",
    descartado: "var(--muted)",
  };

  return (
    <div className="tema-noite min-h-screen bg-background px-4 sm:px-8 py-10">
      <div className="max-w-[1200px] mx-auto space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.04em]">Interessados</h1>
            <p className="text-sm text-muted mt-2">Ninguém que levantou a mão fica sem resposta.</p>
          </div>
          <nav className="flex items-center gap-5 text-sm">
            <span className="font-medium">Interessados</span>
            <Link href="/admin/pedidos" className="text-muted hover:text-foreground">Pedidos</Link>
            <Link href="/admin/financeiro" className="text-muted hover:text-foreground">Financeiro</Link>
            <Link href="/admin/medicao" className="text-muted hover:text-foreground">Medição</Link>
          </nav>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { n: agenda.propostasAtrasadas.length, r: "propostas fora do prazo de 1 dia útil", c: "var(--urgente)" },
            { n: agenda.propostasVencendoHoje.length, r: "propostas que vencem hoje", c: "var(--medio)" },
            { n: ligacoesPendentes, r: "ligações pedidas, ainda não feitas", c: "var(--urgente)" },
            { n: novos, r: "interessados sem contato", c: "var(--foreground)" },
          ].map((x) => (
            <div key={x.r} className="rounded-2xl border border-border p-5" style={{ background: "var(--card)" }}>
              <p className="text-3xl font-semibold tabular-nums tracking-[-0.04em]" style={{ color: x.n ? x.c : "var(--muted)" }}>{x.n}</p>
              <p className="text-sm text-muted mt-1 leading-snug">{x.r}</p>
            </div>
          ))}
        </div>

        {(agenda.propostasAtrasadas.length > 0 || agenda.propostasVencendoHoje.length > 0) && (
          <section className="rounded-[22px] border p-5 sm:p-6" style={{ borderColor: "var(--urgente-borda)", background: "var(--urgente-tint)" }}>
            <h2 className="font-semibold">O site prometeu proposta em um dia útil</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {[...agenda.propostasAtrasadas, ...agenda.propostasVencendoHoje].map((p) => {
                const atrasado = prazoDeUmDiaUtil(p.createdAt) < agora;
                return (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <strong style={{ color: atrasado ? "var(--urgente)" : "var(--medio)" }}>{atrasado ? "Atrasada" : "Vence hoje"}</strong> · {p.municipio}/{p.uf} ·{" "}
                      {p.nome} · protocolo {protocolo(p.id)} · pedido {quando(p.createdAt, agora)}
                    </span>
                    <Link href="/admin/pedidos?etapa=recebido" className="font-semibold hover:underline">Abrir na mesa →</Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
            <h2 className="text-xl font-semibold">{mostrarTodos ? "Todos os interessados (120 dias)" : "Para atender"}</h2>
            <Link href={mostrarTodos ? "/admin/interessados" : "/admin/interessados?ver=todos"} className="text-sm text-muted hover:text-foreground">
              {mostrarTodos ? "Ver só os abertos" : "Ver também descartados e convertidos"}
            </Link>
          </div>
          {linhas.length === 0 ? (
            <p className="text-muted rounded-2xl border border-border p-6" style={{ background: "var(--card)" }}>Nenhum interessado aguardando.</p>
          ) : (
            <ul className="space-y-2.5">
              {linhas.map(({ l, tel, situacao }) => {
                const assunto = `CidadeIA — ${l.municipio ? `${l.municipio}${l.uf ? `/${l.uf}` : ""}` : "seu município"}`;
                const corpo =
                  `Olá, ${l.nome.split(" ")[0]}.\n\nAqui é da equipe do CidadeIA. ` +
                  (l.origem === "projecao"
                    ? "Vi que você pediu a projeção da despesa com pessoal"
                    : "Vi que você consultou o Raio-X") +
                  `${l.municipio ? ` de ${l.municipio}` : ""}. Posso te mostrar em 15 minutos o que o painel apontaria para a prefeitura, com os números dela?\n\n`;
                return (
                  <li key={l.id} className="rounded-2xl border border-border p-4 sm:p-5 grid lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-center" style={{ background: "var(--card)" }}>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold" style={{ color: cor[situacao] }}>
                        {ROTULO_SITUACAO_LEAD[situacao]} · {ORIGEM[l.origem] ?? l.origem} · {quando(l.createdAt, agora)}
                      </p>
                      <p className="font-semibold text-lg mt-1">
                        {l.nome} <span className="text-muted font-normal">· {l.cargo ?? "cargo não informado"}</span>
                      </p>
                      <p className="text-sm text-muted mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        {l.municipio && (
                          <span>
                            {l.codigoIbge && l.uf ? (
                              <Link href={caminhoDoRaioX({ uf: l.uf, nome: l.municipio })} className="hover:underline">
                                {l.municipio}/{l.uf}
                              </Link>
                            ) : (
                              l.municipio
                            )}
                          </span>
                        )}
                        {tel && (
                          <a href={`tel:+55${tel.telefone.replace(/\D/g, "")}`} className="font-semibold text-foreground hover:underline">
                            {tel.telefone}
                            {tel.horario ? ` · ${tel.horario}` : ""}
                          </a>
                        )}
                        {l.email && (
                          <a href={`mailto:${l.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`} className="hover:underline">
                            {l.email}
                          </a>
                        )}
                        {l.email && !l.emailEnviado && l.origem !== "ligacao" && (
                          <span style={{ color: "var(--medio)" }}>o envio automático falhou: responder à mão</span>
                        )}
                      </p>
                    </div>
                    <AcoesInteressado leadId={l.id} situacao={situacao} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
