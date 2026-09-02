import { IconVisaoGeral, IconSaude, IconObras, IconLicitacoes } from "@/components/icons";

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

// Os quatro achados correspondem, um a um, às regras que rodam de verdade em
// lib/deteccao-automatica.ts e alimentam a Central Inteligente: licitação com
// prazo vencido, obra sem atualização, indicador parado e saldo negativo.
//
// O mínimo constitucional e o prazo de resposta ao cidadão passaram a entrar
// na Central junto com essas quatro (ver escopoVisivel em lib/ia.ts) — o
// desenho aqui mostra uma amostra, não a lista exaustiva.
//
// A conferência no PNCP continua fora, e de propósito: depende de rede contra
// um serviço que limita requisição, e a Central carrega a cada abertura de
// tela. Fica sob demanda, na tela de Licitações.
const ALERTAS = [
  {
    icone: IconLicitacoes,
    titulo: "Licitação PE 014/2026 com prazo vencido",
    detalhe: "Merenda escolar — o prazo passou há 2 dias e o processo segue aberto",
    tom: "urgente" as const,
  },
  {
    icone: IconVisaoGeral,
    titulo: "Saldo negativo no último registro",
    detalhe: "R$ 84 mil negativos no fechamento mais recente",
    tom: "urgente" as const,
  },
  {
    icone: IconObras,
    titulo: "Obra “Reforma da UBS Central” sem atualização há 41 dias",
    detalhe: "20% executado, esperado 65%",
    tom: "medio" as const,
  },
  {
    icone: IconSaude,
    titulo: "Indicador de Saúde parado há 34 dias",
    detalhe: "Tempo de atendimento e estoque de medicamentos sem novo lançamento",
    tom: "medio" as const,
  },
];

// O menu é o do sistema de verdade, com os mesmos rótulos e os mesmos grupos
// de src/app/dashboard/layout.tsx. Um menu inventado tornaria a peça um
// desenho bonito que não corresponde a nada — e a primeira demonstração ao
// vivo desmentiria a página.
//
// Só as Secretarias aparecem resumidas: as quatro cabem em "Saúde, Educação,
// Obras, Licitações" sem que o desenho vire uma lista de vinte linhas.
const MENU: { grupo: string; itens: { nome: string; ativo?: boolean }[] }[] = [
  {
    grupo: "Principal",
    itens: [
      { nome: "Visão Geral" },
      { nome: "IA Central" },
      { nome: "Publicações do portal" },
      { nome: "Atendimento" },
    ],
  },
  {
    grupo: "Secretarias",
    itens: [{ nome: "Saúde" }, { nome: "Educação" }, { nome: "Obras" }, { nome: "Licitações" }],
  },
  {
    grupo: "Gestão",
    itens: [
      { nome: "Central Inteligente", ativo: true },
      { nome: "Mínimos constitucionais" },
      { nome: "Mapa da cidade" },
      { nome: "Modo apresentação" },
    ],
  },
];

export default function PainelDemonstracao() {
  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-[var(--shadow-lg)]">
      {/* Barra de janela desenhada: dá o contexto de "isto é a tela de um
          sistema" sem depender de captura de imagem.

          As três bolinhas imitam os controles de janela do macOS — fechar,
          minimizar, maximizar. São convenção de ilustração, não parte do
          produto: o painel real não as tem, porque quem desenha controle de
          janela é o sistema operacional, nunca a página. No Windows eles nem
          ficam à esquerda, e sim à direita. */}
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
          cidadeia.app / central inteligente
        </span>
      </div>

      <div className="grid sm:grid-cols-[168px_1fr]" style={{ background: "var(--card)" }}>
        {/* menu lateral */}
        <div
          className="hidden sm:flex flex-col gap-3 p-3 border-r border-border"
          style={{ background: "var(--superficie)" }}
        >
          {MENU.map((g) => (
            <div key={g.grupo} className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted px-2.5 pb-1">
                {g.grupo}
              </span>
              {g.itens.map((m) => (
                <span
                  key={m.nome}
                  className="text-[11px] rounded-lg px-2.5 py-1.5 leading-tight"
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
