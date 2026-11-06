import type { ReactNode } from "react";
import PerguntasQueTrocam from "./PerguntasQueTrocam";
import BrasilRelevo, { type CidadeNoMapa } from "./BrasilRelevo";

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
/* O mapa some no fundo por máscara, e não por uma faixa pintada por cima:
   assim não há cor nenhuma para não bater com a seção de baixo. */
.topo3d::after { content: none; }
.topo3d-palco { position: absolute; inset: 0; container-type: size; }
/* O cartaz: o mapa já pronto, em imagem, na tela desde o primeiro desenho
   (pedido do fundador: "assim que o cliente triscar"); antes dela, o vídeo
   do Brasil crescendo do plano (BrasilRelevo.tsx, ENTRADA_CARTAZ).
   A cena 3D monta por cima em ~2 s, no mesmo enquadramento: a imagem é
   um quadro dela, e cresce como ela, pelo tamanho do Brasil na tela
   (brasil-relevo-cena.ts, enquadrar: mapaPx). Tirada a 1440x830, onde o
   Brasil mede 744 px; no celular, a 390x420, onde mede 98% da largura. */
.topo3d-cartaz { position: absolute; inset: 0; overflow: hidden; pointer-events: none; -webkit-mask-image: linear-gradient(to bottom, black 68%, transparent 100%); mask-image: linear-gradient(to bottom, black 68%, transparent 100%); }
.topo3d-cartaz img, .topo3d-cartaz video { position: absolute; left: 50%; top: 50%; max-width: none; height: auto; translate: -50% -50%; width: calc(1440 / 744 * min(min(100cqw, 1200px) * 0.62, 92cqh)); opacity: 0; /* a entrada (BrasilRelevo.tsx, ENTRADA_CARTAZ) traz para 1 */
  /* Só o país: o chão da imagem some em volta dele, sem quina de retângulo. */
  -webkit-mask-image: radial-gradient(ellipse 34% 44% at 53.5% 64%, black 78%, transparent 100%); mask-image: radial-gradient(ellipse 34% 44% at 53.5% 64%, black 78%, transparent 100%); }
