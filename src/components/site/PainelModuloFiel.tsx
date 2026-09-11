import Aviso from "@/components/Aviso";
import PilulaStatus from "@/components/PilulaStatus";
import { IconIA } from "@/components/icons";
import type { PainelModulo } from "@/lib/paineis-modulos";

// ── O MOCKUP É A TELA REAL EM MINIATURA ──
//
// Reaproveita os componentes do painel (Aviso, PilulaStatus) e copia a
// marcação dos que não dava para importar (o cartão de indicador e a caixa
// de Insight são funções locais das páginas). Vive dentro de `tema-noite`
// para usar exatamente os tokens de cor do painel — não uma paleta de
// marketing parecida.
//
// Nada aqui é interativo: é um retrato. Por isso "Atualizar" e "Baixar
// relatório" aparecem como texto, não como botão que não faz nada.

const TOM_CONTADOR = {
  urgente: "var(--urgente)",
  medio: "var(--medio)",
  neutro: "var(--muted)",
} as const;

export default function PainelModuloFiel({ painel }: { painel: PainelModulo }) {
  return (
    <div className="tema-noite rounded-2xl border border-border overflow-hidden shadow-elevated">
      {/* Barra do "navegador": três pontos e o caminho real da tela. */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="w-2.5 h-2.5 rounded-full bg-sutil" />
          <span className="w-2.5 h-2.5 rounded-full bg-sutil" />
          <span className="w-2.5 h-2.5 rounded-full bg-sutil" />
        </span>
        <span className="mx-auto text-[11px] font-mono text-muted bg-sutil rounded-md px-3 py-1">
          {painel.caminho}
        </span>
      </div>

      <div className="bg-background p-5 sm:p-6 space-y-5 text-left">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Prefeitura Modelo
            </p>
            <h3 className="font-serif text-xl font-bold mt-0.5">{painel.titulo}</h3>
          </div>
          <span className="text-xs text-muted font-mono">Atualizado agora</span>
        </div>

        {painel.insight && (
          <div className="rounded-xl border border-brand/20 bg-brand-tint/50 p-4 flex gap-3 items-start">
            <span
              className="w-8 h-8 rounded-lg text-white flex items-center justify-center shrink-0"
              style={{ background: "var(--brand)" }}
            >
              <IconIA className="w-4 h-4" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-legivel">
                  Insight da IA
                </p>
                <span className="text-[11px] font-semibold text-brand">Atualizar</span>
              </div>
              <p className="text-sm leading-relaxed mt-1.5">{painel.insight}</p>
            </div>
          </div>
        )}

        {painel.cartoes && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2.5">
              Indicadores
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {painel.cartoes.map((c) => (
                <div key={c.label} className="bg-card border border-border rounded-xl p-4">
                  <p className="text-2xl font-serif font-bold">{c.valor}</p>
                  <p className="text-xs text-muted mt-1">{c.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {painel.prazos && (
          <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-serif text-base font-bold">Prazo de resposta</p>
              <p className="text-xs text-muted mt-1 leading-relaxed max-w-xs">
                Pedido de informação tem 20 dias pela Lei de Acesso; as demais
                manifestações, 30 dias pela Lei 13.460.
              </p>
            </div>
            <div className="flex gap-5 text-center shrink-0">
              {painel.prazos.map((c) => (
                <div key={c.rotulo}>
                  <p
                    className="text-2xl font-serif font-bold tabular-nums"
                    style={{ color: TOM_CONTADOR[c.tom] }}
                  >
                    {c.n}
                  </p>
                  <p className="text-[11px] text-muted">{c.rotulo}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {painel.aviso && (
          <Aviso nivel={painel.aviso.nivel} titulo={painel.aviso.titulo} itens={painel.aviso.itens} />
        )}

        {painel.lista && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2.5">
              {painel.lista.cabecalho}
            </p>
            <div className="space-y-2">
              {painel.lista.itens.map((item) => (
                <div
                  key={item.nome}
                  className="bg-card border border-border rounded-xl px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{item.nome}</p>
                      {item.sub && <p className="text-xs text-muted truncate">{item.sub}</p>}
                    </div>
                    {item.pilula && <PilulaStatus label={item.pilula.label} tom={item.pilula.tom} />}
                  </div>
                  {item.progresso && (
                    <>
                      <div className="w-full h-2 bg-sutil rounded-full overflow-hidden mt-2.5">
                        <div
                          className="h-full bg-brand rounded-full"
                          style={{ width: `${item.progresso.atual}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted mt-1.5">
                        {item.progresso.atual}% concluído (esperado: {item.progresso.esperado}%)
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
