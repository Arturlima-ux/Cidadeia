import { IconVisaoGeral, IconSaude, IconObras, IconLicitacoes, IconAlertas } from "@/components/icons";

// ── O PRODUTO, VISÍVEL ──
//
// A home explicava o CidadeIA inteiro por texto. Quem chegava sem saber o que
// é — um vereador, um assessor, alguém que não é o jurídico — lia sobre
// conformidade, preço e base legal sem nunca ver a tela que está comprando.
//
// Isto não é imagem nem captura: é o próprio painel desenhado em HTML, com a
// mesma tipografia e os mesmos tokens de cor do produto. Custa quase nada para
// carregar e nunca fica desatualizado em relação ao sistema real.
//
// ── OS NÚMEROS SÃO DE EXEMPLO, E ISSO ESTÁ ESCRITO ──
//
// Um painel de demonstração com números plausíveis e sem aviso é indistinguível
// de um caso real, e a página inteira se apoia em não fingir. O rótulo fica
// visível, não escondido no rodapé.

const ALERTAS = [
  {
    icone: IconSaude,
    titulo: "Mínimo em saúde: 13,8%",
    detalhe: "Faltam R$ 214 mil até dezembro · exige 1,4× o ritmo mensal",
    tom: "urgente" as const,
  },
  {
    icone: IconLicitacoes,
    titulo: "PE 014/2026 não consta no PNCP",
    detalhe: "Sem divulgação o contrato não produz efeito · art. 94",
    tom: "urgente" as const,
  },
  {
    icone: IconObras,
    titulo: "Reforma da UBS Central parada há 41 dias",
    detalhe: "20% executado, esperado 65%",
    tom: "medio" as const,
  },
  {
    icone: IconAlertas,
    titulo: "Pedido de informação vence em 3 dias",
    detalhe: "Protocolo 202603-K7F2M · prazo da LAI, art. 11",
    tom: "medio" as const,
  },
];

const MENU = [
  { nome: "Visão geral", ativo: true },
  { nome: "Publicações do portal", ativo: false },
  { nome: "Atendimento", ativo: false },
  { nome: "Mínimos constitucionais", ativo: false },
  { nome: "Mapa da cidade", ativo: false },
  { nome: "Licitações", ativo: false },
];

export default function PainelDemonstracao() {
  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-[var(--shadow-lg)]">
      {/* Barra de janela: dá contexto de "isto é uma tela de sistema" sem
          precisar de captura de imagem. */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b border-border"
        style={{ background: "var(--superficie)" }}
      >
        <span className="flex gap-1.5" aria-hidden>
          {["#ff6b6b", "#ffcc5c", "#5fcf80"].map((c) => (
            <span key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: 0.5 }} />
          ))}
        </span>
        <span className="text-[11px] font-mono text-muted ml-2 truncate">
          cidadeia.app / painel do prefeito
        </span>
      </div>

      <div className="grid sm:grid-cols-[168px_1fr]" style={{ background: "var(--card)" }}>
        {/* menu lateral */}
        <div
          className="hidden sm:flex flex-col gap-0.5 p-3 border-r border-border"
          style={{ background: "var(--superficie)" }}
        >
          {MENU.map((m) => (
            <span
              key={m.nome}
              className="text-[11px] rounded-lg px-2.5 py-2 leading-tight"
              style={{
                background: m.ativo ? "var(--brand-tint)" : "transparent",
                color: m.ativo ? "var(--brand-claro)" : "var(--muted)",
                fontWeight: m.ativo ? 600 : 400,
              }}
            >
              {m.nome}
            </span>
          ))}
        </div>

        {/* conteúdo */}
        <div className="p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <p className="font-serif font-bold text-sm sm:text-base">O que precisa da sua atenção</p>
            <span className="text-[11px] font-mono text-muted shrink-0">4 itens</span>
          </div>

          <div className="flex flex-col gap-2">
            {ALERTAS.map((a) => {
              const cor = a.tom === "urgente" ? "var(--urgente)" : "var(--medio)";
              const fundo = a.tom === "urgente" ? "var(--urgente-tint)" : "var(--medio-tint)";
              const borda = a.tom === "urgente" ? "var(--urgente-borda)" : "var(--medio-borda)";
              const Icone = a.icone;

              return (
                <div
                  key={a.titulo}
                  className="flex gap-3 rounded-lg border px-3 py-2.5"
                  style={{ background: fundo, borderColor: borda }}
                >
                  <Icone className="w-4 h-4 shrink-0 mt-0.5" style={{ color: cor }} />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-[13px] font-semibold leading-snug">{a.titulo}</p>
                    <p className="text-[11px] sm:text-xs text-muted mt-0.5 leading-snug">
                      {a.detalhe}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
            <IconVisaoGeral className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--muted)" }} />
            <p className="text-[11px] text-muted leading-snug">
              Cada linha aponta para a tela onde se resolve — nenhuma exige
              procurar o dado em outro sistema.
            </p>
          </div>
        </div>
      </div>

      <p
        className="text-[11px] px-4 py-2.5 border-t border-border text-muted"
        style={{ background: "var(--superficie)" }}
      >
        Números de exemplo. O painel real usa os dados do seu município.
      </p>
    </div>
  );
}
