import PerguntasQueTrocam from "./PerguntasQueTrocam";
import BrasilRelevo from "./BrasilRelevo";

// ── O TOPO DA HOME: O BRASIL EM RELEVO (novembro de 2026) ──
//
// Aprovado pelo fundador a partir do protótipo "Brasil 3D do CidadeIA", no
// lugar do planeta: o Brasil esculpido em grafite no meio da tela, as
// capitais acendendo e apagando em roxo, o visitante em azul, o título com as
// perguntas que trocam no alto à esquerda, uma frase curta de cada lado e a
// pílula de ação pousada no mapa. No celular: título, mapa e as duas frases
// embaixo, nessa ordem.
//
// O texto vem do servidor (é o maior conteúdo e a primeira pintura); o mapa
// chega depois (BrasilRelevo.tsx). O estilo vai junto com o componente, e não
// em globals.css, que está no limite em que o Turbopack divide a folha
// (CLAUDE.md, armadilhas). Só tokens de cor: tests/design-system.test.ts.

const ESTILO = `
.topo3d { position: relative; height: clamp(600px, calc(100svh - 70px), 900px); overflow: hidden; }
.topo3d::after { content: ""; position: absolute; inset: auto 0 0 0; height: 180px; background: linear-gradient(transparent, var(--background)); pointer-events: none; z-index: 1; }
.topo3d-palco { position: absolute; inset: 0; }
.topo3d-tela { display: block; width: 100%; height: 100%; opacity: 0; transition: opacity 700ms var(--saida); }
.topo3d-palco[data-pronto] .topo3d-tela { opacity: 1; }
.topo3d-palco[data-gira] .topo3d-tela { cursor: grab; }
.topo3d-palco[data-gira] .topo3d-tela:active { cursor: grabbing; }
.topo3d-dentro { position: relative; z-index: 2; height: 100%; max-width: 1200px; margin: 0 auto; padding-inline: 16px; pointer-events: none; }
.topo3d-dentro a { pointer-events: auto; }
.topo3d-tese { position: absolute; top: clamp(36px, 6vh, 64px); max-width: 36rem; }
.topo3d-sobre { display: flex; align-items: center; gap: 10px; font-size: 11.5px; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
.topo3d-sobre i { width: 6px; height: 6px; border-radius: 9px; background: var(--brand-claro); box-shadow: 0 0 12px var(--brand); }
.topo3d-titulo { margin: 18px 0 0; font-family: var(--font-titulo); font-weight: 600; font-size: clamp(2.4rem, 4.2vw, 4.1rem); line-height: 0.96; letter-spacing: -0.05em; }
.topo3d-titulo .perguntas-b { text-align: left; color: var(--brand-claro); }
.topo3d-lados { position: absolute; left: 16px; right: 16px; bottom: 19%; display: flex; justify-content: space-between; gap: 24px; }
.topo3d-lado { max-width: 15rem; font-size: 14.5px; line-height: 1.5; color: var(--foreground); }
.topo3d-lado + .topo3d-lado { text-align: right; }
.topo3d-lado small { display: block; margin-bottom: 8px; font-size: 11px; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
.topo3d-pilula {
  position: absolute; left: 50%; bottom: 13%; z-index: 3; transform: translateX(-50%);
  display: inline-flex; align-items: center; gap: 12px; padding: 6px 6px 6px 22px; border-radius: 9999px;
  background: var(--foreground); color: var(--background); font-size: 14.5px; font-weight: 600; white-space: nowrap;
  box-shadow: 0 18px 50px -12px color-mix(in oklab, var(--brand) 75%, transparent), 0 0 0 6px color-mix(in oklab, var(--foreground) 6%, transparent);
  transition: transform 180ms var(--saida);
}
.topo3d-pilula:active { transform: translateX(-50%) scale(0.97); }
.topo3d-pilula:focus-visible { outline: 2px solid var(--brand-claro); outline-offset: 3px; }
.topo3d-seta { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 9999px; background: var(--brand); color: var(--sobre-forte, var(--foreground)); transition: transform 180ms var(--saida); }
@media (hover: hover) and (pointer: fine) { .topo3d-pilula:hover .topo3d-seta { transform: translateX(2px); } }
.topo3d-rodape { position: absolute; z-index: 3; left: max(16px, calc((100% - 1200px) / 2 + 16px)); right: max(16px, calc((100% - 1200px) / 2 + 16px)); bottom: 26px; display: flex; justify-content: space-between; gap: 16px; font-size: 11px; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); pointer-events: none; }
.topo3d-legenda { display: inline-flex; align-items: center; gap: 18px; }
.topo3d-legenda > span { display: inline-flex; align-items: center; gap: 8px; }
.topo3d-ponto-voce, .topo3d-ponto-cap { display: inline-block; flex: none; width: 7px; height: 7px; border-radius: 9px; }
.topo3d-ponto-voce { background: var(--localizacao); box-shadow: 0 0 0 3px color-mix(in oklab, var(--localizacao) 25%, transparent), 0 0 12px var(--localizacao); }
.topo3d-ponto-cap { background: var(--brand-claro); box-shadow: 0 0 10px var(--brand); }
.topo3d-voce {
  position: absolute; left: 0; top: 0; z-index: 3; pointer-events: none;
  display: inline-flex; align-items: center; gap: 8px; padding: 7px 12px 7px 10px; border-radius: 9999px;
  background: color-mix(in oklab, var(--background) 72%, transparent); border: 1px solid color-mix(in oklab, var(--localizacao) 35%, transparent);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  font-size: 12.5px; white-space: nowrap; color: var(--foreground);
  max-width: calc(100% - 16px);
  opacity: 0; transition: opacity 500ms var(--saida); will-change: transform;
}
.topo3d-voce[data-visivel] { opacity: 1; }
.topo3d-voce b { font-weight: 600; }
.topo3d-voce > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
@media (min-width: 640px) {
  .topo3d-dentro { padding-inline: 32px; }
  .topo3d-lados { left: 32px; right: 32px; }
  .topo3d-rodape { left: max(32px, calc((100% - 1200px) / 2 + 32px)); right: max(32px, calc((100% - 1200px) / 2 + 32px)); }
}
@media (max-width: 859px) {
  .topo3d { height: auto; display: flex; flex-direction: column; }
  .topo3d::after { display: none; }
  .topo3d-dentro { display: contents; }
  .topo3d-tese { order: 1; position: relative; top: 0; z-index: 2; padding: 28px 16px 0; }
  .topo3d-titulo { min-height: calc(3 * 0.96em); }
  .topo3d-palco { order: 2; position: relative; height: 420px; margin-top: -64px; }
  .topo3d-pilula { bottom: 30px; }
  .topo3d-lados { order: 3; position: relative; inset: auto; z-index: 2; flex-direction: column; gap: 20px; padding: 6px 16px 28px; }
  .topo3d-lado { max-width: none; }
  .topo3d-lado + .topo3d-lado { text-align: left; }
  .topo3d-rodape { display: none; }
}
@media (min-width: 640px) and (max-width: 859px) {
  .topo3d-tese { padding-inline: 32px; }
  .topo3d-lados { padding-inline: 32px; }
}
@media (prefers-reduced-motion: reduce) {
  .topo3d-tela, .topo3d-voce { transition: none; }
}
`;

export default function TopoBrasil() {
  return (
    <section className="topo3d" aria-labelledby="topo3d-titulo">
      <style href="cidadeia-topo3d" precedence="medium">{ESTILO}</style>
      <BrasilRelevo />
      <div className="topo3d-dentro">
        <div className="topo3d-tese">
          <p className="topo3d-sobre"><i aria-hidden />Lê · Confere · Resolve</p>
          {/* O h1 tem o texto de sempre para o leitor de tela e o buscador;
              as perguntas que trocam são o desenho (aria-hidden). */}
          <h1 id="topo3d-titulo" className="topo3d-titulo">
            <span className="sr-only">A gestão municipal inteira, num lugar só.</span>
            <PerguntasQueTrocam />
          </h1>
        </div>
        <div className="topo3d-lados">
          <p className="topo3d-lado">
            <small>Num lugar só</small>
            Atendimento, secretarias, obras, saúde, educação e finanças num sistema que lê as bases oficiais.
          </p>
          <p className="topo3d-lado">
            <small>Sob consulta</small>
            Proposta com valor, kit e base legal no mesmo e-mail. Antes de vencer.
          </p>
        </div>
      </div>
    </section>
  );
}
