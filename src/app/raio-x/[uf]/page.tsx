import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import Olho from "@/components/site/Olho";
import { ESTADOS, NOME_DOS_ESTADOS, doEstado, type Estado } from "@/lib/estados";
import { retratoDaUf } from "@/lib/raio-x-uf";
import { compartilhamento } from "@/lib/seo";
import { caminhoDoRaioX } from "@/lib/slug-municipio";
import { ANO_ESTIMATIVA_POPULACAO } from "@/lib/municipios";
import { LIMITE_DISPENSA } from "@/lib/contratacao";

// ── UMA PÁGINA POR ESTADO ──
//
// /raio-x/pi: os 224 municípios do Piauí, do maior para o menor, com a
// faixa de habitantes de cada um e o link para o seu Raio-X. É o nível
// entre o índice e as 5.571 páginas: quem pesquisa "prefeituras do Piauí"
// ou "municípios do Piauí população" chega aqui; o Google segue os links
// e descobre as páginas de município sem depender só do sitemap.
//
// Estática de verdade: não consulta o Tesouro (seriam centenas de chamadas
// por visita). Tudo vem da tabela local do IBGE. Os números do SICONFI
// estão na página de cada município — e a página diz isso.

export const dynamicParams = false;

export function generateStaticParams() {
  return ESTADOS.map((uf) => ({ uf: uf.toLowerCase() }));
}

function acharUf(uf: string): Estado | null {
  const sigla = uf.toUpperCase();
  return (ESTADOS as readonly string[]).includes(sigla) ? (sigla as Estado) : null;
}

const n = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

export async function generateMetadata({ params }: { params: Promise<{ uf: string }> }) {
  const uf = acharUf((await params).uf);
  if (!uf) return { title: "Estado não encontrado — CidadeIA" };
  const r = retratoDaUf(uf);
  return compartilhamento({
    titulo: `Raio-X das ${r.total} prefeituras ${doEstado(uf)} — população, faixa e o que consta no Tesouro`,
    descricao: `Os ${r.total} municípios ${doEstado(uf)} (${n(r.populacao)} habitantes pela estimativa do IBGE), do maior para o menor, com a faixa de habitantes de cada um e o Raio-X do que a prefeitura publicou no Tesouro Nacional. Dado público, sem cadastro.`,
    caminho: `/raio-x/${uf.toLowerCase()}`,
  });
}

