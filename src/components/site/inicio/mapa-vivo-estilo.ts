// ── O ESTILO DO MAPA VIVO ──
//
// Marcadores, alertas e o farol do visitante (MapaVivo.tsx). Moravam em
// globals.css, mas a folha global está no limite em que o Turbopack a
// divide e a home abre mais devagar (CLAUDE.md, armadilhas). Aqui o estilo
// vai junto com o componente: na home, o mapa só carrega depois do load, e
// este CSS chega com ele, sem bloquear a primeira pintura. O React 19 põe o
// <style> no <head> uma vez só (href + precedence), por mais mapas que haja.
//
// O que cada parte faz:
// - o país acende quando o desenho fica pronto (data-pronto); no planeta,
//   entra com a onda que sai de Brasília (data-entrada), e os marcadores
//   esperam a onda passar (data-onda);
// - os marcadores são spans de tamanho zero, movidos só com transform;
// - os alertas acendem de uma vez, ficam acesos quase 4 s e apagam (antes
//   sumiam em 2,2 s e o fundador não chegava a ver a cor);
// - o visitante é um farol: ponto aceso e duas ondas de sonar alternadas (o
//   feixe com o nome da cidade, no planeta, é uma camada reta por cima:
//   PlanetaTopo.tsx);
// - no modo leve tudo para, menos o sonar do visitante (um elemento, só
//   composição); movimento reduzido pelo sistema para tudo.
// Só tokens de cor (var(--…)): tests/design-system.test.ts.

export const ESTILO_MAPA_VIVO = `
.mapa-visitante-ponto {
  width: 14px;
  height: 14px;
  margin: -7px 0 0 -7px;
  background: radial-gradient(circle at 38% 34%, var(--foreground) 0 16%, var(--localizacao) 52%);
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--foreground) 80%, transparent), 0 0 24px 7px color-mix(in oklab, var(--localizacao) 80%, transparent);
}
.mapa-visitante-anel {
  width: 88px;
  height: 88px;
  margin: -44px 0 0 -44px;
  border: 2px solid var(--localizacao);
  box-shadow: 0 0 14px color-mix(in oklab, var(--localizacao) 70%, transparent);
  opacity: 0;
  animation: mapa-sonar 2.8s var(--saida) infinite;
}
.mapa-visitante-anel + .mapa-visitante-anel { animation-delay: 1.4s; }
@keyframes mapa-sonar {
  from { opacity: 0.95; transform: scale(0.12); }
  70% { opacity: 0; }
  to { opacity: 0; transform: scale(1); }
}
.mapa-vivo[data-pronto]:not([data-entrada]) .mapa-vivo-pais {
  animation: mapa-acende 1.6s var(--saida) both;
}
.mapa-vivo[data-onda] .mapa-marcador { visibility: hidden; }
.mapa-onda {
  position: absolute;
  border-radius: 50%;
  border: 1.5px solid var(--brand-claro);
  box-shadow: 0 0 22px color-mix(in oklab, var(--brand-claro) 80%, transparent), inset 0 0 26px color-mix(in oklab, var(--brand-claro) 45%, transparent);
  pointer-events: none;
  animation: mapa-onda 2.6s cubic-bezier(0.45, 0, 0.55, 1) 0.15s both;
}
.mapa-onda[hidden] { display: none; }
@keyframes mapa-onda {
  from { transform: scale(0); opacity: 1; }
  75% { opacity: 0.85; }
  to { transform: scale(1); opacity: 0; }
}
@keyframes mapa-acende {
  from { opacity: 0.15; transform: scale(0.985); }
  to { opacity: 1; transform: none; }
}
.mapa-marcador {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}
.mapa-marcador[hidden] { display: none; }
.mapa-marcador > span {
  position: absolute;
  border-radius: 9999px;
}
.mapa-marcador[data-cor="medio"] { color: var(--medio); }
.mapa-marcador[data-cor="urgente"] { color: var(--urgente); }
.mapa-marcador[data-cor="info"] { color: var(--info); }
.mapa-alerta-ponto {
  width: 8px;
  height: 8px;
  margin: -4px 0 0 -4px;
  background: currentColor;
  box-shadow: 0 0 10px 2px currentColor;
  opacity: 0;
  animation: mapa-alerta-vida 4.6s var(--saida) infinite;
  animation-delay: var(--atraso, 0s);
}
.mapa-alerta-anel {
  width: 64px;
  height: 64px;
  margin: -32px 0 0 -32px;
  border: 1.5px solid currentColor;
  opacity: 0;
  animation: mapa-alerta-onda 4.6s ease-out infinite;
  animation-delay: var(--atraso, 0s);
}
@keyframes mapa-alerta-vida {
  0% { opacity: 0; transform: scale(0.2); }
  8% { opacity: 1; transform: scale(1.4); }
  16% { transform: scale(1); }
  80% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.6); }
}
@keyframes mapa-alerta-onda {
  0% { opacity: 0.95; transform: scale(0.1); }
  42%, 100% { opacity: 0; transform: scale(1); }
}
.mapa-destaque-ponto {
  width: 7px;
  height: 7px;
  margin: -3.5px 0 0 -3.5px;
  background: var(--brand-claro);
}
.mapa-destaque-anel {
  width: 28px;
  height: 28px;
  margin: -14px 0 0 -14px;
  border: 1.5px solid var(--brand-claro);
  animation: mapa-respira 3.1s ease-in-out infinite alternate;
}
@keyframes mapa-respira {
  from { opacity: 0.25; transform: scale(0.65); }
  to { opacity: 0.6; transform: scale(1); }
}
.mapa-voce-ponto {
  width: 9px;
  height: 9px;
  margin: -4.5px 0 0 -4.5px;
  background: var(--localizacao);
  box-shadow: 0 0 0 1.5px var(--foreground);
}
.mapa-voce-anel {
  width: var(--anel, 18px);
  height: var(--anel, 18px);
  margin: calc(var(--anel, 18px) / -2) 0 0 calc(var(--anel, 18px) / -2);
  background: color-mix(in oklab, var(--localizacao) 16%, transparent);
  border: 1px solid color-mix(in oklab, var(--localizacao) 55%, transparent);
}
.mapa-vivo[data-visivel="0"] .mapa-marcador > span {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  .mapa-vivo-pais,
  .mapa-destaque-anel {
    animation: none;
  }
  .mapa-marcador[data-mapa="alerta"] { display: none; }
}
@media (prefers-reduced-motion: no-preference) {
  html[data-leve] .mapa-visitante-anel { animation: mapa-sonar 2.8s var(--saida) infinite !important; }
  html[data-leve] .mapa-visitante-anel + .mapa-visitante-anel { animation-delay: 1.4s !important; }
}
@media (prefers-reduced-motion: reduce) {
  .mapa-visitante-anel { animation: none; opacity: 0.5; transform: scale(0.6); }
}
`;
