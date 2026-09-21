import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import Olho from "@/components/site/Olho";
import RaioXResultado from "@/components/site/RaioXResultado";
import CapturaLeadRaioX from "@/components/site/CapturaLeadRaioX";
import { municipioPorSlug, caminhoDoRaioX } from "@/lib/slug-municipio";
import { municipiosDaUf } from "@/lib/municipios";
import { montarRaioX } from "@/lib/raio-x";
import { porteDaPopulacao, PORTES } from "@/lib/precos";
import { ESTADOS, doEstado, type Estado } from "@/lib/estados";
import { compartilhamento, JsonLdScript, ldBreadcrumb, ldPrefeitura } from "@/lib/seo";
import { NOME_DOS_ESTADOS } from "@/lib/estados";

// ── UMA PÁGINA PÚBLICA POR MUNICÍPIO ──
//
// /raio-x/pi/barro-duro: o que o Tesouro Nacional já publicou sobre a
// prefeitura, com o nome dela no título. Prefeito não pesquisa "software
// de gestão municipal" no Google — mas vereador, jornalista, contador e o
// próprio secretário pesquisam o nome do município. É por esse nome que o
// CidadeIA passa a ser encontrado, 5.571 vezes, sem anúncio.
//
// ── COMO NÃO DERRUBAR O TESOURO ──
// Nada é pré-construído: seriam 5.571 × várias chamadas ao SICONFI no
// build. Cada página é montada no primeiro acesso e guardada por sete
// dias (ISR). O Google rastreia aos poucos; o cache segura o resto. Se o
// Tesouro não responder, a página ainda existe — nome, UF, população, o
// que a consulta faria — e diz que os números virão na próxima visita.
//
// ── O QUE ELA NÃO DIZ ──
// Nada que o Raio-X do formulário já não diga. Os percentuais são indício,
// não cálculo de mínimo constitucional, e o texto continua avisando isso.
// Dado público, tom público: sem "descumpre", sem veredito.

export const revalidate = 604800; // 7 dias
export const dynamicParams = true;
export const maxDuration = 60;

// Nenhuma pré-construída (ver acima). A lista existe para o Next saber que
// os parâmetros são conhecidos e válidos, não para gerar no build.
export function generateStaticParams() {
  return [];
}

function acharMunicipio(uf: string, slug: string) {
  const sigla = uf.toUpperCase();
  if (!(ESTADOS as readonly string[]).includes(sigla)) return null;
  return municipioPorSlug(sigla, slug);
}

export async function generateMetadata({ params }: { params: Promise<{ uf: string; slug: string }> }) {
  const { uf, slug } = await params;
  const m = acharMunicipio(uf, slug);
  if (!m) return { title: "Município não encontrado" };
  const pop = new Intl.NumberFormat("pt-BR").format(m.populacao ?? 0);
  return compartilhamento({
    titulo: `Raio-X da Prefeitura de ${m.nome}/${m.uf} — receita, saúde, educação e RREO no Tesouro`,
    descricao: `O que o Tesouro Nacional já publicou sobre ${m.nome} (${m.uf}, ${pop} habitantes): receita realizada, aplicação em saúde e educação, e quais relatórios obrigatórios constam. Dado público, sem cadastro.`,
    caminho: caminhoDoRaioX(m),
  });
}

