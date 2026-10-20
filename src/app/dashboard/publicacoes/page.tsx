import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import { db } from "@/db";
import { configPublica } from "@/db/schema";
import { eq } from "drizzle-orm";
import { radarDaPrefeitura } from "@/lib/radar-transparencia-servidor";
import { listarPublicacoes } from "./actions";
import GerenciadorPublicacoes from "./GerenciadorPublicacoes";

export const metadata = { title: "Publicações do portal" };

export default async function PublicacoesPage() {
  const { sessao, temPlano } = await contextoDashboard();
  if (!temPlano("essencial")) return <BloqueioPlano plano="essencial" />;

  const [publicacoes, config] = await Promise.all([
    listarPublicacoes(),
    db
      .select({ slug: configPublica.slug, ativo: configPublica.portalAtivo })
      .from(configPublica)
      .where(eq(configPublica.prefeituraId, sessao.prefeituraId))
      .limit(1)
      .then((r) => r[0] ?? null),
  ]);

  const radar = await radarDaPrefeitura(sessao.prefeituraId);
  const faltam = radar.filter((i) => i.situacao !== "ok");
  const sozinhos = radar.filter((i) => i.sozinho).length;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Publicações do portal</h1>
        <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-2xl">
          O portal já mostra sozinho o orçamento, as obras e as licitações. Aqui
          você escreve o resto — o que está sendo feito, os serviços, os
          horários das secretarias. O cidadão lê no endereço público e não
          altera nada.
        </p>
      </div>

      {/* O radar vem antes do gerenciador de propósito: sem ele isto seria um
          editor de textos, e o gestor não teria como saber o que o Tribunal
          de Contas vai achar faltando (lib/radar-transparencia.ts). */}
      <section className="bg-card border border-border rounded-xl p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Radar da transparência</h2>
          <p className="text-xs text-muted">conferido todo dia contra o próprio portal</p>
        </div>
        <p className="text-sm text-muted mt-1">
          {faltam.length === 0
            ? `Os ${radar.length} itens que o Tribunal de Contas confere estão no portal.`
            : `${faltam.length} de ${radar.length} itens que o Tribunal de Contas confere ainda faltam. O resto o portal já cumpre${sozinhos ? `, ${sozinhos} deles sem ninguém precisar fazer nada` : ""}.`}
        </p>
        <ul className="mt-4 divide-y divide-border">
          {[...radar].sort((a, b) => Number(a.situacao === "ok") - Number(b.situacao === "ok")).map((i) => (
            <li key={i.chave} className="py-2.5 flex gap-3 text-sm">
              <span
                className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                style={{ background: i.situacao === "ok" ? "var(--info)" : i.situacao === "velho" ? "var(--medio)" : "var(--urgente)" }}
                aria-hidden
              />
              <div className="min-w-0">
                <p className={i.situacao === "ok" ? "" : "font-medium"}>
                  {i.nome}
                  {i.sozinho && <span className="ml-2 text-[11px] font-semibold rounded-full px-2 py-0.5 bg-brand-tint text-brand">automático</span>}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {i.detalhe} <span className="font-mono">({i.base})</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {config && !config.ativo && (
        <p
          className="text-sm rounded-lg px-4 py-3"
          style={{ background: "var(--medio-tint)", color: "var(--medio)" }}
        >
          O portal público está desativado nas configurações de atendimento —
          nada do que você publicar aqui aparece para o cidadão enquanto isso.
        </p>
      )}

      <GerenciadorPublicacoes publicacoes={publicacoes} slugPortal={config?.slug ?? null} />
    </div>
  );
}