export default async function RaioXUfPage({ params }: { params: Promise<{ uf: string }> }) {
  const uf = acharUf((await params).uf);
  if (!uf) notFound();
  const r = retratoDaUf(uf);
  const nome = NOME_DOS_ESTADOS[uf];
  const pct = r.total ? Math.round((r.cabemNaDispensa / r.total) * 100) : 0;
  const outros = ESTADOS.filter((e) => e !== uf);

  return (
    <div className="tema-noite min-h-screen">
      <SiteHeader />
      <main>
        <section className="max-w-4xl mx-auto px-4 sm:px-8 pt-14 sm:pt-20 pb-10">
          <Reveal>
            <Olho>Raio-X · {nome}</Olho>
            <h1 className="font-serif text-[2.2rem] leading-[1.02] sm:text-[3rem] font-extrabold tracking-[-0.04em] mt-5">
              As {r.total} prefeituras {doEstado(uf)}
            </h1>
            <p className="text-muted text-base sm:text-lg leading-relaxed mt-5 max-w-[58ch]">
              {n(r.populacao)} habitantes pela estimativa do IBGE de {ANO_ESTIMATIVA_POPULACAO}. Cada
              município abaixo tem a sua página: o que a própria prefeitura publicou no Tesouro
              Nacional — receita, saúde, educação e quais relatórios obrigatórios constam. Nada aqui
              foi digitado por ninguém.
            </p>
          </Reveal>
        </section>

        {/* ── o retrato em números ── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-8 pb-12">
          <Reveal delay={80}>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border p-5" style={{ background: "var(--card)" }}>
                <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted">Municípios</p>
                <p className="font-serif text-3xl font-extrabold mt-2">{r.total}</p>
              </div>
              <div className="rounded-2xl border border-border p-5" style={{ background: "var(--card)" }}>
                <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted">Até 100 mil habitantes</p>
                <p className="font-serif text-3xl font-extrabold mt-2">
                  {r.cabemNaDispensa} <span className="text-base font-normal text-muted">({pct}%)</span>
                </p>
                <p className="text-xs text-muted mt-1.5 leading-relaxed">
                  Faixas em que a contratação cabe na dispensa de licitação (art. 75, II, Lei 14.133 —
                  até R$ {n(LIMITE_DISPENSA.valor)} por ano).
                </p>
              </div>
              <div className="rounded-2xl border border-border p-5" style={{ background: "var(--card)" }}>
                <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted">Por faixa</p>
                <ul className="mt-2 flex flex-col gap-1">
                  {r.porFaixa.filter((f) => f.quantidade > 0).map((f) => (
                    <li key={f.chave} className="flex justify-between text-sm">
                      <span className="text-muted">{f.rotulo}</span>
                      <span className="font-semibold tabular-nums">{f.quantidade}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── a lista ── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-8 pb-12">
          <Reveal delay={120}>
            <h2 className="font-serif text-xl font-bold">Do maior para o menor</h2>
            <p className="text-sm text-muted mt-2 leading-relaxed max-w-[62ch]">
              Clique no município para ver o Raio-X dele: os números do Tesouro são consultados na
              hora e ficam guardados por uma semana.
            </p>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border" style={{ background: "var(--card)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-mono uppercase tracking-[0.12em] text-muted border-b border-border">
                    <th className="px-4 py-3 font-medium w-10">#</th>
                    <th className="px-4 py-3 font-medium">Município</th>
                    <th className="px-4 py-3 font-medium text-right">Habitantes</th>
                    <th className="px-4 py-3 font-medium hidden sm:table-cell">Faixa</th>
                  </tr>
                </thead>
                <tbody>
                  {r.municipios.map((m, i) => (
                    <tr key={m.codigo} className="border-b border-border last:border-0 hover:bg-white/[0.03] transition">
                      <td className="px-4 py-2.5 text-muted tabular-nums">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <Link href={caminhoDoRaioX({ uf, nome: m.nome })} className="font-semibold hover:text-brand-claro transition">
                          {m.nome}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{n(m.populacao)}</td>
                      <td className="px-4 py-2.5 text-muted hidden sm:table-cell">
                        {r.porFaixa.find((f) => f.chave === m.porte)?.rotulo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        {/* ── o que não aparece em base pública ── */}
        <section className="border-y border-border" style={{ background: "var(--superficie)" }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12">
            <Reveal>
              <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
                <div>
                  <h2 className="font-serif text-xl font-bold">O que não aparece em base pública</h2>
                  <p className="text-sm text-muted mt-2 leading-relaxed max-w-[60ch]">
                    Obra parada, prazo de ouvidoria vencendo, dispensa virando fracionamento,
                    indicador de saúde sem atualização — é o que o CidadeIA acompanha por dentro
                    de cada prefeitura, com número, artigo da lei e a tela onde se resolve.
                  </p>
                </div>
                <Link
                  href="/demo"
                  className="bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-6 py-3.5 transition shadow-elevated text-center shrink-0"
                >
                  Ver o painel funcionando&nbsp;&nbsp;→
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-4 sm:px-8 py-12">
          <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted mb-4">Outros estados</p>
          <div className="flex flex-wrap gap-2">
            {outros.map((e) => (
              <Link
                key={e}
                href={`/raio-x/${e.toLowerCase()}`}
                className="text-sm font-semibold rounded-full border border-border px-3.5 py-1.5 hover:border-brand hover:text-brand-claro transition"
              >
                {e}
              </Link>
            ))}
          </div>
          <p className="text-xs text-muted mt-6 leading-relaxed max-w-[62ch]">
            Fonte: estimativa de população do IBGE ({ANO_ESTIMATIVA_POPULACAO}). Os números fiscais
            de cada município vêm da API pública do SICONFI, Tesouro Nacional, e estão na página
            de cada um.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
