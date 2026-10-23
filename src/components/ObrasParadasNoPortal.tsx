import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { configPublica } from "@/db/schema";
import { lerObrasFederais } from "@/lib/obras-federais-servidor";
import { obrasParadasParaPublicar, textosDoAviso } from "@/lib/obra-parada-publica";

// ── O QUE O SISTEMA JÁ PUBLICOU SOZINHO ──
//
// Na tela de Obras, o gestor vê os avisos de obra paralisada que o portal já
// publicou (lib/obra-parada-publica.ts) e baixa a placa de cada um. Não há
// botão de "publicar": publicar é automático. O que muda o aviso é o que o
// gestor já faz no módulo — marcar a obra como parada ou retomada, e registrar
// a decisão com a justificativa e a nova previsão.

type Obra = Parameters<typeof obrasParadasParaPublicar>[0][number];
type Decisao = { tipo: string; justificativa: string; novaPrevisao: string | null; decididoEm: string };

export default async function ObrasParadasNoPortal({
  prefeituraId,
  obras,
  decisoes,
}: {
  prefeituraId: string;
  obras: Obra[];
  decisoes: Map<string, Decisao>;
}) {
  const [[config], federais] = await Promise.all([
    db.select({ slug: configPublica.slug, ativo: configPublica.portalAtivo, mostrar: configPublica.mostrarObras }).from(configPublica).where(eq(configPublica.prefeituraId, prefeituraId)),
    lerObrasFederais(prefeituraId),
  ]);
  const paradas = obrasParadasParaPublicar(
    obras,
    [...decisoes].map(([obraId, d]) => ({ obraId, ...d })),
    federais?.obras ?? []
  );
  if (!paradas.length) return null;
  const publicado = Boolean(config?.ativo && config.mostrar);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="font-semibold">
          {paradas.length === 1
            ? `1 aviso de obra paralisada ${publicado ? "publicado sozinho no portal" : "pronto para o portal"}`
            : `${paradas.length} avisos de obra paralisada ${publicado ? "publicados sozinhos no portal" : "prontos para o portal"}`}
        </h2>
        {publicado && config && (
          <Link href={`/transparencia/${config.slug}#obras`} className="text-sm font-semibold text-brand-claro hover:underline">
            Ver no portal →
          </Link>
        )}
      </div>
      <p className="text-sm text-muted mt-1">
        {publicado
          ? "Motivo, responsável e reinício, como pede o art. 115, § 6º, da Lei 14.133/2021, com a placa pronta para imprimir. Ao marcar a obra como retomada, o aviso sai do ar."
          : "Ative o portal do cidadão em Configurações para que os avisos e as placas sejam publicados."}
      </p>
      <ul className="mt-4 divide-y divide-border">
        {paradas.map((o) => {
          const t = textosDoAviso(o);
          return (
            <li key={o.id} className="py-3 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="font-medium break-words">{o.nome}</p>
                <p className="text-sm text-muted">
                  {t.desde} · {o.fonte}
                  {o.motivo ? "" : " · motivo ainda não registrado"}
                </p>
              </div>
              {publicado && config && (
                <Link href={`/transparencia/${config.slug}/placa/${o.id}`} className="text-sm font-semibold text-brand-claro hover:underline whitespace-nowrap">
                  Placa para imprimir
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
