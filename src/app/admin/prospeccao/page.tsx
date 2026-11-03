import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { like } from "drizzle-orm";
import { db } from "@/db";
import { pedidoEventos } from "@/db/schema";
import { lerSessao } from "@/lib/sessao";
import { emailDaEquipe } from "@/lib/equipe";
import { caminhoDoRaioX } from "@/lib/slug-municipio";
import {
  ETAPAS,
  ROTULO_CANAL,
  ROTULO_SITUACAO,
  SAIDAS,
  TIPO,
  contagem,
  diaDeBrasilia,
  linkDoContato,
  montarTodos,
  paraHoje,
  taxas,
  type Prospecto,
  type Situacao,
} from "@/lib/prospeccao";
import NavAdmin from "../NavAdmin";
import NovoProspecto from "./NovoProspecto";
import AcoesProspecto from "./AcoesProspecto";

export const dynamic = "force-dynamic";

// ── A MESA DE PROSPECÇÃO ──
//
// O começo do funil de vendas, antes do pedido: as prefeituras que a equipe
// procura nas redes, por e-mail e por telefone (guia: "Guia de vendas do
// CidadeIA"). No topo, o funil e as taxas de cada passagem; logo abaixo, o
// que é para hoje, que é o que o guia manda abrir primeiro; depois o
// cadastro e os prospectos por etapa. Quando vira pedido, segue em
// /admin/pedidos. As regras estão em lib/prospeccao.ts.

const COR: Record<Situacao, string> = {
  mapeada: "var(--muted)",
  aquecendo: "var(--muted)",
  abordada: "var(--medio)",
  conversando: "var(--brand-claro)",
  qualificada: "var(--brand-claro)",
  reuniao: "var(--info)",
  pedido: "var(--info)",
  pausada: "var(--muted)",
  descartada: "var(--muted)",
};

