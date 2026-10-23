import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { configPublica } from "@/db/schema";
import { lerObrasFederais } from "@/lib/obras-federais-servidor";
import { obrasParadasParaPublicar, textosDoAviso } from "@/lib/obra-parada-publica";

// ── O QUE O SISTEMA PUBLICOU SOZINHO, E O QUE ESPERA ──
//
// Na tela de Obras, o gestor vê os avisos de obra paralisada. Não há botão de
// "publicar": o aviso vai ao portal sozinho quando a decisão registrada sobre
// a obra traz o motivo, o responsável e a data de reinício
// (lib/obra-parada-publica.ts). Faltando algum, ele espera aqui, com o que
// falta escrito. As obras federais vão ao portal como registro do ObrasGov.

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
  const portalNoAr = Boolean(config?.ativo && config.mostrar);
  const completos = paradas.filter((o) => o.aviso === "completo");
  const pendentes = paradas.filter((o) => o.aviso === "pendente");
  const doObrasGov = paradas.filter((o) => o.aviso === "federal");

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="font-semibold">Aviso de obra paralisada (art. 115, § 6º, da Lei 14.133/2021)</h2>
        {portalNoAr && config && (
          <Link href={`/transparencia/${config.slug}#obras`} className="text-sm font-semibold text-brand-claro hover:underline">
            Ver no portal →
          </Link>
        )}
      </div>
      <p className="text-sm text-muted mt-1">
        {portalNoAr
          ? "O aviso vai ao portal sozinho quando a decisão sobre a obra traz motivo, responsável e data de reinício. Ao marcar a obra como retomada, ele sai do ar. Replique o texto e a placa no site oficial da prefeitura, que é onde a lei pede a divulgação."
          : "Ative o portal do cidadão em Configurações para que os avisos completos sejam publicados."}
      </p>
      <ul className="mt-4 divide-y divide-border">
        {pendentes.map((o) => (
          <li key={o.id} className="py-3">
            <p className="font-medium break-words">{o.nome}</p>
            <p className="text-sm mt-0.5" style={{ color: "var(--medio)" }}>
              Esperando para publicar: falta {juntar(o.falta)}. Registre a decisão sobre a obra com {o.falta.length > 1 ? "esses dados" : "esse dado"}.
            </p>
          </li>
        ))}
        {completos.map((o) => {
          const t = textosDoAviso(o);
          return (
            <li key={o.id} className="py-3 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="font-medium break-words">{o.nome}</p>
                <p className="text-sm text-muted">
                  {t.desde} · {portalNoAr ? "publicado no portal" : "pronto para o portal"}
                </p>
              </div>
              {portalNoAr && config && (
                <Link href={`/transparencia/${config.slug}/placa/${o.id}`} className="text-sm font-semibold text-brand-claro hover:underline whitespace-nowrap">
                  Placa para imprimir
                </Link>
              )}
            </li>
          );
        })}
        {doObrasGov.map((o) => (
          <li key={o.id} className="py-3">
            <p className="font-medium break-words">{o.nome}</p>
            <p className="text-sm text-muted">
              {textosDoAviso(o).desde} · obra federal: aparece no portal como registro do ObrasGov
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function juntar(l: string[]): string {
  return l.length <= 1 ? (l[0] ?? "") : `${l.slice(0, -1).join(", ")} e ${l[l.length - 1]}`;
}
