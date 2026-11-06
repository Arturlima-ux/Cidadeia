import Image from "next/image";
import { FONTES_ABAIXO, modulosAbaixo, numerosDoBrasil, PASSOS } from "./dados";
import { Confianca, LinhaDaDispensa, Montador, Video, type CidadeDoMontador } from "./Pecas";

// ── ESTRUTURA C · MOSAICO DE CINEMA (nov/2026) ──
// Referência: Maximaze Studio, "Magina" (dribbble.com/shots/27236011). Peças
// grandes de imagem, cada uma como um quadro de filme, com uma frase curta
// por cima. As imagens são do próprio CidadeIA: o mapa em relevo do topo e
// quadros do vídeo de 30 segundos (public/estrutura). Nada de banco de imagem.

const ESTILO = `
.ec-largura { max-width: 1200px; margin-inline: auto; padding-inline: 16px; }
@media (min-width: 640px) { .ec-largura { padding-inline: 32px; } }
.ec-rot { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: color-mix(in oklab, var(--foreground) 70%, transparent); }
.ec-quadro { position: relative; overflow: hidden; border-radius: 22px; background: var(--superficie); isolation: isolate; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; gap: 16px; padding: 22px; box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 6%, transparent); }
.ec-quadro > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; transition: transform 1.2s var(--saida); }
.ec-quadro:hover > img { transform: scale(1.035); }
.ec-quadro::after { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, color-mix(in oklab, var(--background) 10%, transparent) 30%, color-mix(in oklab, var(--background) 88%, transparent) 100%); }
.ec-quadro.so-texto::after { display: none; }
.ec-frase { font-family: var(--font-titulo); font-size: clamp(20px, 2vw, 28px); line-height: 1.15; letter-spacing: -.03em; font-weight: 500; margin: 0; max-width: 22ch; text-wrap: balance; }
.ec-mosaico { padding-top: clamp(96px, 12vw, 160px); display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 5fr) minmax(0, 3fr); grid-template-rows: minmax(300px, auto) minmax(300px, auto); gap: 12px; }
.ec-m1 { grid-row: 1 / 3; min-height: 620px; }
.ec-m1 > img { object-position: 60% 50%; }
.ec-m4 { grid-column: 2 / 3; }
.ec-numero b { display: block; font-family: var(--font-titulo); font-size: clamp(64px, 7vw, 108px); font-weight: 400; letter-spacing: -.06em; line-height: .9; font-variant-numeric: tabular-nums; }
.ec-numero p { margin: 10px 0 0; color: color-mix(in oklab, var(--foreground) 76%, transparent); max-width: 30ch; line-height: 1.45; }

.ec-banner { margin-top: clamp(112px, 14vw, 200px); min-height: clamp(360px, 46vw, 560px); justify-content: flex-end; padding: clamp(24px, 4vw, 48px); }
.ec-banner > img { object-position: 50% 30%; }
.ec-banner h2 { font-family: var(--font-titulo); font-size: clamp(36px, 5.6vw, 84px); line-height: .95; letter-spacing: -.05em; font-weight: 600; margin: 12px 0 0; max-width: 14ch; }
.ec-posteres { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
.ec-brasa { background: radial-gradient(90% 120% at 100% 0%, color-mix(in oklab, var(--brand) 34%, transparent), transparent 60%), var(--superficie); }
.ec-brasa::after { display: none; }
.ec-poster { min-height: 300px; background: radial-gradient(120% 90% at var(--px, 80%) var(--py, 0%), color-mix(in oklab, var(--brand) 26%, transparent), transparent 62%), var(--superficie); }
.ec-poster::after { display: none; }
.ec-poster .ec-idx { font-family: var(--font-titulo); font-size: clamp(64px, 7vw, 104px); font-weight: 300; letter-spacing: -.07em; line-height: .8; color: color-mix(in oklab, var(--foreground) 16%, transparent); }
.ec-poster h3 { font-family: var(--font-titulo); font-size: clamp(26px, 2.6vw, 36px); letter-spacing: -.04em; font-weight: 600; margin: 0; }
.ec-poster p { margin: 6px 0 0; color: color-mix(in oklab, var(--foreground) 74%, transparent); line-height: 1.45; font-size: 15px; }

.ec-passos { margin-top: 12px; display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 12px; }
.ec-passos .ec-quadro { min-height: 360px; }
.ec-lista-passos { list-style: none; margin: 0; padding: 0; display: grid; gap: 22px; }
.ec-lista-passos b { display: block; font-family: var(--font-titulo); font-size: 20px; letter-spacing: -.02em; font-weight: 600; }
.ec-lista-passos span { color: var(--muted); line-height: 1.5; }

.ec-video { margin-top: clamp(112px, 14vw, 200px); }
.ec-video-cab { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 16px 40px; margin-bottom: 24px; }
.ec-video-cab h2 { font-family: var(--font-titulo); font-size: clamp(36px, 5vw, 72px); line-height: .95; letter-spacing: -.05em; font-weight: 600; margin: 10px 0 0; }
.ec-video-cab p { color: var(--muted); max-width: 40ch; line-height: 1.6; }
.ec-video-moldura { border-radius: 26px; overflow: hidden; }

.ec-fecho { padding-block: clamp(112px, 14vw, 200px) 96px; }
.ec-fecho-grade { display: grid; gap: 12px; }
.ec-fecho h2 { font-family: var(--font-titulo); font-size: clamp(40px, 5.6vw, 84px); line-height: .95; letter-spacing: -.05em; font-weight: 600; margin: 12px 0 0; max-width: 12ch; }
.ec-fecho-texto p { color: var(--muted); line-height: 1.6; max-width: 52ch; }
.ec-fecho-texto p + p { margin-top: 10px; font-size: 14px; }
.ec-quadro.ec-montador { padding: clamp(20px, 3vw, 36px); gap: 28px; }
.ec-confianca { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px 32px; margin: 0; }
.ec-confianca dt { font-weight: 600; font-family: var(--font-titulo); font-size: 18px; letter-spacing: -.02em; }
.ec-confianca dd { margin: 6px 0 0; color: var(--muted); font-size: 15px; line-height: 1.55; overflow-wrap: anywhere; }
.ec-fontes { display: flex; flex-wrap: wrap; gap: 6px 22px; font-size: 13.5px; }
.ec-fontes a { color: var(--muted); text-decoration: none; } .ec-fontes a:hover { color: var(--foreground); }

@media (max-width: 899px) {
  .ec-mosaico { grid-template-columns: 1fr; grid-template-rows: none; }
  .ec-m1 { grid-row: auto; min-height: 460px; }
  .ec-m4 { grid-column: auto; }
  .ec-mosaico > .ec-quadro { min-height: 280px; }
  .ec-posteres, .ec-passos, .ec-confianca { grid-template-columns: 1fr; }
  .ec-brasa { background: radial-gradient(90% 120% at 100% 0%, color-mix(in oklab, var(--brand) 34%, transparent), transparent 60%), var(--superficie); }
.ec-brasa::after { display: none; }
.ec-poster { min-height: 220px; }
}
@media (prefers-reduced-motion: reduce) { .ec-quadro > img { transition: none; } }
`;

