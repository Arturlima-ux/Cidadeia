import { fusoDoEstado, dataNumerica } from "@/lib/horario";
import Link from "next/link";
import type { dashboardSnapshots, obras, licitacoes, publicacoes } from "@/db/schema";
import { formatarMoeda } from "@/lib/formatadores";
import FormularioCidadao from "./FormularioCidadao";
import SecoesPublicadas from "./SecoesPublicadas";
import MapaVivo from "@/components/site/inicio/MapaVivo";
import { indiceNoMapa } from "@/lib/mapa-municipios-codigos";
import type { ItemFaixa, VozDaCidade } from "@/lib/voz-da-cidade";
import { NOME_TIPO, type TipoAtendimento } from "@/lib/atendimento";
import { Anel, Barra, Contador, Surgir } from "@/components/portal/Vivo";


// ── O PORTAL DA CIDADE ──
//
// A página que o morador abre no celular. Antes era uma lista de cartões
// cinza com "Execução orçamentária" no título. Agora é a cidade falando e a
// prefeitura respondendo, em público:
//
//   1. A cidade, acesa no mapa do Brasil, e o que dá para fazer aqui.
//   2. A voz da cidade: o que os moradores disseram e como a prefeitura
//      respondeu (lib/voz-da-cidade.ts — só números e metadados).
//   3. O dinheiro, numa frase que qualquer pessoa entende.
//   4. As obras, com o andamento.
//   5. O que a prefeitura está comprando.
//   6. O que ela publicou, e o formulário para falar com ela.
//
// Linguagem de morador do começo ao fim: nada de "execução orçamentária",
// "homologada" ou "modalidade" sem tradução.

export const OBRA: Record<string, { rotulo: string; cor: string }> = {
  planejada: { rotulo: "Vai começar", cor: "var(--muted)" },
  em_andamento: { rotulo: "Em andamento", cor: "var(--brand-claro)" },
  atrasada: { rotulo: "Atrasada", cor: "var(--urgente)" },
  concluida: { rotulo: "Pronta", cor: "var(--info)" },
  paralisada: { rotulo: "Parada", cor: "var(--medio)" },
};

const COMPRA: Record<string, { rotulo: string; cor: string }> = {
  planejamento: { rotulo: "Em preparação", cor: "var(--muted)" },
  publicada: { rotulo: "Aberta para propostas", cor: "var(--brand-claro)" },
  em_disputa: { rotulo: "Empresas disputando", cor: "var(--medio)" },
  homologada: { rotulo: "Concluída", cor: "var(--info)" },
  cancelada: { rotulo: "Cancelada", cor: "var(--urgente)" },
};

export const COR_TIPO: Record<TipoAtendimento, string> = {
  protocolo: "var(--brand)",
  reclamacao: "var(--urgente)",
  denuncia: "var(--medio)",
  sugestao: "var(--accent)",
  elogio: "var(--info)",
  informacao: "var(--brand-claro)",
};

// Plural curto para a faixa: "Reclamação", "Elogio", "Pedido de serviço".
export const TIPO_CURTO: Record<TipoAtendimento, string> = {
  protocolo: "Pedido de serviço",
  reclamacao: "Reclamação",
  denuncia: "Denúncia",
  sugestao: "Sugestão",
  elogio: "Elogio",
  informacao: "Pedido de informação",
};

