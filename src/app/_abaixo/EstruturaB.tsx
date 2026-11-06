import { estadosEmAlerta, faixasDoMapa, FONTES_ABAIXO, modulosAbaixo, numerosDoBrasil, PASSOS } from "./dados";
import MapaDasFaixas from "./MapaDasFaixas";
import { Confianca, LinhaDaDispensa, Montador, Video, type CidadeDoMontador } from "./Pecas";

// ── ESTRUTURA B · RELATÓRIO COM MAPA (nov/2026) ──
// Referência: Lazarev, "Auronix" (dribbble.com/shots/26834766). A página lida
// como um relatório anual de luxo: uma frase em caixa alta escalonada, os
// números gigantes em grade com a legenda miúda em brasa, e um painel em
// brasa cheia com o Brasil em pontos, um por município, pintado pela
// despesa com pessoal de cada prefeitura. Tudo dado real, com data.

const ESTILO = `
.eb-largura { max-width: 1200px; margin-inline: auto; padding-inline: 16px; }
@media (min-width: 640px) { .eb-largura { padding-inline: 32px; } }
.eb-tag { font-size: 11.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--brand-claro); font-variant-numeric: tabular-nums; }
.eb-escada { padding-top: clamp(96px, 12vw, 168px); font-family: var(--font-titulo); font-weight: 600; text-transform: uppercase; font-size: clamp(40px, 7.4vw, 112px); line-height: .9; letter-spacing: -.05em; margin: 0; }
.eb-escada span { display: block; }
.eb-escada span:nth-child(2) { padding-left: 1.6em; }
.eb-escada span:nth-child(3) { padding-left: .5em; color: var(--brand); }
.eb-escada span:nth-child(4) { padding-left: 2.6em; }
.eb-sobre { display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 8fr); gap: 24px 48px; margin-top: clamp(64px, 8vw, 112px); }
.eb-sobre p.eb-grande { font-family: var(--font-titulo); font-size: clamp(22px, 2.4vw, 32px); line-height: 1.25; letter-spacing: -.025em; margin: 0; text-indent: 3em; max-width: 30ch; }
.eb-sobre p.eb-grande + p { margin-top: 18px; color: var(--muted); line-height: 1.6; max-width: 56ch; }
.eb-numeros { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0 32px; margin-top: clamp(72px, 9vw, 120px); }
.eb-numeros > div { padding-top: 20px; border-top: 1px solid var(--border); }
.eb-numeros b { display: block; font-family: var(--font-titulo); font-weight: 400; font-size: clamp(48px, 6vw, 92px); letter-spacing: -.055em; line-height: .95; font-variant-numeric: tabular-nums; }
.eb-numeros .eb-tag { display: block; margin-top: 12px; }
.eb-numeros p { margin: 22px 0 0; color: var(--muted); font-size: 14px; line-height: 1.5; max-width: 26ch; }

.eb-mapa { margin-top: clamp(112px, 14vw, 200px); border-radius: 32px; background: var(--brand); color: var(--sobre-forte); padding: clamp(24px, 4.4vw, 56px); display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 32px 48px; align-items: center; }
.eb-mapa .eb-tag { color: color-mix(in oklab, var(--sobre-forte) 74%, transparent); }
.eb-mapa h2 { font-family: var(--font-titulo); font-size: clamp(30px, 3.6vw, 52px); line-height: 1; letter-spacing: -.04em; font-weight: 600; margin: 14px 0 0; text-wrap: balance; }
.eb-pct { display: flex; align-items: baseline; gap: 14px; margin-top: 36px; }
.eb-pct b { font-family: var(--font-titulo); font-size: clamp(72px, 9vw, 136px); font-weight: 400; letter-spacing: -.06em; line-height: .85; font-variant-numeric: tabular-nums; }
.eb-pct span { font-size: 14px; line-height: 1.4; max-width: 18ch; }
.eb-estados { list-style: none; margin: 32px 0 0; padding: 0; display: grid; }
.eb-estados li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; padding-block: 10px; border-top: 1px solid color-mix(in oklab, var(--sobre-forte) 22%, transparent); font-size: 14.5px; font-variant-numeric: tabular-nums; }
.eb-estados li b { font-weight: 600; }
.eb-legenda { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 14px; font-size: 12.5px; }
.eb-legenda i { display: inline-block; width: 8px; height: 8px; border-radius: 9px; margin-right: 6px; background: var(--sobre-forte); vertical-align: 1px; }
.eb-legenda i.l0 { opacity: .42; } .eb-legenda i.l1 { opacity: .72; } .eb-legenda i.l3 { background: var(--foreground); }
.eb-mapa-fonte { margin-top: 18px; font-size: 12.5px; color: color-mix(in oklab, var(--sobre-forte) 70%, transparent); }

.eb-modulos { padding-top: clamp(112px, 14vw, 200px); }
.eb-modulos-cab { display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 8fr); gap: 24px 48px; margin-bottom: 48px; }
.eb-modulos-cab h2 { font-family: var(--font-titulo); font-size: clamp(32px, 4vw, 56px); line-height: 1; letter-spacing: -.04em; font-weight: 600; margin: 0; max-width: 16ch; text-wrap: balance; }
.eb-grade { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 56px 32px; }
.eb-grade article { border-top: 1px solid var(--border); padding-top: 20px; display: grid; gap: 10px; align-content: start; min-width: 0; }
.eb-grade h3 { font-family: var(--font-titulo); font-size: clamp(26px, 2.6vw, 36px); letter-spacing: -.035em; font-weight: 500; margin: 6px 0 0; }
.eb-grade .eb-q { font-size: 16px; line-height: 1.4; }
.eb-grade ul { margin: 6px 0 0; padding: 0; list-style: none; display: grid; gap: 6px; color: var(--muted); font-size: 14px; line-height: 1.45; }

.eb-passos { padding-top: clamp(112px, 14vw, 200px); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; }
.eb-passos div { display: grid; gap: 10px; }
.eb-passos b.eb-n { font-family: var(--font-titulo); font-size: clamp(80px, 10vw, 152px); font-weight: 300; letter-spacing: -.07em; line-height: .8; color: color-mix(in oklab, var(--foreground) 22%, transparent); }
.eb-passos h3 { font-family: var(--font-titulo); font-size: 22px; letter-spacing: -.02em; font-weight: 600; margin: 8px 0 0; }
.eb-passos p { margin: 0; color: var(--muted); line-height: 1.55; max-width: 32ch; }

.eb-video { padding-top: clamp(112px, 14vw, 200px); }
.eb-video-cab { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 16px 48px; margin-bottom: 32px; }
.eb-video-cab h2 { font-family: var(--font-titulo); font-weight: 600; text-transform: uppercase; font-size: clamp(36px, 5.6vw, 84px); line-height: .9; letter-spacing: -.05em; margin: 12px 0 0; }
.eb-video-cab p { color: var(--muted); max-width: 40ch; line-height: 1.6; }
.eb-video-moldura { border-radius: 28px; overflow: hidden; }

.eb-fecho { padding-block: clamp(112px, 14vw, 200px) 96px; }
.eb-fecho-cab { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 24px 48px; align-items: end; margin-bottom: 48px; }
.eb-fecho-cab h2 { font-family: var(--font-titulo); font-weight: 600; text-transform: uppercase; font-size: clamp(40px, 6.4vw, 100px); line-height: .9; letter-spacing: -.05em; margin: 12px 0 0; }
.eb-fecho-cab h2 span { color: var(--brand); display: block; padding-left: 1.2em; }
.eb-fecho-cab p { color: var(--muted); line-height: 1.6; }
.eb-fecho-cab p + p { margin-top: 12px; font-size: 14px; }
.eb-confianca { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px 32px; margin: 64px 0 0; }
.eb-confianca > div { border-top: 1px solid var(--border); padding-top: 16px; }
.eb-confianca dt { font-weight: 600; }
.eb-confianca dd { margin: 6px 0 0; color: var(--muted); font-size: 15px; line-height: 1.55; overflow-wrap: anywhere; }
.eb-fontes { display: flex; flex-wrap: wrap; gap: 8px 28px; margin-top: 56px; font-size: 14px; }
.eb-fontes a { color: var(--muted); text-decoration: none; } .eb-fontes a:hover { color: var(--foreground); }

@media (max-width: 899px) {
  .eb-sobre, .eb-mapa, .eb-modulos-cab, .eb-fecho-cab { grid-template-columns: 1fr; }
  .eb-numeros { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px 20px; }
  .eb-grade, .eb-passos, .eb-confianca { grid-template-columns: 1fr; }
  .eb-escada span:nth-child(n) { padding-left: 0; }
  .eb-escada span:nth-child(2), .eb-escada span:nth-child(4) { padding-left: .8em; }
}
`;