export default async function RaioXMunicipioPage({ params }: { params: Promise<{ uf: string; slug: string }> }) {
  const { uf, slug } = await params;
  const m = acharMunicipio(uf, slug);
  if (!m) notFound();

  const porte = PORTES.find((p) => p.chave === porteDaPopulacao(m.populacao));
  const vizinhos = municipiosDaUf(m.uf)
    .filter((x) => x.codigo !== m.codigo)
    .sort((a, b) => Math.abs((a.populacao ?? 0) - (m.populacao ?? 0)) - Math.abs((b.populacao ?? 0) - (m.populacao ?? 0)))
    .slice(0, 6);

  let resultado: Awaited<ReturnType<typeof montarRaioX>> | null = null;
  try {
    resultado = await montarRaioX(m.nome, m.uf);
  } catch (e) {
    console.error(`[raio-x/${m.uf}/${slug}] Tesouro não respondeu:`, e);
  }

  return (
    <div className="tema-noite min-h-screen">
      <JsonLdScript
        dados={[
          ldBreadcrumb([
            { nome: "Início", caminho: "/" },
            { nome: "Raio-X", caminho: "/raio-x" },
            { nome: NOME_DOS_ESTADOS[m.uf as Estado], caminho: `/raio-x/${m.uf.toLowerCase()}` },
            { nome: m.nome, caminho: caminhoDoRaioX(m) },
          ]),
          ldPrefeitura({ nome: m.nome, uf: m.uf, populacao: m.populacao, caminho: caminhoDoRaioX(m) }),
        ]}
      />
      <SiteHeader />
      <main>
        <section className="max-w-4xl mx-auto px-4 sm:px-8 pt-14 sm:pt-20 pb-8">
          <Reveal>
            <Olho>Raio-X · dado público do Tesouro Nacional</Olho>
            <h1 className="font-serif text-[2.2rem] leading-[1.02] sm:text-[3rem] font-extrabold tracking-[-0.04em] mt-5">
              Prefeitura de {m.nome}
              <span className="text-muted font-normal"> · {m.uf}</span>
            </h1>
            <p className="text-muted text-base sm:text-lg leading-relaxed mt-5 max-w-[58ch]">
              {new Intl.NumberFormat("pt-BR").format(m.populacao ?? 0)} habitantes pela estimativa do
              IBGE — município de {porte?.rotulo.toLowerCase()} habitantes. Abaixo, o que a própria
              prefeitura publicou no Tesouro Nacional neste exercício: receita, quanto foi aplicado em
              cada área e quais relatórios obrigatórios constam. Nada aqui foi digitado por ninguém.
            </p>
          </Reveal>
        </section>

        <section className="max-w-4xl mx-auto px-4 sm:px-8 pb-12">
          <Reveal delay={100}>
            {resultado?.ok ? (
              <RaioXResultado raioX={resultado.raioX} />
            ) : (
              <div className="border border-border rounded-2xl p-6" style={{ background: "var(--card)" }}>
                <h2 className="font-serif text-lg font-bold">O Tesouro não respondeu agora</h2>
                <p className="text-sm text-muted mt-2 leading-relaxed max-w-[62ch]">
                  {resultado && !resultado.ok
                    ? resultado.erro
                    : "A consulta ao SICONFI falhou nesta visita. Os números de " +
                      m.nome +
                      " aparecem aqui assim que o serviço responder — a página é refeita automaticamente."}
                </p>
                <Link href="/raio-x" className="inline-block mt-4 text-sm font-semibold text-brand hover:underline">
                  Consultar de novo agora →
                </Link>
              </div>
            )}
          </Reveal>
        </section>

        <section className="max-w-4xl mx-auto px-4 sm:px-8 pb-12">
          <Reveal>
            <CapturaLeadRaioX codigoIbge={m.codigo} municipio={m.nome} />
          </Reveal>
        </section>

        {/* ── o que o dado público não mostra ── */}
        <section className="border-y border-border" style={{ background: "var(--superficie)" }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12">
            <Reveal>
              <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
                <div>
                  <h2 className="font-serif text-xl font-bold">O que não aparece em base pública</h2>
                  <p className="text-sm text-muted mt-2 leading-relaxed max-w-[60ch]">
                    Obra parada, prazo de ouvidoria vencendo, dispensa que está virando
                    fracionamento, indicador de saúde sem atualização — é o que o CidadeIA
                    acompanha por dentro, com a mesma disciplina: número, artigo da lei e a
                    tela onde se resolve.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5 shrink-0">
                  <Link
                    href="/demo"
                    className="bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-6 py-3.5 transition shadow-elevated text-center"
                  >
                    Ver o painel funcionando&nbsp;&nbsp;→
                  </Link>
                  <Link
                    href={`/proposta?ibge=${m.codigo}`}
                    className="border border-border font-semibold text-sm rounded-xl px-5 py-3 transition hover:border-brand text-center"
                  >
                    Montar proposta para {m.nome}
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── vizinhos de porte: navegação interna que o Google segue ── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-8 py-12">
          <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted mb-4">
            Municípios de porte parecido em {m.uf}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {vizinhos.map((v) => (
              <Link
                key={v.codigo}
                href={caminhoDoRaioX(v)}
                className="text-sm font-semibold rounded-full border border-border px-4 py-2 hover:border-brand hover:text-brand-claro transition"
              >
                {v.nome} →
              </Link>
            ))}
          </div>
          <Link
            href={`/raio-x/${m.uf.toLowerCase()}`}
            className="inline-block mt-5 text-sm font-semibold text-brand hover:underline"
          >
            Todas as prefeituras {doEstado(m.uf as Estado)} →
          </Link>
          <p className="text-xs text-muted mt-6 leading-relaxed max-w-[62ch]">
            Fonte: API pública do SICONFI, Tesouro Nacional, e estimativa de população do IBGE.
            Os percentuais da receita são indício, não cálculo de mínimo constitucional — a base
            legal do mínimo não é a receita total.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
