import { desc, eq, and } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { auditoria } from "@/db/schema";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import { NOME_ENTIDADE, NOME_ACAO, type EntidadeAuditada, type AcaoAuditada } from "@/lib/auditoria";
import { fusoDoEstado, dataHoraNumerica } from "@/lib/horario";

// ── AUDITORIA: QUEM MUDOU O QUÊ ──
//
// A tela que o controle interno abre. Sem trava de módulo de propósito:
// a trilha existe para dar confiança, e confiança não se vende à parte.
// Só prefeito e admin veem (o proxy já barra secretário).

export const metadata = { title: "Auditoria" };
export const dynamic = "force-dynamic";

const TOM: Record<string, string> = {
  criar: "var(--accent)",
  publicar: "var(--accent)",
  ativar: "var(--accent)",
  excluir: "var(--urgente)",
  despublicar: "var(--medio)",
  alterar: "var(--brand)",
};

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ entidade?: string }>;
}) {
  const ctx = await contextoDashboard();
  const { entidade } = await searchParams;
  const filtro = entidade && entidade in NOME_ENTIDADE ? (entidade as EntidadeAuditada) : null;

  let linhas: (typeof auditoria.$inferSelect)[] = [];
  let falhou = false;
  try {
    linhas = await db
      .select()
      .from(auditoria)
      .where(filtro ? and(eq(auditoria.prefeituraId, ctx.sessao.prefeituraId), eq(auditoria.entidade, filtro)) : eq(auditoria.prefeituraId, ctx.sessao.prefeituraId))
      .orderBy(desc(auditoria.createdAt))
      .limit(300);
  } catch (e) {
    console.error("[auditoria] não foi possível listar:", e);
    falhou = true;
  }

  const fuso = fusoDoEstado(ctx.prefeitura?.estado ?? "PI");
  const entidadesPresentes = Object.keys(NOME_ENTIDADE) as EntidadeAuditada[];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Auditoria</h1>
        <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-2xl">
          Quem alterou o quê, e quando. Cada linha é uma ação de alguém com acesso a esta conta —
          criar, alterar, excluir, responder, publicar, importar. Leitura de tela não é registrada.
          O nome fica gravado mesmo se o usuário for removido depois.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/auditoria"
          className={`text-xs font-semibold rounded-full px-3 py-1.5 border transition ${!filtro ? "border-brand text-brand" : "border-border text-muted hover:border-brand"}`}
        >
          Tudo
        </Link>
        {entidadesPresentes.map((e) => (
          <Link
            key={e}
            href={`/dashboard/auditoria?entidade=${e}`}
            className={`text-xs font-semibold rounded-full px-3 py-1.5 border transition ${filtro === e ? "border-brand text-brand" : "border-border text-muted hover:border-brand"}`}
          >
            {NOME_ENTIDADE[e]}
          </Link>
        ))}
      </div>

      {falhou && (
        <p className="text-sm rounded-lg px-3 py-2.5 border" style={{ color: "var(--medio)", background: "var(--medio-tint)", borderColor: "var(--medio-borda)" }}>
          A trilha não pôde ser lida agora. Tente de novo em instantes.
        </p>
      )}

      {!falhou && linhas.length === 0 && (
        <p className="text-sm text-muted border border-dashed border-border rounded-2xl p-8 text-center">
          Nenhuma alteração registrada{filtro ? ` em ${NOME_ENTIDADE[filtro].toLowerCase()}` : ""} ainda. A partir de agora, cada
          mudança feita no painel aparece aqui.
        </p>
      )}

      {linhas.length > 0 && (
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {linhas.map((l) => (
            <div key={l.id} className="px-5 py-3.5 grid sm:grid-cols-[150px_1fr] gap-x-4 gap-y-1">
              <p className="text-xs text-muted font-mono tabular-nums">{dataHoraNumerica(l.createdAt, fuso)}</p>
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-semibold">{l.usuarioNome}</span>
                  <span className="text-muted"> ({l.usuarioCargo}) </span>
                  <span className="font-semibold" style={{ color: TOM[l.acao] ?? "var(--foreground)" }}>
                    {NOME_ACAO[l.acao as AcaoAuditada] ?? l.acao}
                  </span>{" "}
                  <span className="text-muted">{(NOME_ENTIDADE[l.entidade as EntidadeAuditada] ?? l.entidade).toLowerCase()}</span>
                </p>
                <p className="text-sm text-muted break-words">{l.resumo}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted leading-relaxed max-w-2xl">
        Mostra as últimas 300 alterações. A trilha completa faz parte da exportação de dados da
        prefeitura em <Link href="/dashboard/dados" className="underline">Meus dados</Link>.
      </p>
    </div>
  );
}