export default function EstruturaB({ cidade, chave }: { cidade: CidadeDoMontador; chave: string }) {
  const n = numerosDoBrasil();
  const modulos = modulosAbaixo();
  const estados = estadosEmAlerta(5);
  const faixas = faixasDoMapa();
  const conferido = new Date(`${n.conferidoEm}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const pct = Math.round((n.passaramDoAlerta / n.comRgf) * 100);
  return (
    <div className="eb">
      <style href="cidadeia-estrutura-b" precedence="medium">{ESTILO}</style>

      <section className="eb-largura" aria-labelledby="eb-titulo">
        <h2 className="eb-escada" id="eb-titulo">
          <span>Lemos o Brasil</span>
          <span>inteiro,</span>
          <span>prefeitura</span>
          <span>por prefeitura.</span>
        </h2>
        <div className="eb-sobre">
          <p className="eb-tag">[01] · O que é</p>
          <div>
            <p className="eb-grande">O CidadeIA reúne o atendimento, o gabinete, a saúde, a educação, as obras e as compras da prefeitura num sistema só.</p>
            <p>Ele lê o que a prefeitura já declarou ao Tesouro, ao IBGE, ao PNCP e às outras bases oficiais, confere cada prazo e cada limite com o artigo de lei ao lado e entrega o trabalho pronto. A equipe confere e assina.</p>
          </div>
        </div>
        <div className="eb-numeros">
          <div><b>{n.texto.municipios}</b><span className="eb-tag">Municípios lidos</span><p>Todas as prefeituras do país, toda segunda e quinta.</p></div>
          <div><b>{n.texto.acimaDoLimite}</b><span className="eb-tag">Acima do limite</span><p>Prefeituras com a despesa com pessoal acima de 54% da receita.</p></div>
          <div><b>{n.texto.rgfAtrasado}</b><span className="eb-tag">RGF atrasado</span><p>Prefeituras que não entregaram o último relatório ao Tesouro.</p></div>
          <div><b>{n.texto.obrasParadas}</b><span className="eb-tag">Obras paradas</span><p>Paralisadas ou inacabadas no cadastro federal (ObrasGov).</p></div>
        </div>
      </section>

      <section className="eb-largura" aria-labelledby="eb-titulo-mapa">
        <div className="eb-mapa">
          <div>
            <p className="eb-tag">[02] · O mapa da LRF</p>
            <h2 id="eb-titulo-mapa">Cada ponto é uma prefeitura.</h2>
            <div className="eb-pct">
              <b>{pct}%</b>
              <span>das prefeituras com RGF lido passaram do limite de alerta da despesa com pessoal.</span>
            </div>
            <ul className="eb-estados" aria-label="Estados com mais prefeituras acima do alerta">
              {estados.map((e) => (
                <li key={e.uf}><span>{e.nome}</span><b>{e.passaram} de {e.de}</b></li>
              ))}
            </ul>
          </div>
          <div>
            <MapaDasFaixas faixas={faixas} rotulo={`Mapa do Brasil com ${n.texto.municipios} pontos, um por prefeitura, pintados pela faixa da despesa com pessoal.`} />
            <p className="eb-legenda" aria-hidden>
              <span><i className="l0" />Abaixo do alerta</span>
              <span><i className="l1" />No alerta</span>
              <span><i />Prudencial</span>
              <span><i className="l3" />Acima do limite</span>
            </p>
            <p className="eb-mapa-fonte">Tesouro Nacional, último RGF de cada prefeitura, conferido em {conferido}.</p>
          </div>
        </div>
      </section>

      <section id="solucoes" className="eb-largura eb-modulos scroll-mt-24" aria-labelledby="eb-titulo-modulos">
        <div className="eb-modulos-cab">
          <p className="eb-tag">[03] · Módulos</p>
          <h2 id="eb-titulo-modulos">Um módulo para cada parte da prefeitura.</h2>
        </div>
        <div className="eb-grade">
          {modulos.map((m, i) => (
            <article key={m.chave}>
              <span className="eb-tag">[{String(i + 1).padStart(2, "0")}]</span>
              <h3>{m.nome}</h3>
              <p className="eb-q">{m.pergunta}</p>
              <ul>{m.capacidades.slice(0, 3).map((c) => <li key={c}>{c}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section className="eb-largura eb-passos" aria-label="Como funciona">
        {PASSOS.map((p, i) => (
          <div key={p.titulo}>
            <b className="eb-n" aria-hidden>{String(i + 1).padStart(2, "0")}</b>
            <h3>{p.titulo}</h3>
            <p>{p.texto}</p>
          </div>
        ))}
      </section>

      <section id="video" className="eb-largura eb-video scroll-mt-24" aria-labelledby="eb-titulo-video">
        <div className="eb-video-cab">
          <div>
            <p className="eb-tag">[04] · Em vídeo</p>
            <h2 id="eb-titulo-video">30 segundos.</h2>
          </div>
          <p>Do atendimento ao gabinete, do celular do morador às bases oficiais. Para assistir agora ou mandar para quem decide.</p>
        </div>
        <div className="eb-video-moldura"><Video /></div>
      </section>

      <section id="proposta" className="eb-largura eb-fecho scroll-mt-24" aria-labelledby="eb-titulo-fecho">
        <div className="eb-fecho-cab">
          <div>
            <p className="eb-tag">[05] · Proposta</p>
            <h2 id="eb-titulo-fecho">Pronta em<span>um dia útil.</span></h2>
          </div>
          <div>
            <p>Escolha o município e os módulos. Valor, termo de referência e minuta de contrato chegam no mesmo e-mail, sem reunião antes.</p>
            <p><LinhaDaDispensa /></p>
          </div>
        </div>
        <Montador cidade={cidade} chave={chave} />
        <Confianca className="eb-confianca" />
        <div className="eb-fontes" aria-label="Bases oficiais lidas">
          {FONTES_ABAIXO.map((f) => <a key={f.nome} href={f.link} target="_blank" rel="noopener noreferrer">{f.nome}</a>)}
        </div>
      </section>
    </div>
  );
}
