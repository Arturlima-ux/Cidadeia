import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import {
  DOCUMENTOS,
  CAMPOS_A_PREENCHER,
  marcadoresDe,
  type Bloco,
} from "@/lib/kit-contratacao";
import { IconDownload, IconCheck, IconAlertas } from "@/components/icons";

export const metadata = {
  title: "Kit de contratação — CidadeIA",
  description:
    "Termo de referência, minuta de contrato, acordo de tratamento de dados e acordo de nível de serviço, prontos para instruir o processo.",
};

function RenderBloco({ bloco }: { bloco: Bloco }) {
  if (bloco.tipo === "paragrafo") {
    return <p className="text-sm text-muted leading-relaxed">{bloco.texto}</p>;
  }
  if (bloco.tipo === "lista") {
    return (
      <ul className="space-y-2">
        {bloco.itens.map((item, i) => (
          <li key={i} className="text-sm text-muted leading-relaxed flex gap-2.5">
            <span className="text-brand shrink-0 mt-0.5">·</span>
            {item}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="overflow-x-auto border border-border rounded-xl">
      <table className="min-w-full text-sm">
        <thead>
          <tr style={{ background: "var(--superficie)" }}>
            {bloco.cabecalho.map((c) => (
              <th key={c} className="text-left font-semibold px-4 py-2.5 border-b border-border whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bloco.linhas.map((linha, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {linha.map((celula, j) => (
                <td key={j} className="px-4 py-2.5 text-muted leading-relaxed align-top">
                  {celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function KitPage() {
  const geramos = DOCUMENTOS.filter((d) => d.geramos);
  const naoGeramos = DOCUMENTOS.filter((d) => !d.geramos);

  const pendentes = CAMPOS_A_PREENCHER.filter((campo) =>
    geramos.some((d) => marcadoresDe(d).includes(campo.marcador))
  );

  return (
    <div className="tema-noite min-h-screen">
      <SiteHeader />

      {/* ── capa ── */}
      <section className="text-white" style={{ background: "var(--gradient-hero)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-14 sm:py-16">
          <Reveal>
            <span className="inline-block text-xs font-bold uppercase tracking-[0.1em] rounded-full px-4 py-1.5 border border-white/25 bg-white/10">
              Kit de contratação
            </span>
            <h1 className="font-serif text-[2.2rem] sm:text-5xl font-extrabold tracking-[-0.035em] leading-[1.08] mt-5">
              O processo montado, para o jurídico só conferir
            </h1>
            <p className="text-white/80 text-base sm:text-lg leading-relaxed mt-4 max-w-2xl">
              Baixe, leve para a reunião e volte se fizer sentido. Nenhum
              documento pede cadastro.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── aviso jurídico, antes de qualquer download ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-8 -mt-8">
        <Reveal>
          <div
            className="rounded-2xl border p-5 flex gap-4 shadow-[var(--shadow-md)]"
            style={{ borderColor: "var(--medio-borda)", background: "var(--medio-tint)" }}
          >
            <IconAlertas className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--medio)" }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--medio)" }}>
                São modelos, não peças prontas para assinar
              </p>
              <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "var(--medio)" }}>
                Servem para a prefeitura não redigir do zero. A assessoria
                jurídica do município precisa revisar e adaptar às normas locais
                e à legislação vigente na data da contratação. Onde há{" "}
                <code className="font-mono text-xs">[COLCHETES]</code>, falta
                preencher.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── índice ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-8 pt-12">
        <div className="grid sm:grid-cols-2 gap-3">
          {geramos.map((d, i) => (
            <Reveal key={d.chave} delay={i * 60}>
              <div className="h-full bg-card border border-border rounded-2xl p-5 flex flex-col gap-2.5 card-interactive">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-serif text-lg font-bold">{d.nome}</h2>
                  <span
                    className="shrink-0 text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1"
                    style={{ color: "var(--accent)", background: "var(--accent-tint)" }}
                  >
                    Modelo
                  </span>
                </div>
                <p className="text-sm text-muted leading-relaxed flex-1">{d.resumo}</p>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <a
                    href={`/api/kit/${d.chave}`}
                    className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-white rounded-full px-4 py-2 text-xs font-bold transition"
                  >
                    <IconDownload className="w-3.5 h-3.5" />
                    Word
                  </a>
                  <a
                    href={`/api/kit/${d.chave}?formato=txt`}
                    className="inline-flex items-center gap-1.5 border border-border rounded-full px-4 py-2 text-xs font-semibold hover:border-brand hover:text-brand transition"
                  >
                    Texto
                  </a>
                  <a
                    href={`#${d.chave}`}
                    className="text-xs font-semibold text-brand hover:underline ml-auto"
                  >
                    Ler aqui ↓
                  </a>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* o que não geramos */}
        <Reveal>
          <div className="mt-6 border border-dashed border-border rounded-2xl p-5">
            <h2 className="font-semibold text-sm mb-1">O que não sai daqui</h2>
            <p className="text-xs text-muted leading-relaxed mb-4">
              Nenhum sistema emite estes documentos. Estão listados abaixo com a
              origem, porque descobrir isso tarde atrasa o processo.
            </p>
            <div className="space-y-3">
              {naoGeramos.map((d) => (
                <div key={d.chave}>
                  <p className="font-medium text-sm">
                    {d.nome}{" "}
                    <a href={`#${d.chave}`} className="text-xs font-semibold text-brand hover:underline ml-1">
                      ver a lista ↓
                    </a>
                  </p>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{d.origem}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* pendências de preenchimento */}
        {pendentes.length > 0 && (
          <Reveal>
            <div className="mt-6 bg-card border border-border rounded-2xl p-5">
              <h2 className="font-semibold text-sm mb-1">
                Campos a preencher antes de enviar ({pendentes.length})
              </h2>
              <p className="text-xs text-muted leading-relaxed mb-4">
                Aparecem entre colchetes nos modelos. Enquanto estiverem em
                branco, o processo volta da prefeitura.
              </p>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                {pendentes.map((c) => (
                  <li key={c.marcador} className="text-xs leading-relaxed">
                    <code className="font-mono" style={{ color: "var(--medio)" }}>
                      {c.marcador}
                    </code>{" "}
                    <span className="text-muted">— {c.descricao}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        )}
      </section>

      {/* ── documentos na íntegra ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-8 py-16 space-y-16">
        {DOCUMENTOS.map((d) => (
          <article key={d.chave} id={d.chave} className="scroll-mt-28">
            <Reveal>
              <div className="border-t-2 border-brand pt-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-[-0.03em]">
                      {d.nome}
                    </h2>
                    <p className="text-sm text-muted mt-1.5">{d.subtitulo}</p>
                  </div>
                  {d.geramos ? (
                    <a
                      href={`/api/kit/${d.chave}`}
                      className="shrink-0 inline-flex items-center gap-2 border border-border rounded-full px-4 py-2 text-xs font-bold hover:border-brand hover:text-brand transition"
                    >
                      <IconDownload className="w-3.5 h-3.5" />
                      Baixar em Word
                    </a>
                  ) : (
                    <span className="shrink-0 text-xs text-muted max-w-xs text-right leading-relaxed">
                      Documento emitido por terceiro — não geramos aqui.
                    </span>
                  )}
                </div>

                <div className="mt-8 space-y-8">
                  {d.clausulas.map((clausula) => (
                    <div key={clausula.titulo}>
                      <h3 className="font-semibold mb-3">{clausula.titulo}</h3>
                      <div className="space-y-3">
                        {clausula.blocos.map((bloco, i) => (
                          <RenderBloco key={i} bloco={bloco} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </article>
        ))}
      </section>

      {/* ── fecho ── */}
      <section className="border-t border-border" style={{ background: "var(--superficie)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-14 text-center">
          <Reveal>
            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-[-0.03em]">
              Falta o valor para fechar o processo
            </h2>
            <p className="text-muted mt-3 leading-relaxed max-w-xl mx-auto">
              Monte a proposta com os módulos que a prefeitura vai usar e veja se
              o total anual cabe na dispensa de licitação.
            </p>
            <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
              <Link
                href="/#proposta"
                className="bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-6 py-3.5 transition shadow-elevated inline-flex items-center gap-2"
              >
                <IconCheck className="w-4 h-4" />
                Montar a proposta
              </Link>
              <Link
                href="/suporte?assunto=kit"
                className="border-[1.5px] border-border bg-card font-semibold text-sm rounded-xl px-5 py-3.5 hover:border-brand hover:text-brand transition"
              >
                Falar com a gente
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
