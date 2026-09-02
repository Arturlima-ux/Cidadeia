import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import { db } from "@/db";
import { configPublica } from "@/db/schema";
import { eq } from "drizzle-orm";
import { coberturaLegal } from "@/lib/publicacoes";
import { listarPublicacoes } from "./actions";
import GerenciadorPublicacoes from "./GerenciadorPublicacoes";

export const metadata = { title: "Publicações do portal — CidadeIA" };

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

  const cobertura = coberturaLegal(publicacoes);
  const descobertas = cobertura.filter((c) => !c.atendida);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-bold">Publicações do portal</h1>
        <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-2xl">
          O portal já mostra sozinho o orçamento, as obras e as licitações. Aqui
          você escreve o resto — o que está sendo feito, os serviços, os
          horários das secretarias. O cidadão lê no endereço público e não
          altera nada.
        </p>
      </div>

      {/* A cobertura vem antes do gerenciador de propósito: sem ela isto seria
          um editor de textos, e o gestor não teria como saber que um inciso
          da LAI continua descoberto até o Tribunal de Contas contar. */}
      <section
        className="border rounded-xl p-5"
        style={{
          background: descobertas.length > 0 ? "var(--medio-tint)" : "var(--info-tint)",
          borderColor: descobertas.length > 0 ? "var(--medio-borda)" : "var(--info-borda)",
        }}
      >
        <h2
          className="font-semibold text-sm"
          style={{ color: descobertas.length > 0 ? "var(--medio)" : "var(--info)" }}
        >
          {descobertas.length === 0
            ? "As quatro exigências de conteúdo estão cobertas"
            : `${descobertas.length} de ${cobertura.length} exigências de conteúdo ainda sem publicação`}
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {cobertura.map((c) => (
            <li key={c.tipo} className="text-sm flex flex-wrap items-baseline gap-x-2.5">
              <span style={{ color: c.atendida ? "var(--info)" : "var(--medio)" }}>
                {c.atendida ? "✓" : "○"}
              </span>
              <span className={c.atendida ? "text-muted" : "font-medium"}>{c.nome}</span>
              <span className="text-xs font-mono text-muted">
                {c.lei}, {c.artigo}
              </span>
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