const POS = [["85%", "0%"], ["10%", "0%"], ["50%", "100%"], ["90%", "100%"], ["15%", "100%"], ["60%", "0%"]];

export default function EstruturaC({ cidade, chave }: { cidade: CidadeDoMontador; chave: string }) {
  const n = numerosDoBrasil();
  const modulos = modulosAbaixo();
  const conferido = new Date(`${n.conferidoEm}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <div className="ec">
      <style href="cidadeia-estrutura-c" precedence="medium">{ESTILO}</style>

      <section className="ec-largura ec-mosaico" aria-label="O que é o CidadeIA">
        <article className="ec-quadro ec-m1">
          <Image src="/estrutura/mapa.webp" alt="" fill sizes="(max-width: 899px) 100vw, 400px" />
          <span className="ec-rot">Sua cidade</span>
          <p className="ec-frase">Comece pela sua cidade. Ela acende no mapa e os números dela abrem na hora.</p>
        </article>
        <article className="ec-quadro">
          <Image src="/estrutura/painel.webp" alt="" fill sizes="(max-width: 899px) 100vw, 500px" />
          <span />
          <p className="ec-frase">O prefeito vê a prefeitura inteira, numa tela.</p>
        </article>
        <article className="ec-quadro so-texto">
          <span className="ec-rot">O que é</span>
          <p className="ec-frase" style={{ fontSize: "clamp(18px, 1.6vw, 22px)" }}>A gestão municipal inteira, num lugar só. Lê o que é público, confere com a lei e entrega o trabalho pronto.</p>
        </article>
        <article className="ec-quadro ec-m4 ec-brasa">
          <span className="ec-rot">Tesouro Nacional · {conferido}</span>
          <div className="ec-numero">
            <b>{n.texto.passaramDoAlerta}</b>
            <p>prefeituras passaram do limite de alerta da despesa com pessoal, de {n.texto.comRgf} com o RGF lido.</p>
          </div>
        </article>
        <article className="ec-quadro">
          <Image src="/estrutura/celular.webp" alt="" fill sizes="(max-width: 899px) 100vw, 300px" />
          <span className="ec-rot">Portal do cidadão</span>
          <p className="ec-frase">O morador fala com a prefeitura pelo celular.</p>
        </article>
      </section>

      <section id="solucoes" className="ec-largura scroll-mt-24" aria-labelledby="ec-titulo-modulos">
        <article className="ec-quadro ec-banner">
          <Image src="/estrutura/modulos.webp" alt="" fill sizes="100vw" />
          <span className="ec-rot">Módulos</span>
          <h2 id="ec-titulo-modulos">Um módulo para cada parte da prefeitura.</h2>
        </article>
        <div className="ec-posteres">
          {modulos.map((m, i) => (
            <article key={m.chave} className="ec-quadro ec-poster" style={{ ["--px" as string]: POS[i][0], ["--py" as string]: POS[i][1] }}>
              <span className="ec-idx" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3>{m.nome}</h3>
                <p>{m.pergunta}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="ec-passos">
          <article className="ec-quadro so-texto">
            <span className="ec-rot">Como funciona</span>
            <p className="ec-frase" style={{ fontSize: "clamp(28px, 3vw, 44px)" }}>Do dado público ao trabalho feito.</p>
          </article>
          <article className="ec-quadro so-texto">
            <ol className="ec-lista-passos">
              {PASSOS.map((p) => (
                <li key={p.titulo}><b>{p.titulo}</b><span>{p.texto}</span></li>
              ))}
            </ol>
            <div className="ec-fontes" aria-label="Bases oficiais lidas">
              {FONTES_ABAIXO.map((f) => <a key={f.nome} href={f.link} target="_blank" rel="noopener noreferrer">{f.nome}</a>)}
            </div>
          </article>
        </div>
      </section>

      <section id="video" className="ec-largura ec-video scroll-mt-24" aria-labelledby="ec-titulo-video">
        <div className="ec-video-cab">
          <div>
            <span className="ec-rot">Em vídeo</span>
            <h2 id="ec-titulo-video">O CidadeIA em 30 segundos.</h2>
          </div>
          <p>Do atendimento ao gabinete, do celular do morador às bases oficiais. Para assistir agora ou mandar para quem decide.</p>
        </div>
        <div className="ec-video-moldura"><Video /></div>
      </section>

      <section id="proposta" className="ec-largura ec-fecho scroll-mt-24" aria-labelledby="ec-titulo-fecho">
        <div className="ec-fecho-grade">
          <article className="ec-quadro so-texto ec-montador">
            <div className="ec-fecho-texto">
              <span className="ec-rot">Proposta</span>
              <h2 id="ec-titulo-fecho">Pronta em um dia útil.</h2>
              <p style={{ marginTop: 18 }}>Escolha o município e os módulos. Valor, termo de referência e minuta de contrato chegam no mesmo e-mail, sem reunião antes.</p>
              <p><LinhaDaDispensa /></p>
            </div>
            <Montador cidade={cidade} chave={chave} />
          </article>
          <article className="ec-quadro so-texto" style={{ justifyContent: "flex-start" }}>
            <span className="ec-rot">Antes de assinar</span>
            <Confianca className="ec-confianca" />
          </article>
        </div>
      </section>
    </div>
  );
}