.topo3d-palco[data-pronto] .topo3d-cartaz { visibility: hidden; transition: visibility 0s 800ms; }
.topo3d-tela { -webkit-mask-image: linear-gradient(to bottom, black 68%, transparent 100%); mask-image: linear-gradient(to bottom, black 68%, transparent 100%); }
.topo3d-tela { display: block; width: 100%; height: 100%; opacity: 0; transition: opacity 700ms var(--saida); }
.topo3d-palco[data-pronto] .topo3d-tela { opacity: 1; }
.topo3d-palco[data-gira] .topo3d-tela { cursor: grab; }
.topo3d-palco[data-gira] .topo3d-tela:active { cursor: grabbing; }
.topo3d-dentro { position: relative; z-index: 4; height: 100%; max-width: 1200px; margin: 0 auto; padding-inline: 16px; pointer-events: none; }
.topo3d-dentro a { pointer-events: auto; }
.topo3d-tese { position: absolute; top: clamp(36px, 6vh, 64px); max-width: 36rem; }
.topo3d-sobre { display: flex; align-items: center; gap: 10px; font-size: 11.5px; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
.topo3d-sobre i { width: 6px; height: 6px; border-radius: 9px; background: var(--brand-claro); box-shadow: 0 0 12px var(--brand); }
.topo3d-titulo { margin: 18px 0 0; font-family: var(--font-titulo); font-weight: 600; font-size: clamp(2.4rem, 4.2vw, 4.1rem); line-height: 0.96; letter-spacing: -0.05em; }
.topo3d-titulo .perguntas-b { text-align: left; color: var(--brand-claro); }
/* A resposta às perguntas: o posicionamento, visível (o h1 já o lê). */
.topo3d-resposta { margin: 14px 0 0; font-family: var(--font-titulo); font-weight: 500; font-size: clamp(1.15rem, 1.7vw, 1.55rem); line-height: 1.2; letter-spacing: -0.02em; color: var(--foreground); }
/* Acima da pílula (z 3): a lista de sugestões abre por cima do mapa. */
.topo3d-busca { pointer-events: auto; margin-top: 24px; max-width: 26rem; }
.topo3d-busca-nota { margin-top: 10px; font-size: 13px; line-height: 1.45; color: color-mix(in oklab, var(--foreground) 72%, transparent); }
.topo3d-lados { position: absolute; left: 16px; right: 16px; bottom: 19%; display: flex; justify-content: space-between; gap: 24px; }
.topo3d-lado { max-width: 15rem; font-size: 14.5px; line-height: 1.5; color: var(--foreground); }
.topo3d-lado + .topo3d-lado { text-align: right; }
.topo3d-lado small { display: block; margin-bottom: 8px; font-size: 11px; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
.topo3d-pilula {
  position: absolute; left: 50%; bottom: 13%; z-index: 3; transform: translateX(-50%);
  display: inline-flex; align-items: center; gap: 12px; padding: 6px 6px 6px 22px; border-radius: 9999px;
  color: var(--foreground); font-size: 14.5px; font-weight: 600; white-space: nowrap;
  transition: transform 180ms var(--saida);
}
.topo3d-pilula.liquido { position: absolute; }
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
  display: inline-flex; flex-direction: column; align-items: flex-start; gap: 3px; padding: 8px 13px 8px 11px; border-radius: 14px;
  background: color-mix(in oklab, var(--background) 72%, transparent); border: 1px solid color-mix(in oklab, var(--localizacao) 35%, transparent);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  font-size: 12.5px; white-space: nowrap; color: var(--foreground);
  max-width: calc(100% - 16px);
  opacity: 0; transition: opacity 500ms var(--saida); will-change: transform;
}
.topo3d-voce[data-visivel] { opacity: 1; }
.topo3d-voce b { font-weight: 600; }
.topo3d-voce-linha { display: inline-flex; align-items: center; gap: 8px; max-width: 100%; }
.topo3d-voce-linha > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
/* O número da prefeitura de quem abriu o site (app/api/onde-estou). */
.topo3d-voce-numero { padding-left: 15px; font-size: 12px; color: color-mix(in oklab, var(--foreground) 78%, transparent); }
.topo3d-voce-numero b { color: var(--brand-legivel); }
.topo3d-voce-trocar { pointer-events: auto; margin-left: 15px; padding: 2px 0; border: 0; background: none; font: inherit; font-size: 11.5px; color: var(--muted); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.topo3d-voce-trocar:hover { color: var(--foreground); }
/* O ponto da cidade sobre o cartaz, até a cena 3D (que desenha o dela). */
.topo3d-alvo { position: absolute; left: 0; top: 0; z-index: 2; width: 0; pointer-events: none; animation: topo3d-alvo-acende 600ms var(--saida) both; }
.topo3d-alvo-feixe { position: absolute; left: -1px; top: 0; width: 2px; border-radius: 2px; background: linear-gradient(to bottom, transparent, var(--localizacao)); opacity: 0.8; }
.topo3d-alvo-ponto { position: absolute; left: -5px; width: 10px; height: 10px; margin-top: -5px; border-radius: 9px; background: var(--localizacao); box-shadow: 0 0 0 4px color-mix(in oklab, var(--localizacao) 25%, transparent), 0 0 18px var(--localizacao); }
.topo3d-alvo-ponto::after { content: ""; position: absolute; inset: -4px; border-radius: 99px; border: 1px solid var(--localizacao); animation: topo3d-alvo-onda 2.6s ease-out infinite; }
@keyframes topo3d-alvo-acende { from { opacity: 0; } }
@keyframes topo3d-alvo-onda { from { transform: scale(1); opacity: 0.8; } to { transform: scale(4.5); opacity: 0; } }
.topo3d-palco[data-pronto] .topo3d-alvo { visibility: hidden; transition: visibility 0s 800ms; }
@media (min-width: 640px) {
  .topo3d-dentro { padding-inline: 32px; }
  .topo3d-lados { left: 32px; right: 32px; }
  .topo3d-rodape { left: max(32px, calc((100% - 1200px) / 2 + 32px)); right: max(32px, calc((100% - 1200px) / 2 + 32px)); }
}
@media (max-width: 859px) {
  .topo3d { height: auto; display: flex; flex-direction: column; }
  .topo3d::after { display: none; }
  .topo3d-dentro { display: contents; }
  .topo3d-tese { order: 1; position: relative; top: 0; z-index: 4; padding: 28px 16px 0; }
  .topo3d-titulo { min-height: calc(3 * 0.96em); }
  .topo3d-busca { margin-top: 22px; max-width: none; }
  .topo3d-palco { order: 2; position: relative; height: 420px; margin-top: -64px; }
  .topo3d-cartaz img, .topo3d-cartaz video { width: 100cqw; -webkit-mask-image: radial-gradient(ellipse 54% 38% at 47.5% 52%, black 80%, transparent 100%); mask-image: radial-gradient(ellipse 54% 38% at 47.5% 52%, black 80%, transparent 100%); }
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
  .topo3d-alvo, .topo3d-alvo-ponto::after { animation: none; }
}
`;

// ── A BUSCA NO TOPO (novembro de 2026) ──
// A auditoria de conversão achou o Raio-X grátis, o convite que pede menos de
// quem chega frio, abaixo da primeira tela no celular (390x844) e no
// computador (1366x800). Ele sobe para baixo do título; o mapa, a pílula de
// proposta e as frases ficam onde estavam. A busca vem pronta da home
// (page.tsx), que é quem sabe a cidade escolhida.
export default function TopoBrasil({ busca, cidade = null }: { busca?: ReactNode; cidade?: CidadeNoMapa | null }) {
  return (
    <section className="topo3d" aria-labelledby="topo3d-titulo">
      <style href="cidadeia-topo3d" precedence="medium">{ESTILO}</style>
      <BrasilRelevo cidade={cidade} />
      <div className="topo3d-dentro">
        <div className="topo3d-tese">
          <p className="topo3d-sobre"><i aria-hidden />Lê · Confere · Resolve</p>
          {/* O h1 tem o texto de sempre para o leitor de tela e o buscador;
              as perguntas que trocam são o desenho (aria-hidden). */}
          <h1 id="topo3d-titulo" className="topo3d-titulo">
            <span className="sr-only">A gestão municipal inteira, num lugar só.</span>
            <PerguntasQueTrocam />
          </h1>
          <p className="topo3d-resposta" aria-hidden>A gestão municipal inteira, num lugar só.</p>
          {busca && <div className="topo3d-busca">{busca}</div>}
        </div>
        <div className="topo3d-lados">
          <p className="topo3d-lado">
            <small>O que a IA faz</small>
            Lê o que é público e confere com a lei. Não lança nem altera nada na contabilidade da prefeitura.
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
