import Image from "next/image";
import Link from "next/link";
import { FONTES_ABAIXO, modulosAbaixo, numerosDoBrasil, PASSOS } from "./dados";
import EstruturaB from "./EstruturaB";
import EstruturaC from "./EstruturaC";
import Carrossel from "./Carrossel";
import type { CidadeDoMontador } from "./Pecas";

// ── ESTRUTURA D · B + C COM O CARROSSEL (nov/2026) ──
// O fundador escolheu juntar as duas: o mosaico de cinema do C abre, os
// módulos correm num carrossel no jeito da vitrine da Apple Store, e o fecho
// é a proposta do B. A abertura com os números e o mapa da LRF do B saíram a
// pedido dele. As peças de B e C são as mesmas (partes=...).

const ESTILO = `
.ed .ec-mosaico { padding-top: clamp(8px, 1.5vw, 24px); }
.ed .eb-fecho { padding-bottom: 24px; }
.car { padding-top: clamp(112px, 14vw, 200px); }
.car-cab { max-width: 1200px; margin-inline: auto; padding-inline: 16px; margin-bottom: 22px; }
@media (min-width: 640px) { .car-cab { padding-inline: 32px; } }
.car-cab h2 { font-family: var(--font-titulo); font-size: clamp(28px, 3.2vw, 44px); line-height: 1.08; letter-spacing: -.035em; font-weight: 600; margin: 0; text-wrap: balance; }
.car-cab h2 span { color: var(--muted); }
.car-trilho { --entrada: max(16px, calc((100vw - 1200px) / 2 + 32px)); display: flex; gap: 20px; overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding-inline: var(--entrada); padding: 8px var(--entrada) 28px; scrollbar-width: none; overscroll-behavior-x: contain; }
.car-trilho::-webkit-scrollbar { display: none; }
.car-trilho:focus-visible { outline: 2px solid var(--brand-claro); outline-offset: -2px; }
.car-cartao { position: relative; flex: 0 0 clamp(290px, 30vw, 420px); height: clamp(460px, 38vw, 540px); scroll-snap-align: start; border-radius: 28px; overflow: hidden; isolation: isolate; background: var(--superficie); color: var(--foreground); padding: 32px 30px; display: flex; flex-direction: column; gap: 10px; text-decoration: none; box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 7%, transparent); transition: transform .5s var(--saida); }
@media (hover: hover) and (pointer: fine) { .car-cartao:hover { transform: scale(1.012); } }
.car-cartao.claro { background: var(--foreground); color: var(--background); box-shadow: none; }
.car-tag { font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--brand); }
.car-cartao h3 { font-family: var(--font-titulo); font-size: clamp(30px, 2.6vw, 38px); letter-spacing: -.035em; line-height: 1.02; font-weight: 600; margin: 4px 0 0; }
.car-q { font-weight: 600; font-size: 17px; line-height: 1.3; margin: 2px 0 0; max-width: 26ch; }
.car-linha { font-size: 15px; line-height: 1.4; opacity: .82; margin: 0; max-width: 30ch; }
.car-visual { position: absolute; left: 0; right: 0; bottom: 0; height: 56%; z-index: -1; display: grid; place-items: end center; }
.car-visual img { object-fit: cover; }
.car-visual.encaixe { left: 30px; right: 30px; bottom: 30px; height: 50%; border-radius: 16px; overflow: hidden; z-index: 0; box-shadow: 0 30px 60px -30px color-mix(in oklab, var(--background) 70%, transparent); }
.car-visual .car-img-celular { object-position: 50% 0%; }
.car-fragmento { width: calc(100% - 60px); margin: 0 30px 30px; border-radius: 18px; padding: 18px; display: grid; gap: 10px; font-size: 13px; background: color-mix(in oklab, var(--foreground) 6%, transparent); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 9%, transparent); }
.claro .car-fragmento { background: color-mix(in oklab, var(--background) 6%, transparent); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--background) 10%, transparent); }
.car-fragmento .lin { display: flex; justify-content: space-between; gap: 12px; }
.car-fragmento .mudo { opacity: .62; }
.car-fragmento .grande { font-family: var(--font-titulo); font-size: 40px; letter-spacing: -.045em; font-weight: 500; line-height: 1; font-variant-numeric: tabular-nums; }
.car-barras { display: flex; align-items: end; gap: 6px; height: 72px; }
.car-barras i { flex: 1; border-radius: 5px 5px 2px 2px; background: var(--brand); opacity: .9; }
.car-barras i.baixo { background: var(--urgente); }
.car-dias { display: grid; grid-template-columns: repeat(20, 1fr); gap: 3px; }
.car-dias i { height: 12px; border-radius: 3px; background: var(--brand); }
.car-dias i.v { background: color-mix(in oklab, var(--foreground) 12%, transparent); }
.car-trilha { height: 10px; border-radius: 9px; background: color-mix(in oklab, var(--foreground) 12%, transparent); overflow: hidden; }
.car-trilha i { display: block; height: 100%; border-radius: 9px; background: var(--brand); }
.car-mais { flex: 0 0 clamp(240px, 22vw, 300px); display: flex; flex-direction: column; justify-content: flex-end; }
.car-mais a { color: var(--foreground); }
.car-nav { max-width: 1200px; margin-inline: auto; padding-inline: 16px; display: flex; align-items: center; gap: 16px; margin-bottom: 18px; }
@media (min-width: 640px) { .car-nav { padding-inline: 32px; } }
.car-nomes { position: relative; flex: 1; min-width: 0; display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; margin-inline: -4px; padding: 4px; }
.car-nomes::-webkit-scrollbar { display: none; }
.car-nomes button { flex: none; display: inline-flex; align-items: baseline; gap: 8px; height: 40px; padding: 0 16px; border-radius: 999px; border: 0; background: transparent; color: var(--muted); font: inherit; font-size: 15px; font-weight: 500; cursor: pointer; box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 12%, transparent); transition: background-color .25s var(--saida), color .25s var(--saida), box-shadow .25s var(--saida); line-height: 40px; }
.car-num { font-size: 11px; font-weight: 600; letter-spacing: .06em; font-variant-numeric: tabular-nums; opacity: .7; }
@media (hover: hover) and (pointer: fine) { .car-nomes button:hover { color: var(--foreground); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 28%, transparent); } }
.car-nomes button.aceso { background: var(--foreground); color: var(--background); box-shadow: none; }
.car-nomes button.aceso .car-num { color: var(--brand); opacity: 1; }
.car-nomes button:focus-visible { outline: 2px solid var(--brand-claro); outline-offset: 2px; }
.car-setas { flex: none; display: flex; gap: 10px; }
.car-setas button { width: 44px; height: 44px; border-radius: 50%; border: 0; color: var(--foreground); font-size: 24px; line-height: 1; cursor: pointer; transition: opacity .2s; }
.car-setas button:disabled { opacity: .35; cursor: default; }
@media (max-width: 639px) { .car-setas { display: none; } .car-nomes { margin-inline: -16px; padding-inline: 16px; } .car-nomes button { height: 38px; line-height: 38px; padding: 0 14px; font-size: 14px; } }
.ed-passos { max-width: 1200px; margin-inline: auto; padding: clamp(96px, 12vw, 160px) 16px 0; display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 12px; }
@media (min-width: 640px) { .ed-passos { padding-inline: 32px; } }
.ed-passos .ec-quadro { min-height: 340px; }
@media (max-width: 899px) { .ed-passos { grid-template-columns: 1fr; } .car-cartao { flex-basis: 82vw; } }
@media (prefers-reduced-motion: reduce) { .car-cartao, .car-nomes button { transition: none; } }
`;

