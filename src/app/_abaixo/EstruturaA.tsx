import { FONTES_ABAIXO, modulosAbaixo, numerosDoBrasil, PASSOS } from "./dados";
import ListaAcesa from "./ListaAcesa";
import { Confianca, LinhaDaDispensa, Montador, Video, type CidadeDoMontador } from "./Pecas";

// ── ESTRUTURA A · EDITORIAL INDUSTRIAL (nov/2026) ──
// Referência: Lazarev, "Splash" (dribbble.com/shots/27068757). A tipografia
// manda: uma frase grande, números enormes soltos no carvão, a lista dos
// módulos em letra grande que acende linha a linha, os três passos em linhas
// de índice, e o vídeo e a proposta como fecho. Nenhum fio de ponta a ponta,
// nenhum campo de cor que corte a página: o fundo é o mesmo do topo.

const ESTILO = `
.ea { --ea-gutter: max(16px, env(safe-area-inset-left, 0px)); }
.ea-largura { max-width: 1200px; margin-inline: auto; padding-inline: 16px; }
@media (min-width: 640px) { .ea-largura { padding-inline: 32px; } }
.ea-rotulo { display: flex; align-items: center; gap: 10px; font-size: 11.5px; font-weight: 500; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }
.ea-rotulo i { width: 6px; height: 6px; border-radius: 9px; background: var(--brand); }
.ea-manifesto { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 9fr); gap: 24px 48px; padding-top: clamp(96px, 12vw, 160px); }
.ea-frase { font-family: var(--font-titulo); font-size: clamp(28px, 3.6vw, 52px); line-height: 1.08; letter-spacing: -.035em; font-weight: 500; text-wrap: balance; margin: 0; }
.ea-frase span { color: color-mix(in oklab, var(--foreground) 46%, transparent); }
.ea-numeros { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 40px 32px; margin-top: clamp(72px, 9vw, 128px); }
.ea-num b { display: block; font-family: var(--font-titulo); font-weight: 300; font-size: clamp(56px, 7.4vw, 112px); line-height: .9; letter-spacing: -.06em; font-variant-numeric: tabular-nums; }
.ea-num small { display: block; margin-top: 14px; font-size: 11.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--brand-claro); }
.ea-num p { margin: 8px 0 0; color: var(--muted); font-size: 14.5px; line-height: 1.5; max-width: 26ch; }
.ea-fonte-nota { margin-top: 28px; color: var(--muted); font-size: 13px; }
.ea-fontes { display: flex; flex-wrap: wrap; gap: 10px 36px; margin-top: 56px; }
.ea-fontes a { color: color-mix(in oklab, var(--foreground) 52%, transparent); font-family: var(--font-titulo); font-size: clamp(16px, 1.6vw, 20px); font-weight: 500; letter-spacing: -.02em; text-decoration: none; transition: color .2s; }
.ea-fontes a:hover { color: var(--foreground); }

.ea-modulos { padding-top: clamp(112px, 14vw, 200px); }
.ea-cab { display: flex; justify-content: space-between; align-items: end; gap: 24px; margin-bottom: 28px; }
.ea-cab h2 { font-family: var(--font-titulo); font-size: clamp(30px, 3.4vw, 48px); line-height: 1.04; letter-spacing: -.035em; font-weight: 600; margin: 14px 0 0; max-width: 18ch; text-wrap: balance; }
.ea-cab .ea-total { font-family: var(--font-titulo); font-size: clamp(48px, 6vw, 88px); font-weight: 300; letter-spacing: -.06em; line-height: .9; color: color-mix(in oklab, var(--foreground) 30%, transparent); }
.ea-lista { list-style: none; margin: 0; padding: 0; }
.ea-lista > li { border-radius: 18px; transition: background-color .35s var(--saida), color .35s var(--saida); }
.ea-lista > li > a { display: grid; grid-template-columns: 64px minmax(0, 1fr) minmax(0, 360px) 40px; align-items: center; gap: 24px; padding: 18px 24px; color: inherit; text-decoration: none; }
.ea-idx { font-size: 12px; letter-spacing: .14em; color: var(--muted); font-variant-numeric: tabular-nums; }
.ea-nome { font-family: var(--font-titulo); font-size: clamp(32px, 4.4vw, 64px); font-weight: 500; letter-spacing: -.045em; line-height: 1; }
.ea-pergunta { color: var(--muted); font-size: 15px; line-height: 1.45; }
.ea-seta { justify-self: end; font-size: 22px; opacity: 0; transform: translateX(-6px); transition: opacity .3s, transform .3s var(--saida); }
.ea-abre { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .45s var(--saida); }
.ea-abre > ul { overflow: hidden; margin: 0; padding: 0 24px 0 112px; list-style: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 24px; font-size: 14.5px; line-height: 1.5; }
.ea-abre li { padding-bottom: 22px; }
.ea-lista > li[data-acesa] { background: var(--brand); color: var(--sobre-forte); }
.ea-lista > li[data-acesa] .ea-idx, .ea-lista > li[data-acesa] .ea-pergunta { color: color-mix(in oklab, var(--sobre-forte) 72%, transparent); }
.ea-lista > li[data-acesa] .ea-seta { opacity: 1; transform: none; }
.ea-lista > li[data-acesa] .ea-abre { grid-template-rows: 1fr; }
.ea-lista > li:not([data-acesa]) .ea-nome { color: color-mix(in oklab, var(--foreground) 86%, transparent); }

.ea-painel { margin-top: clamp(112px, 14vw, 200px); border-radius: 32px; background: var(--superficie); padding: clamp(28px, 5vw, 64px); display: grid; gap: 48px; }
.ea-painel h2 { font-family: var(--font-titulo); font-size: clamp(30px, 4vw, 56px); line-height: 1.02; letter-spacing: -.04em; font-weight: 600; margin: 14px 0 0; max-width: 16ch; text-wrap: balance; }
.ea-passos { list-style: none; margin: 0; padding: 0; display: grid; }
.ea-passos li { display: grid; grid-template-columns: 64px minmax(0, 1fr) minmax(0, 1.1fr); gap: 24px; padding-block: 22px; align-items: baseline; }
.ea-passos li + li { border-top: 1px solid var(--border); }
.ea-passos b { font-family: var(--font-titulo); font-size: clamp(20px, 2vw, 28px); font-weight: 500; letter-spacing: -.03em; }
.ea-passos p { margin: 0; color: var(--muted); line-height: 1.55; }

.ea-video { padding-top: clamp(112px, 14vw, 200px); }
.ea-video-cab { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px 48px; align-items: end; margin-bottom: 36px; }
.ea-30 { display: flex; align-items: flex-end; gap: 16px; margin: 0; font-family: var(--font-titulo); font-size: clamp(96px, 16vw, 240px); font-weight: 300; letter-spacing: -.07em; line-height: .78; }
.ea-30 small { margin-bottom: .1em; font-size: 12px; letter-spacing: .16em; line-height: 1; color: var(--brand-claro); text-transform: uppercase; font-weight: 500; }
.ea-video-cab p { color: var(--muted); line-height: 1.6; max-width: 40ch; }
.ea-video .video-expande, .ea-video-moldura { border-radius: 28px; overflow: hidden; }

.ea-fecho { padding-block: clamp(112px, 14vw, 200px) 96px; }
.ea-fecho h2 { font-family: var(--font-titulo); font-size: clamp(44px, 7.6vw, 120px); line-height: .92; letter-spacing: -.055em; font-weight: 600; margin: 18px 0 0; max-width: 12ch; }
.ea-fecho h2 span { color: var(--brand); }
.ea-fecho-intro { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 32px 64px; align-items: end; margin-bottom: 56px; }
.ea-fecho-intro p { color: var(--muted); line-height: 1.6; }
.ea-fecho-intro p + p { margin-top: 12px; font-size: 14px; }
.ea-confianca { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px 40px; margin: 64px 0 0; }
.ea-confianca dt { font-weight: 600; }
.ea-confianca dd { margin: 6px 0 0; color: var(--muted); font-size: 15px; line-height: 1.55; overflow-wrap: anywhere; }

@media (max-width: 899px) {
  .ea-manifesto, .ea-video-cab, .ea-fecho-intro { grid-template-columns: 1fr; }
  .ea-numeros { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ea-lista > li > a { grid-template-columns: 36px minmax(0, 1fr) 24px; gap: 4px 12px; padding: 16px 14px; }
  .ea-pergunta { grid-column: 2 / 4; grid-row: 2; font-size: 14px; }
  .ea-abre > ul { grid-template-columns: 1fr; padding: 0 14px 0 62px; }
  .ea-passos li { grid-template-columns: 40px minmax(0, 1fr); }
  .ea-passos p { grid-column: 2; }
  .ea-confianca { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) { .ea-lista > li, .ea-abre, .ea-seta { transition: none; } }
`;

