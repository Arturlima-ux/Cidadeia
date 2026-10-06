import Link from "next/link";
import { resumirVoz } from "@/lib/voz-da-cidade";
import { instante, mensagensDeExemplo } from "@/lib/portal-exemplo";
import { Anel, Barra, Contador, Surgir } from "@/components/portal/Vivo";
import { COR_TIPO, Faixa, OBRA, TIPO_CURTO } from "@/app/transparencia/PortalCidade";

// ── O PORTAL, VIVO, DENTRO DA HOME ──
//
// No lugar de uma lista dizendo o que o portal tem, o próprio portal: uma
// janela de navegador com a cidade de exemplo (Bela Aurora) funcionando —
// os números contam, a faixa de mensagens corre, as barras e os anéis
// enchem. Clicar abre o portal inteiro em /transparencia/exemplo.
//
// Os dados são os mesmos do portal de exemplo (lib/portal-exemplo.ts), e a
// janela diz no rodapé que é cidade fictícia.

const RECEITA = 62_400_000;
const GASTO = 51_150_000;

export default function VitrinePortal() {
  const voz = resumirVoz(mensagensDeExemplo(instante()));
  if (!voz.publica) return null;
  const deCem = Math.round((GASTO / RECEITA) * 100);

  return (
    <Surgir className="max-w-[920px] mx-auto">
      <div
        className="rounded-[22px] border border-border overflow-hidden"
        style={{ background: "var(--superficie)", boxShadow: "0 40px 120px -40px color-mix(in oklab, var(--brand) 55%, transparent)" }}
      >
        {/* barra do navegador */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border" style={{ background: "var(--card)" }}>
          <div className="flex gap-1.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--sutil)" }} />
            ))}
          </div>
          <div className="flex-1 min-w-0 flex justify-center">
            <span className="max-w-full truncate rounded-full px-4 py-1 text-xs text-muted" style={{ background: "var(--sutil)" }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle portal-pulso" style={{ background: "var(--info)" }} />
              cidadeia.vercel.app/transparencia/bela-aurora
            </span>
          </div>
          <Link href="/transparencia/exemplo" className="hidden sm:inline text-xs font-medium hover:underline" style={{ color: "var(--brand-claro)" }}>
            Abrir inteiro
          </Link>
        </div>

        <div className="p-4 sm:p-6 grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-5 lg:gap-6">
          {/* a voz da cidade */}
          <div className="min-w-0">
            <p className="text-sm text-muted">Prefeitura Municipal · Bela Aurora</p>
            <p className="text-xl sm:text-2xl font-semibold tracking-[-0.035em] leading-tight mt-1.5">
              A cidade fala. <span style={{ color: "var(--brand-claro)" }}>A prefeitura responde.</span>
            </p>
            <div className="grid grid-cols-4 gap-2 mt-4">
              {[
                { n: <Contador valor={voz.total} />, r: "mensagens", cor: "var(--foreground)" },
                { n: <><Contador valor={voz.percentualRespondido} />%</>, r: "respondidas", cor: "var(--info)" },
                { n: voz.diasMedioResposta === null ? "—" : <Contador valor={voz.diasMedioResposta} formato="decimal" />, r: "dias para responder", cor: "var(--brand-claro)" },
                { n: <Contador valor={voz.elogios} />, r: "elogios", cor: "var(--medio)" },
              ].map((c) => (
                <div key={c.r} className="rounded-xl border border-border p-2.5 sm:p-3" style={{ background: "var(--card)" }}>
                  <p className="text-xl sm:text-2xl font-semibold tracking-[-0.05em]" style={{ color: c.cor }}>
                    {c.n}
                  </p>
                  <p className="text-[11px] text-muted mt-0.5 leading-tight">{c.r}</p>
                </div>
              ))}
            </div>
            <div className="flex h-2 rounded-full overflow-hidden gap-[3px] mt-4" aria-hidden>
              {voz.porTipo.map((t) => (
                <div key={t.tipo} style={{ flexGrow: t.quantidade, background: COR_TIPO[t.tipo] }} />
              ))}
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs text-muted">
              {voz.porTipo.slice(0, 4).map((t) => (
                <li key={t.tipo} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: COR_TIPO[t.tipo] }} />
                  {TIPO_CURTO[t.tipo]}
                </li>
              ))}
            </ul>
            <div className="mt-4 -mx-4 sm:-mx-6 lg:mx-0">
              <Faixa itens={voz.faixa.slice(0, 8)} sentido="ida" duracao={45} compacta />
            </div>
          </div>

          {/* o dinheiro e as obras */}
          <div className="min-w-0 space-y-2.5">
            <div className="rounded-xl border border-border p-4" style={{ background: "var(--card)" }}>
              <p className="text-base font-semibold tracking-[-0.02em] leading-snug">
                De cada <span style={{ color: "var(--brand-claro)" }}>R$ 100</span> que entraram,{" "}
                <span style={{ color: "var(--brand-claro)" }}>R$ {deCem}</span> já foram gastos.
              </p>
              <div className="space-y-2.5 mt-3">
                <div>
                  <p className="flex justify-between text-xs text-muted mb-1.5">
                    <span>Entrou</span>
                    <Contador valor={RECEITA} formato="moeda" />
                  </p>
                  <Barra pct={100} cor="var(--info)" altura={8} />
                </div>
                <div>
                  <p className="flex justify-between text-xs text-muted mb-1.5">
                    <span>Já foi gasto</span>
                    <Contador valor={GASTO} formato="moeda" />
                  </p>
                  <Barra pct={(GASTO / RECEITA) * 100} cor="var(--brand)" altura={8} atraso={0.15} />
                </div>
              </div>
            </div>
            {[
              { nome: "Reforma da UBS do Centro", pct: 72, st: OBRA.em_andamento },
              { nome: "Pavimentação da Rua das Flores", pct: 100, st: OBRA.concluida },
            ].map((o, i) => (
              <div key={o.nome} className="rounded-xl border border-border px-3.5 py-3 flex items-center gap-3" style={{ background: "var(--card)" }}>
                <Anel pct={o.pct} cor={o.st.cor} tamanho={42} atraso={0.1 * i}>
                  <span className="text-[10px] font-semibold tabular-nums">{o.pct}%</span>
                </Anel>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold" style={{ color: o.st.cor }}>
                    {o.st.rotulo}
                  </p>
                  <p className="text-sm font-medium truncate">{o.nome}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-border text-xs text-muted">
          <span>Bela Aurora é uma cidade fictícia, com dados de exemplo.</span>
          <Link href="/transparencia/exemplo" className="font-semibold hover:underline" style={{ color: "var(--brand-claro)" }}>
            Abrir o portal de exemplo →
          </Link>
        </div>
      </div>
    </Surgir>
  );
}