/** "05/11", ou "05/11/2027" quando não é o ano de hoje. */
function dataCurta(dia: string, hoje: string): string {
  const [a, m, d] = dia.split("-");
  return `${d}/${m}${a === hoje.slice(0, 4) ? "" : `/${a}`}`;
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

function textoDoRegistro(tipo: string, descricao: string, hoje: string): string {
  try {
    if (tipo === TIPO.criado) return "Entrou na mesa";
    if (tipo === TIPO.situacao) return `Etapa: ${ROTULO_SITUACAO[(JSON.parse(descricao) as { situacao: Situacao }).situacao] ?? "?"}`;
    if (tipo === TIPO.proxima) {
      const p = JSON.parse(descricao) as { acao: string; data: string } | null;
      return p ? `Próxima: ${p.acao} (${dataCurta(p.data, hoje)})` : "Sem próxima ação";
    }
  } catch {
    return descricao;
  }
  return descricao;
}

export default async function ProspeccaoPage({ searchParams }: { searchParams: Promise<{ etapa?: string }> }) {
  if (!(await lerSessao())) redirect("/login");
  const email = await emailDaEquipe();
  if (!email) notFound();
  const { etapa } = await searchParams;
  const agora = agoraMs();
  const hoje = diaDeBrasilia(agora);

  const registros = await db
    .select({
      pedidoId: pedidoEventos.pedidoId,
      tipo: pedidoEventos.tipo,
      descricao: pedidoEventos.descricao,
      autor: pedidoEventos.autor,
      criadoEm: pedidoEventos.criadoEm,
    })
    .from(pedidoEventos)
    .where(like(pedidoEventos.tipo, "pros\\_%"))
    .limit(20_000);

  const todos = montarTodos(registros);
  const c = contagem(todos);
  const t = taxas(todos);
  const agenda = paraHoje(todos, hoje);
  const filtro = ([...ETAPAS, ...SAIDAS] as string[]).includes(etapa ?? "") ? (etapa as Situacao) : null;
  const abertos: Situacao[] = ["mapeada", "aquecendo", "abordada", "conversando", "qualificada", "reuniao"];
  const lista = todos
    .filter((p) => (filtro ? p.situacao === filtro : abertos.includes(p.situacao)))
    .sort(
      (a, b) =>
        (a.proxima?.data ?? "9999").localeCompare(b.proxima?.data ?? "9999") || b.atualizadoEm.localeCompare(a.atualizadoEm)
    );

  return (
    <div className="tema-noite min-h-screen bg-background px-4 sm:px-8 py-10">
      <div className="max-w-[1200px] mx-auto space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.04em]">Prospecção</h1>
            <p className="text-sm text-muted mt-2">Da prefeitura encontrada à reunião marcada. Depois, segue em Pedidos.</p>
          </div>
          <NavAdmin atual="/admin/prospeccao" />
        </div>

        {/* O funil: quantos estão em cada etapa agora, e as taxas de passagem. */}
        <section aria-labelledby="titulo-funil" className="rounded-[22px] border border-border p-5 sm:p-6" style={{ background: "var(--card)" }}>
          <h2 id="titulo-funil" className="sr-only">
            O funil agora
          </h2>
          <ol className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-4 gap-y-5">
            {ETAPAS.map((e, i) => (
              <li key={e} className="min-w-0">
                <Link href={`/admin/prospeccao?etapa=${e}`} className="block group">
                  <p className="text-xs text-muted">
                    {i + 1}. {ROTULO_SITUACAO[e]}
                  </p>
                  <p className="text-3xl font-semibold tabular-nums tracking-[-0.04em] mt-1 group-hover:underline" style={{ color: c[e] ? "var(--foreground)" : "var(--muted)" }}>
                    {c[e]}
                  </p>
                </Link>
              </li>
            ))}
          </ol>
          <div className="mt-6 pt-5 border-t border-border grid grid-cols-2 lg:grid-cols-4 gap-4">
            {t.map((x) => (
              <div key={x.rotulo}>
                <p className="text-xs text-muted">Taxa de {x.rotulo.toLowerCase()}</p>
                <p className="text-xl font-semibold tabular-nums mt-0.5">
                  {x.valor === null ? "—" : `${Math.round(x.valor * 100)}%`}
                </p>
                <p className="text-xs text-muted">
                  {x.chegaram} de {x.base} {x.base === 1 ? "que chegou" : "que chegaram"} a {ROTULO_SITUACAO[x.de].toLowerCase()}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">
            {c.pausada} {c.pausada === 1 ? "pausada" : "pausadas"} · {c.descartada} {c.descartada === 1 ? "descartada" : "descartadas"} ·{" "}
            <Link href="/admin/prospeccao?etapa=pausada" className="hover:underline">ver pausadas</Link>
          </p>
        </section>

        {/* O guia manda abrir isto primeiro: o combinado antes do novo. */}
        <section aria-labelledby="titulo-hoje">
          <h2 id="titulo-hoje" className="text-xl font-semibold mb-3">
            Para hoje
          </h2>
          {agenda.length === 0 ? (
            <p className="text-muted rounded-2xl border border-border p-6" style={{ background: "var(--card)" }}>
              Nada vencido nem marcado para hoje.
            </p>
          ) : (
            <ul className="space-y-2">
              {agenda.map((p) => (
                <li key={p.id} className="rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3" style={{ background: "var(--card)", borderColor: p.atrasada ? "var(--urgente-borda)" : "var(--border)" }}>
                  <p className="min-w-0">
                    <strong style={{ color: p.atrasada ? "var(--urgente)" : "var(--medio)" }}>{p.atrasada ? `Venceu ${dataCurta(p.proxima.data, hoje)}` : "Hoje"}</strong>
                    {" · "}
                    {p.dados.municipio}/{p.dados.uf}
                    {p.dados.pessoa && ` · ${p.dados.pessoa}`}
                    <span className="block text-sm text-muted mt-0.5">{p.proxima.acao}</span>
                  </p>
                  <a href={`#${p.id}`} className="text-sm font-semibold hover:underline">
                    Abrir →
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <NovoProspecto />

        <section aria-labelledby="titulo-lista">
          <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
            <h2 id="titulo-lista" className="text-xl font-semibold">
              {filtro ? ROTULO_SITUACAO[filtro] : "Em andamento"} <span className="text-muted font-normal">({lista.length})</span>
            </h2>
            {filtro && (
              <Link href="/admin/prospeccao" className="text-sm text-muted hover:text-foreground">
                Ver todos em andamento
              </Link>
            )}
          </div>
          {lista.length === 0 ? (
            <p className="text-muted rounded-2xl border border-border p-6" style={{ background: "var(--card)" }}>
              {todos.length === 0
                ? "Nenhum prospecto ainda. Comece pelas cidades estudando o CidadeIA, em Interessados, ou cadastre um acima."
                : "Nenhum prospecto nesta etapa."}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {lista.map((p) => (
                <Cartao key={p.id} p={p} hoje={hoje} agora={agora} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Cartao({ p, hoje, agora }: { p: Prospecto; hoje: string; agora: number }) {
  const link = linkDoContato(p.dados.canal, p.dados.contato);
  const atrasada = p.proxima && p.proxima.data < hoje;
  return (
    <li id={p.id} className="scroll-mt-24 rounded-2xl border border-border p-4 sm:p-5 grid lg:grid-cols-[minmax(0,1fr)_auto] gap-4" style={{ background: "var(--card)" }}>
      <div className="min-w-0">
        <p className="text-xs font-semibold" style={{ color: COR[p.situacao] }}>
          {ROTULO_SITUACAO[p.situacao]} {quando(p.desde, agora)}
          {p.followups > 0 && ` · ${p.followups} follow-up${p.followups > 1 ? "s" : ""}`}
        </p>
        <p className="font-semibold text-lg mt-1">
          {p.dados.codigoIbge ? (
            <Link href={caminhoDoRaioX({ uf: p.dados.uf, nome: p.dados.municipio })} className="hover:underline">
              {p.dados.municipio}/{p.dados.uf}
            </Link>
          ) : (
            `${p.dados.municipio}/${p.dados.uf}`
          )}
          <span className="text-muted font-normal">
            {" "}
            · {p.dados.pessoa || "pessoa a descobrir"}
            {p.dados.cargo && `, ${p.dados.cargo}`}
          </span>
        </p>
        <p className="text-sm text-muted mt-1 flex flex-wrap gap-x-4 gap-y-1">
          <span>{ROTULO_CANAL[p.dados.canal]}</span>
          {p.dados.contato &&
            (link ? (
              <a href={link} target={link.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="text-foreground hover:underline break-all">
                {p.dados.contato}
              </a>
            ) : (
              <span className="break-all">{p.dados.contato}</span>
            ))}
        </p>
        {p.dados.gancho && <p className="text-sm mt-2 leading-relaxed">Gancho: {p.dados.gancho}</p>}
        {p.proxima && (
          <p className="text-sm mt-2">
            <span className="font-medium" style={{ color: atrasada ? "var(--urgente)" : "var(--foreground)" }}>
              {p.proxima.data === hoje ? "Hoje" : atrasada ? `Venceu ${dataCurta(p.proxima.data, hoje)}` : dataCurta(p.proxima.data, hoje)}
            </span>{" "}
            · {p.proxima.acao}
          </p>
        )}
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-muted hover:text-foreground">Histórico ({p.historico.length})</summary>
          <ol className="mt-2 space-y-1 text-xs text-muted">
            {[...p.historico].reverse().map((r, i) => (
              <li key={`${r.criadoEm}-${i}`}>
                <span className="tabular-nums">{new Date(r.criadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                {" · "}
                <span className="text-foreground">{textoDoRegistro(r.tipo, r.descricao, hoje)}</span>
                {" · "}
                {r.autor}
              </li>
            ))}
          </ol>
        </details>
      </div>
      <AcoesProspecto id={p.id} situacao={p.situacao} hoje={hoje} />
    </li>
  );
}