export default function EstruturaA({ cidade, chave }: { cidade: CidadeDoMontador; chave: string }) {
  const n = numerosDoBrasil();
  const modulos = modulosAbaixo();
  const conferido = new Date(`${n.conferidoEm}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <div className="ea">
      <style href="cidadeia-estrutura-a" precedence="medium">{ESTILO}</style>

      <section className="ea-largura" aria-labelledby="ea-titulo-manifesto">
        <div className="ea-manifesto">
          <p className="ea-rotulo" id="ea-titulo-manifesto"><i aria-hidden />O que é</p>
          <p className="ea-frase">
            A gestão municipal inteira, num lugar só. <span>O CidadeIA lê o que a prefeitura já declarou ao governo federal, confere com a lei e entrega o trabalho pronto para a equipe assinar.</span>
          </p>
        </div>
        <div className="ea-numeros">
          <div className="ea-num"><b>{n.texto.municipios}</b><small>Municípios lidos</small><p>Todas as prefeituras do país, uma a uma, toda segunda e quinta.</p></div>
          <div className="ea-num"><b>{n.texto.passaramDoAlerta}</b><small>Passaram do alerta</small><p>Prefeituras com a despesa com pessoal acima do limite de alerta da LRF.</p></div>
          <div className="ea-num"><b>{n.texto.obrasParadas}</b><small>Obras paradas</small><p>Obras paralisadas ou inacabadas no cadastro federal de investimentos.</p></div>
          <div className="ea-num"><b>{n.fontes}</b><small>Bases oficiais</small><p>Lidas direto da fonte, sem ninguém digitar nada.</p></div>
        </div>
        <p className="ea-fonte-nota">Tesouro Nacional (RGF) e ObrasGov, conferidos em {conferido}.</p>
        <div className="ea-fontes" aria-label="Bases oficiais lidas">
          {FONTES_ABAIXO.map((f) => (
            <a key={f.nome} href={f.link} target="_blank" rel="noopener noreferrer">{f.nome}</a>
          ))}
        </div>
      </section>

      <section id="solucoes" className="ea-largura ea-modulos scroll-mt-24" aria-labelledby="ea-titulo-modulos">
        <div className="ea-cab">
          <div>
            <p className="ea-rotulo"><i aria-hidden />Módulos</p>
            <h2 id="ea-titulo-modulos">Um módulo para cada parte da prefeitura.</h2>
          </div>
          <span className="ea-total" aria-hidden>06</span>
        </div>
        <ListaAcesa modulos={modulos} />
      </section>

      <section className="ea-largura" aria-labelledby="ea-titulo-passos">
        <div className="ea-painel">
          <div>
            <p className="ea-rotulo"><i aria-hidden />Como funciona</p>
            <h2 id="ea-titulo-passos">Do dado público ao trabalho feito.</h2>
          </div>
          <ol className="ea-passos">
            {PASSOS.map((p, i) => (
              <li key={p.titulo}>
                <span className="ea-idx">{String(i + 1).padStart(2, "0")}</span>
                <b>{p.titulo}</b>
                <p>{p.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="video" className="ea-largura ea-video scroll-mt-24" aria-labelledby="ea-titulo-video">
        <div className="ea-video-cab">
          <p className="ea-30" aria-hidden>30<small>segundos</small></p>
          <div>
            <p className="ea-rotulo"><i aria-hidden />Em vídeo</p>
            <h2 id="ea-titulo-video" className="sr-only">O CidadeIA em 30 segundos</h2>
            <p style={{ marginTop: 14 }}>Do atendimento ao gabinete, do celular do morador às bases oficiais. Para assistir agora ou mandar para quem decide na prefeitura.</p>
          </div>
        </div>
        <div className="ea-video-moldura">
          <Video />
        </div>
      </section>

      <section id="proposta" className="ea-largura ea-fecho scroll-mt-24" aria-labelledby="ea-titulo-fecho">
        <div className="ea-fecho-intro">
          <div>
            <p className="ea-rotulo"><i aria-hidden />Proposta</p>
            <h2 id="ea-titulo-fecho">Pronta em um dia <span>útil.</span></h2>
          </div>
          <div>
            <p>Escolha o município e os módulos. Valor, termo de referência e minuta de contrato chegam no mesmo e-mail, sem reunião antes.</p>
            <p><LinhaDaDispensa /></p>
          </div>
        </div>
        <Montador cidade={cidade} chave={chave} />
        <Confianca className="ea-confianca" />
      </section>
    </div>
  );
}