function Visual({ chave, obrasParadas }: { chave: string; obrasParadas: string }) {
  if (chave === "essencial")
    return (
      <div className="car-visual">
        <Image src="/estrutura/celular.webp" alt="" fill sizes="420px" className="car-img-celular" />
      </div>
    );
  if (chave === "gestao")
    return (
      <div className="car-visual encaixe">
        <Image src="/estrutura/painel.webp" alt="" fill sizes="420px" style={{ objectPosition: "0% 0%" }} />
      </div>
    );
  if (chave === "saude")
    return (
      <div className="car-visual">
        <div className="car-fragmento" aria-hidden>
          <div className="lin"><span>Estoque · UBS Centro</span><span className="mudo">Exemplo</span></div>
          <div className="car-barras"><i style={{ height: "82%" }} /><i style={{ height: "64%" }} /><i className="baixo" style={{ height: "14%" }} /><i style={{ height: "48%" }} /><i style={{ height: "90%" }} /><i style={{ height: "36%" }} /></div>
          <div className="lin"><span>Um item abaixo do mínimo</span><b>Repor</b></div>
        </div>
      </div>
    );
  if (chave === "educacao")
    return (
      <div className="car-visual">
        <div className="car-fragmento" aria-hidden>
          <div className="lin"><span>Dias letivos</span><span className="mudo">Exemplo</span></div>
          <div className="grande">142 de 200</div>
          <div className="car-dias">{Array.from({ length: 20 }, (_, i) => <i key={i} className={i < 14 ? undefined : "v"} />)}</div>
        </div>
      </div>
    );
  if (chave === "obras")
    return (
      <div className="car-visual">
        <div className="car-fragmento" aria-hidden>
          <div className="lin"><span>No país, hoje</span><span className="mudo">ObrasGov</span></div>
          <div className="grande">{obrasParadas}</div>
          <div className="lin"><span>obras paralisadas ou inacabadas</span></div>
          <div className="car-trilha"><i style={{ width: "62%" }} /></div>
        </div>
      </div>
    );
  return (
    <div className="car-visual">
      <div className="car-fragmento" aria-hidden>
        <div className="lin"><span>Contratações no ano</span><span className="mudo">Exemplo · PNCP</span></div>
        <div className="lin"><span>Material de expediente</span><b>Dispensa</b></div>
        <div className="lin"><span>Merenda escolar</span><b>Pregão</b></div>
        <div className="lin"><span>Manutenção de vias</span><b>Concorrência</b></div>
      </div>
    </div>
  );
}