export function Faixa({ itens, sentido, duracao }: { itens: ItemFaixa[]; sentido: "ida" | "volta"; duracao: number }) {
  const dobrado = [...itens, ...itens];
  return (
    <div className="portal-faixa-janela">
      <ul className="portal-faixa" data-sentido={sentido} style={{ "--duracao": `${duracao}s` } as React.CSSProperties}>
        {dobrado.map((it, i) => (
          <li
            key={i}
            aria-hidden={i >= itens.length}
            className="shrink-0 rounded-2xl border border-border px-5 py-4 min-w-[250px]"
            style={{ background: "var(--card)" }}
          >
            <p className="flex items-center gap-2 text-sm font-medium">
              <span className="w-2 h-2 rounded-full" style={{ background: COR_TIPO[it.tipo] }} />
              {TIPO_CURTO[it.tipo]}
              <span className="text-muted font-normal">· {it.area}</span>
            </p>
            <p className="text-sm mt-1.5" style={{ color: it.situacao === "respondida" ? "var(--info)" : "var(--muted)" }}>
              {it.situacao === "respondida"
                ? it.dias === 0
                  ? "Respondida no mesmo dia"
                  : `Respondida em ${it.dias} ${it.dias === 1 ? "dia" : "dias"}`
                : it.dias === 0
                  ? "Chegou hoje · em análise"
                  : `Em análise · há ${it.dias} ${it.dias === 1 ? "dia" : "dias"}`}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Titulo({ olho, titulo, texto }: { olho: string; titulo: React.ReactNode; texto?: string }) {
  return (
    <Surgir className="max-w-[720px] mb-10">
      <p className="text-xs font-semibold tracking-[0.14em] uppercase" style={{ color: "var(--brand-claro)" }}>
        {olho}
      </p>
      <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.04em] leading-[1.05] mt-3">{titulo}</h2>
      {texto && <p className="text-muted text-base sm:text-lg leading-relaxed mt-4">{texto}</p>}
    </Surgir>
  );
}

export type DadosPortal = {
  portal: { nome: string; municipio: string; estado: string; prefeito: string | null; whatsappNumero: string | null; codigoIbge: string | null; mostrarFinanceiro: boolean; mostrarObras: boolean; mostrarLicitacoes: boolean };
  slug: string;
  snapshot: typeof dashboardSnapshots.$inferSelect | null;
  listaObras: (typeof obras.$inferSelect)[];
  listaLicitacoes: (typeof licitacoes.$inferSelect)[];
  listaPublicacoes: (typeof publicacoes.$inferSelect)[];
  voz: VozDaCidade;
  /** Cidade fictícia de /transparencia/exemplo: faixa de aviso e sem formulário de verdade. */
  exemplo?: boolean;
};

export default function PortalCidade({ portal, slug, snapshot, listaObras, listaLicitacoes, listaPublicacoes, voz, exemplo = false }: DadosPortal) {
  const fuso = fusoDoEstado(portal.estado);
  const destaque = portal.codigoIbge ? indiceNoMapa(portal.codigoIbge) : null;

  const receita = snapshot?.receita ?? null;
  const despesas = snapshot?.despesas ?? null;
  const deCem = receita && despesas !== null && receita > 0 ? Math.round((despesas / receita) * 100) : null;

  const obrasProntas = listaObras.filter((o) => o.status === "concluida").length;
  const nav = [
    { href: "#voz", rotulo: "A voz da cidade" },
    ...(portal.mostrarFinanceiro ? [{ href: "#dinheiro", rotulo: "Dinheiro" }] : []),
    ...(portal.mostrarObras ? [{ href: "#obras", rotulo: "Obras" }] : []),
    ...(portal.mostrarLicitacoes ? [{ href: "#compras", rotulo: "Compras" }] : []),
    { href: "#atendimento", rotulo: "Fale com a prefeitura" },
  ];

  return (
    <div className="tema-noite min-h-screen bg-background overflow-x-clip">
      <a href="#conteudo" className="pular-para-conteudo">
        Pular para o conteúdo
      </a>

      {exemplo && (
        <div className="text-center text-sm py-2.5 px-4" style={{ background: "var(--brand)", color: "white" }}>
          Cidade fictícia, com dados de exemplo, para mostrar como fica o portal da sua prefeitura.{" "}
          <Link href="/proposta" className="underline font-semibold">
            Quero o da minha cidade
          </Link>
        </div>
      )}

      {/* ═══ A CIDADE ═══ */}
      <header className="relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(60% 70% at 75% 40%, color-mix(in oklab, var(--brand) 18%, transparent), transparent 70%)" }}
          aria-hidden
        />
        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-8 pt-8 sm:pt-10">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="inline-flex items-center gap-2.5 rounded-full border border-border px-3.5 py-1.5" style={{ background: "var(--card)" }}>
              <span className="w-2 h-2 rounded-full portal-pulso" style={{ background: "var(--info)" }} />
              Portal da Transparência
              {snapshot && <span className="text-muted">· atualizado em {dataNumerica(snapshot.atualizadoEm, fuso)}</span>}
            </p>
            <Link href="/" className="text-muted hover:text-foreground text-xs">
              Feito com CidadeIA
            </Link>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] gap-6 lg:gap-10 items-center py-10 sm:py-16">
            <Surgir>
              <p className="text-muted text-lg">
                Prefeitura Municipal <span style={{ color: "var(--brand-claro)" }}>· {portal.estado}</span>
              </p>
              <h1 className="text-[clamp(3.2rem,10vw,7.5rem)] font-semibold tracking-[-0.055em] leading-[0.92] mt-1 break-words">
                {portal.municipio}
              </h1>
              <p className="text-xl sm:text-2xl leading-snug mt-6 max-w-[26ch]">
                Aqui a prefeitura presta contas. <span style={{ color: "var(--brand-claro)" }}>E você fala com ela.</span>
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <a
                  href="#atendimento"
                  className="rounded-full px-6 py-3.5 font-semibold text-sm text-white transition hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, var(--brand), var(--accent))", boxShadow: "0 12px 40px -12px var(--brand)" }}
                >
                  Fazer um pedido à prefeitura
                </a>
                <a href="#atendimento" className="rounded-full px-6 py-3.5 font-medium text-sm border border-border hover:border-brand transition">
                  Acompanhar meu protocolo
                </a>
              </div>
              {portal.prefeito && <p className="text-sm text-muted mt-6">Prefeito(a): {portal.prefeito}</p>}
            </Surgir>
            <div className="relative aspect-square w-full max-w-[520px] mx-auto lg:ml-auto" aria-hidden>
              <MapaVivo destaque={destaque} className="w-full h-full" />
            </div>
          </div>

          <nav aria-label="Nesta página" className="flex gap-2 overflow-x-auto pb-6 rolagem-discreta">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="shrink-0 rounded-full border border-border px-4 py-2 text-sm text-muted hover:text-foreground hover:border-brand transition">
                {n.rotulo}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main id="conteudo" className="max-w-[1200px] mx-auto px-4 sm:px-8">
        {/* ═══ A VOZ DA CIDADE ═══ */}
        <section id="voz" className="pt-20 sm:pt-28 scroll-mt-6">
          <Titulo
            olho="A voz da cidade"
            titulo={
              <>
                A cidade fala. <span style={{ color: "var(--brand-claro)" }}>A prefeitura responde.</span>
              </>
            }
            texto="O que os moradores pediram, reclamaram e elogiaram no último ano, e como a prefeitura respondeu. Sem nomes: aparece só o tipo, a área e a situação."
          />
          {voz.publica ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { n: <Contador valor={voz.total} />, rotulo: "mensagens de moradores", cor: "var(--foreground)" },
                  { n: <><Contador valor={voz.percentualRespondido} />%</>, rotulo: `já respondidas (${voz.respondidas})`, cor: "var(--info)" },
                  {
                    n: voz.diasMedioResposta === null ? "—" : <Contador valor={voz.diasMedioResposta} formato="decimal" />,
                    rotulo: "dias, em média, para responder",
                    cor: "var(--brand-claro)",
                  },
                  { n: <Contador valor={voz.elogios} />, rotulo: "elogios recebidos", cor: "var(--medio)" },
                ].map((c, i) => (
                  <Surgir key={c.rotulo} atraso={i * 0.08}>
                    <div className="rounded-3xl border border-border p-5 sm:p-7 h-full" style={{ background: "var(--card)" }}>
                      <p className="text-4xl sm:text-6xl font-semibold tracking-[-0.05em]" style={{ color: c.cor }}>
                        {c.n}
                      </p>
                      <p className="text-sm text-muted mt-2 leading-snug">{c.rotulo}</p>
                    </div>
                  </Surgir>
                ))}
              </div>

              <Surgir className="mt-8" atraso={0.1}>
                <p className="text-sm text-muted mb-3">Sobre o que a cidade mais falou</p>
                <div className="flex h-4 rounded-full overflow-hidden gap-[3px]">
                  {voz.porTipo.map((t) => (
                    <div
                      key={t.tipo}
                      title={`${NOME_TIPO[t.tipo]}: ${t.quantidade}`}
                      style={{ flexGrow: t.quantidade, background: COR_TIPO[t.tipo] }}
                    />
                  ))}
                </div>
                <ul className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm">
                  {voz.porTipo.map((t) => (
                    <li key={t.tipo} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: COR_TIPO[t.tipo] }} />
                      {TIPO_CURTO[t.tipo]} <span className="text-muted tabular-nums">{t.quantidade}</span>
                    </li>
                  ))}
                </ul>
              </Surgir>

              <div className="mt-10 space-y-3 -mx-4 sm:-mx-8">
                <p className="px-4 sm:px-8 text-sm text-muted">As últimas mensagens, ao vivo</p>
                <Faixa itens={voz.faixa.slice(0, Math.ceil(voz.faixa.length / 2))} sentido="ida" duracao={60} />
                {voz.faixa.length > 6 && <Faixa itens={voz.faixa.slice(Math.ceil(voz.faixa.length / 2))} sentido="volta" duracao={75} />}
              </div>
            </>
          ) : (
            <Surgir>
              <div className="rounded-3xl border border-dashed border-border p-8 sm:p-12 text-center">
                <p className="text-xl font-medium">A voz da cidade aparece aqui a partir das primeiras mensagens.</p>
                <p className="text-muted mt-2">Seja a primeira pessoa: faça um pedido, uma sugestão ou um elogio.</p>
                <a href="#atendimento" className="inline-block mt-6 rounded-full px-6 py-3 text-sm font-semibold text-white" style={{ background: "var(--brand)" }}>
                  Falar com a prefeitura
                </a>
              </div>
            </Surgir>
          )}
        </section>

        {/* ═══ O DINHEIRO ═══ */}
        {portal.mostrarFinanceiro && (
          <section id="dinheiro" className="pt-24 sm:pt-32 scroll-mt-6">
            <Titulo
              olho="Para onde vai o dinheiro"
              titulo={
                deCem !== null ? (
                  <>
                    De cada <span style={{ color: "var(--brand-claro)" }}>R$ 100</span> que entraram,{" "}
                    <span style={{ color: "var(--brand-claro)" }}>R$ {deCem}</span> já foram gastos.
                  </>
                ) : (
                  "O dinheiro da cidade, às claras."
                )
              }
              texto={snapshot ? `Números publicados pela prefeitura, atualizados em ${dataNumerica(snapshot.atualizadoEm, fuso)}.` : undefined}
            />
            {snapshot && receita !== null ? (
              <div className="rounded-3xl border border-border p-6 sm:p-10 space-y-8" style={{ background: "var(--card)" }}>
                {[
                  { rotulo: "Entrou na prefeitura", valor: receita, pct: 100, cor: "var(--info)" },
                  { rotulo: "Já foi gasto", valor: despesas, pct: despesas !== null ? (despesas / receita) * 100 : 0, cor: "var(--brand)" },
                  { rotulo: "Ainda em caixa", valor: snapshot.saldo, pct: snapshot.saldo !== null ? (Math.max(0, snapshot.saldo) / receita) * 100 : 0, cor: "var(--accent)" },
                ].map((l, i) => (
                  <div key={l.rotulo}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                      <p className="text-base sm:text-lg">{l.rotulo}</p>
                      <p className="text-2xl sm:text-4xl font-semibold tracking-[-0.04em]">
                        {l.valor === null ? "—" : <Contador valor={l.valor} formato="moeda" duracao={1.8} />}
                      </p>
                    </div>
                    <Barra pct={l.pct} cor={l.cor} atraso={0.15 * i} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">A prefeitura ainda não publicou os números do dinheiro neste portal.</p>
            )}
          </section>
        )}

        {/* ═══ AS OBRAS ═══ */}
        {portal.mostrarObras && (
          <section id="obras" className="pt-24 sm:pt-32 scroll-mt-6">
            <Titulo
              olho="Obras na cidade"
              titulo={
                listaObras.length > 0 ? (
                  <>
                    {listaObras.length} {listaObras.length === 1 ? "obra" : "obras"}.{" "}
                    <span className="text-muted">
                      {obrasProntas} {obrasProntas === 1 ? "pronta" : "prontas"}.
                    </span>
                  </>
                ) : (
                  "As obras da cidade aparecem aqui."
                )
              }
              texto={listaObras.length > 0 ? "Cada obra com o quanto já foi feito, onde fica e quanto custa." : "Nenhuma obra publicada ainda."}
            />
            {listaObras.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                {listaObras.map((o, i) => {
                  const st = OBRA[o.status] ?? OBRA.planejada;
                  return (
                    <Surgir key={o.id} atraso={(i % 2) * 0.08}>
                      <article className="rounded-3xl border border-border p-5 sm:p-6 flex gap-5 items-center h-full" style={{ background: "var(--card)" }}>
                        <Anel pct={o.progressoAtual} cor={st.cor} atraso={0.2}>
                          <span className="text-sm font-semibold tabular-nums">
                            {o.progressoAtual === null ? "—" : `${Math.round(o.progressoAtual)}%`}
                          </span>
                        </Anel>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold" style={{ color: st.cor }}>
                            {st.rotulo}
                          </p>
                          <h3 className="text-lg font-semibold tracking-[-0.02em] leading-snug mt-1 break-words">{o.nome}</h3>
                          <p className="text-sm text-muted mt-1">
                            {[o.bairro, o.valorContrato !== null ? formatarMoeda(o.valorContrato) : null].filter(Boolean).join(" · ") ||
                              (o.progressoAtual === null ? "Sem medição informada" : "")}
                          </p>
                        </div>
                      </article>
                    </Surgir>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ═══ AS COMPRAS ═══ */}
        {portal.mostrarLicitacoes && (
          <section id="compras" className="pt-24 sm:pt-32 scroll-mt-6">
            <Titulo
              olho="Licitações"
              titulo="O que a prefeitura está comprando."
              texto={
                listaLicitacoes.length > 0
                  ? "Toda compra grande passa por disputa entre empresas. Aqui você vê o que está sendo comprado e em que pé está."
                  : "Nenhuma compra publicada ainda."
              }
            />
            {listaLicitacoes.length > 0 && (
              <ul className="border-t border-border">
                {listaLicitacoes.map((l, i) => {
                  const st = COMPRA[l.status] ?? COMPRA.planejamento;
                  return (
                    <Surgir key={l.id} atraso={Math.min(i, 4) * 0.05}>
                      <li className="grid sm:grid-cols-[minmax(0,1fr)_auto] gap-x-8 gap-y-2 py-6 border-b border-border">
                        <div className="min-w-0">
                          <p className="text-lg font-medium tracking-[-0.01em] break-words">{l.objeto}</p>
                          <p className="text-sm text-muted mt-1">
                            {[l.numero, l.modalidade, l.valorEstimado !== null ? `cerca de ${formatarMoeda(l.valorEstimado)}` : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                        <p className="text-sm font-medium self-center inline-flex items-center gap-2" style={{ color: st.cor }}>
                          <span className="w-2 h-2 rounded-full" style={{ background: st.cor }} />
                          {st.rotulo}
                        </p>
                      </li>
                    </Surgir>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* ═══ O QUE A PREFEITURA PUBLICOU ═══ */}
        <div className="pt-24 sm:pt-32">
          <SecoesPublicadas publicacoes={listaPublicacoes} />
        </div>

        {/* ═══ FALE COM A PREFEITURA ═══ */}
        <section id="atendimento" className="pt-24 sm:pt-32 pb-24 scroll-mt-6">
          <div
            className="rounded-[32px] border border-border p-6 sm:p-12 relative overflow-hidden"
            style={{ background: "radial-gradient(80% 60% at 100% 0%, color-mix(in oklab, var(--brand) 22%, transparent), transparent 70%), var(--card)" }}
          >
            <Titulo
              olho="Fale com a prefeitura"
              titulo={
                <>
                  Pedido, reclamação ou elogio. <span style={{ color: "var(--brand-claro)" }}>Ela responde.</span>
                </>
              }
              texto="Você recebe um número de protocolo e acompanha a resposta por aqui. Reclamação, denúncia, sugestão e elogio podem ser feitos sem se identificar."
            />
            {exemplo ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-muted">
                Esta é uma cidade de exemplo. No portal de verdade, aqui fica o formulário: o morador escolhe o tipo,
                escreve, recebe o número de protocolo e acompanha a resposta.
              </p>
            ) : (
              <FormularioCidadao slug={slug} whatsappNumero={portal.whatsappNumero} />
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            Dados publicados pela {portal.nome} · Lei de Acesso à Informação (12.527/2011) · Ouvidoria: Lei 13.460/2017
          </p>
          <Link href="/" className="text-xs font-semibold text-brand-claro hover:underline">
            Feito com CidadeIA
          </Link>
        </div>
      </footer>
    </div>
  );
}
