import Link from "next/link";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import BadgePrioridade from "@/components/BadgePrioridade";
import { obterCentralInteligente } from "@/lib/central-inteligente";
import AtualizarCentralBotao from "./AtualizarCentralBotao";
import { IconCentral } from "@/components/icons";

function formatarQuando(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (dias <= 0) return "gerado hoje";
  if (dias === 1) return "gerado ontem";
  return `gerado há ${dias} dias`;
}

export default async function CentralInteligentePage() {
  const ctx = await contextoDashboard();
  if (ctx.sessao.cargo === "secretario") {
    return (
      <div className="max-w-lg">
        <p className="text-sm text-muted">Disponível só para o prefeito e administradores.</p>
      </div>
    );
  }
  if (!ctx.temPlano("gestao")) return <BloqueioPlano plano="gestao" />;

  const resultado = await obterCentralInteligente(ctx.sessao.prefeituraId);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className="arco-badge w-9 h-9 text-white flex items-center justify-center shrink-0"
              style={{ background: "var(--gradient-hero)" }}
            >
              <IconCentral className="w-4.5 h-4.5" />
            </div>
            <h1 className="font-serif text-2xl font-bold">Central Inteligente</h1>
          </div>
          <p className="text-muted text-sm mt-2 max-w-xl">
            Cruza todas as secretarias contratadas automaticamente, todo dia — sem
            precisar clicar em nada. Combina regras automáticas (sempre confiáveis,
            sem custo de IA) com a análise da IA procurando conexões entre módulos.
          </p>
        </div>
        <Link
          href="/dashboard/alertas"
          className="text-xs font-semibold text-brand hover:underline shrink-0"
        >
          Ver Alertas →
        </Link>
      </div>

      {!resultado.ok ? (
        <p className="text-sm rounded-lg px-3 py-2 border" style={{ color: "var(--urgente)", background: "var(--urgente-tint)", borderColor: "var(--urgente-borda)" }}>
          {resultado.erro}
        </p>
      ) : (
        <>
          <div className="bg-card border border-border arco-card p-5 shadow-elevated">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Resumo geral · {formatarQuando(resultado.central.geradoEm)}
                {resultado.deCache ? " (em cache)" : ""}
              </p>
              <AtualizarCentralBotao />
            </div>
            <p className="text-sm leading-relaxed">{resultado.central.resumo}</p>
          </div>

          {resultado.central.itens.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border arco-card">
              <p className="text-sm text-muted">
                Nenhum ponto crítico detectado nos dados registrados até agora.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {resultado.central.itens.map((item, i) => (
                <div
                  key={i}
                  className="card-interactive bg-card border border-border arco-card-sm p-4"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <p className="font-semibold text-sm">{item.titulo}</p>
                    <BadgePrioridade prioridade={item.prioridade} />
                  </div>
                  <p className="text-sm text-muted mt-1.5 leading-relaxed">{item.texto}</p>
                  <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                    {item.modulos.map((m) => (
                      <span
                        key={m}
                        className="text-[10px] font-semibold uppercase tracking-wide text-muted bg-sutil rounded-full px-2 py-0.5"
                      >
                        {m}
                      </span>
                    ))}
                    {item.automatico && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-legivel bg-brand-tint rounded-full px-2 py-0.5">
                        Regra automática
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
