import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { escolas } from "@/db/schema";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import { buscarCasoBuscaAtiva } from "../../../busca-ativa-actions";
import { textoOficioConselhoTutelar, numeroDoOficio, etapas } from "@/lib/busca-ativa";
import BotaoImprimir from "./BotaoImprimir";

// ── O OFÍCIO AO CONSELHO TUTELAR ──
//
// O documento que a escola quase nunca faz e que é exatamente o que o
// Ministério Público cobra quando a criança fica fora da escola. Sai do
// que já está na ficha: quem é o aluno, quanto faltou, e o que a escola
// tentou antes — com data.
//
// Nada aqui é inventado: se uma etapa não foi registrada, ela não aparece
// no ofício. Um documento que afirma tentativas que não houve é pior do
// que documento nenhum.

export const metadata = { title: "Ofício ao Conselho Tutelar" };
export const dynamic = "force-dynamic";

export default async function OficioPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("educacao")) return <BloqueioPlano plano="educacao" />;
  const { id } = await params;

  const caso = await buscarCasoBuscaAtiva(id);
  if (!caso) notFound();

  const [escola] = await db
    .select({ id: escolas.id, nome: escolas.nome })
    .from(escolas)
    .where(and(eq(escolas.id, caso.escolaId), eq(escolas.prefeituraId, ctx.sessao.prefeituraId)))
    .limit(1);
  if (!escola) notFound();

  const feitas = etapas(caso).filter((e) => e.feitaEm !== null);
  const faltaContato = caso.contatoFamiliaEm === null;
  const texto = textoOficioConselhoTutelar({
    caso,
    escola: escola.nome,
    municipio: ctx.prefeitura.municipio ?? ctx.prefeitura.nome,
    estado: ctx.prefeitura.estado ?? "",
    numero: numeroDoOficio(caso.id),
  });

  return (
    <div className="max-w-3xl space-y-5">
      <div className="nao-imprimir">
        <Link
          href={`/dashboard/secretarias/educacao/escolas/${escola.id}`}
          className="text-xs font-semibold text-muted hover:text-brand transition"
        >
          ← {escola.nome}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3 mt-2">
          <div>
            <h1 className="font-serif text-2xl font-bold">Ofício ao Conselho Tutelar</h1>
            <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-2xl">
              Montado do que está na ficha. Confira, imprima, assine e protocole — e depois marque a etapa
              “Comunicação ao Conselho Tutelar” na ficha, para a data ficar registrada.
            </p>
          </div>
          <BotaoImprimir />
        </div>
      </div>

      {feitas.length === 0 && (
        <p className="nao-imprimir text-sm leading-relaxed rounded-xl px-4 py-3 border" style={{ color: "var(--urgente)", background: "var(--urgente-tint)", borderColor: "var(--urgente)" }}>
          <strong>Nenhuma tentativa registrada ainda.</strong> O ECA (art. 56, II) manda comunicar o
          Conselho Tutelar <em>esgotados os recursos escolares</em>. Sem o contato com a família e a
          convocação registrados, a comunicação fica frágil e a responsabilidade volta para a escola.
        </p>
      )}
      {feitas.length > 0 && faltaContato && (
        <p className="nao-imprimir text-sm leading-relaxed rounded-xl px-4 py-3 border" style={{ color: "var(--medio)", background: "var(--medio-tint)", borderColor: "var(--medio-borda)" }}>
          O contato com a família não está registrado. Se ele aconteceu, marque na ficha antes de
          protocolar: é a primeira coisa que o Conselho pergunta.
        </p>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 imprimir-limpo">
        <pre className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed">{texto}</pre>
      </div>

      <p className="nao-imprimir text-xs text-muted leading-relaxed">
        Base legal citada no documento: art. 56, II, da Lei 8.069/1990 (ECA); art. 12, VIII, e art. 24, VI,
        da Lei 9.394/1996 (LDB). O ofício lista apenas as etapas com data registrada na ficha — o que não
        foi feito não aparece.
      </p>
    </div>
  );
}