export default function EstruturaD({ cidade, chave }: { cidade: CidadeDoMontador; chave: string }) {
  const n = numerosDoBrasil();
  const modulos = modulosAbaixo();
  const claros = new Set(["gestao", "licitacoes"]);
  return (
    <div className="ed">
      <style href="cidadeia-estrutura-d" precedence="medium">{ESTILO}</style>

      <EstruturaC cidade={cidade} chave={chave} partes={["mosaico"]} />

      <section id="solucoes" className="scroll-mt-24" aria-labelledby="ed-titulo-modulos">
        <Carrossel
          rotulo="Os seis módulos do CidadeIA"
          nomes={modulos.map((m) => m.nome)}
          titulo={<h2 id="ed-titulo-modulos">Os módulos. <span>Um para cada parte da prefeitura.</span></h2>}
        >
          {modulos.map((m, i) => (
            <Link key={m.chave} href={`/solucoes#${m.chave}`} className={`car-cartao${claros.has(m.chave) ? " claro" : ""}`}>
              <span className="car-tag">Módulo {String(i + 1).padStart(2, "0")}</span>
              <h3>{m.nome}</h3>
              <p className="car-q">{m.pergunta}</p>
              <p className="car-linha">{m.capacidades[0]}</p>
              <Visual chave={m.chave} obrasParadas={n.texto.obrasParadas} />
            </Link>
          ))}
          <div className="car-mais">
            <p className="car-linha">Cada módulo funciona sozinho: a prefeitura contrata só os que usa, sem pacote fechado e sem cobrança por usuário.</p>
            <p style={{ marginTop: 12 }}><Link href="/solucoes" className="underline underline-offset-4">Ver tudo o que cada um faz →</Link></p>
          </div>
        </Carrossel>
      </section>

      <section className="ed-passos" aria-label="Como funciona">
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
      </section>

      <EstruturaC cidade={cidade} chave={chave} partes={["video"]} />
      <EstruturaB cidade={cidade} chave={chave} partes={["fecho"]} />
    </div>
  );
}
