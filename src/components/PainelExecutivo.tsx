"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { carregarGoogleMaps } from "@/lib/google-maps";
import {
  COR_SITUACAO,
  NOME_SITUACAO,
  descricaoProgresso,
  type ObraNoMapa,
  type SituacaoNoMapa,
} from "@/lib/obras-no-mapa";

// ── PAINEL EXECUTIVO: AS OBRAS NO MAPA ──
//
// O MapaCidade (/dashboard/mapa) junta obra, escola e unidade de saúde sobre o
// OpenStreetMap. Aqui é o recorte que abre o painel do prefeito: só obras, com
// a cor dizendo a situação — em andamento, parada, concluída — sobre o Google
// Maps, que é o mapa que o gabinete já conhece do celular.
//
// Obra cadastrada só com bairro é procurada pelo Geocoding e aparece com o
// marcador vazado: a posição é o centro do bairro, não o canteiro, e o mapa
// não pode afirmar o que ninguém mediu.

const CHAVE = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
// Marcador avançado exige um Map ID. DEMO_MAP_ID é o do próprio Google para
// desenvolvimento; em produção, crie um no Cloud Console e defina a variável.
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

const SITUACOES: SituacaoNoMapa[] = ["andamento", "parada", "concluida"];

/** Teto de bairros procurados por visita: cada busca é cobrada pelo Google. */
const MAX_GEOCODIFICACOES = 25;

type Posicao = { lat: number; lng: number; aproximada: boolean };

// Cache do módulo: voltar ao painel na mesma sessão não paga a busca de novo.
const cacheBairros = new Map<string, google.maps.LatLngLiteral | null>();

const TIPOS_DE_BAIRRO = ["neighborhood", "sublocality", "sublocality_level_1", "sublocality_level_2"];

function marcador(cor: string, aproximada: boolean): HTMLElement {
  // SVG no DOM da página, não imagem: assim a cor é o token do tema, e uma
  // prefeitura atrás de firewall não fica com marcador quebrado.
  const el = document.createElement("div");
  el.style.lineHeight = "0";
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="24" height="32" aria-hidden="true">
      <path d="M12 1C5.9 1 1 5.9 1 12c0 7.8 11 19 11 19s11-11.2 11-19C23 5.9 18.1 1 12 1z"
            fill="${aproximada ? "var(--card)" : cor}" stroke="${aproximada ? cor : "var(--sobre-forte)"}"
            stroke-width="2" ${aproximada ? 'stroke-dasharray="3 2"' : ""}/>
      <circle cx="12" cy="12" r="4" fill="${aproximada ? cor : "var(--sobre-forte)"}"/>
    </svg>`;
  return el;
}

function conteudoBalao(o: ObraNoMapa, aproximada: boolean): HTMLElement {
  // textContent, nunca innerHTML: o nome da obra é digitado pela prefeitura.
  const raiz = document.createElement("div");
  raiz.style.cssText = "font-size:13px;line-height:1.45;max-width:240px;color:var(--foreground)";

  const nome = document.createElement("strong");
  nome.textContent = o.nome;
  raiz.appendChild(nome);

  const situacao = document.createElement("div");
  situacao.style.cssText = `color:${COR_SITUACAO[o.situacao]};font-weight:600;margin-top:2px`;
  situacao.textContent = NOME_SITUACAO[o.situacao];
  raiz.appendChild(situacao);

  const progresso = document.createElement("div");
  progresso.textContent = descricaoProgresso(o);
  raiz.appendChild(progresso);

  if (o.bairro || aproximada) {
    const local = document.createElement("div");
    local.style.color = "var(--muted)";
    local.textContent = aproximada ? `Posição aproximada: centro do bairro ${o.bairro}` : `Bairro ${o.bairro}`;
    raiz.appendChild(local);
  }
  return raiz;
}

type Carga = "carregando" | "pronto" | "erro" | "chave-recusada";

export default function PainelExecutivo({
  obras,
  municipio,
  estado,
  semLocal,
  planejadas,
}: {
  obras: ObraNoMapa[];
  municipio: string;
  estado: string;
  semLocal: number;
  planejadas: number;
}) {
  const divMapa = useRef<HTMLDivElement>(null);
  const mapa = useRef<google.maps.Map | null>(null);
  const balao = useRef<google.maps.InfoWindow | null>(null);
  const enquadradas = useRef(0);

  const [carga, setCarga] = useState<Carga>("carregando");
  const [ocultas, setOcultas] = useState<Set<SituacaoNoMapa>>(new Set());
  const [bairros, setBairros] = useState<Map<string, google.maps.LatLngLiteral | null>>(new Map());

  // 1. Carrega a API e cria o mapa.
  useEffect(() => {
    if (!CHAVE || obras.length === 0) return;
    let cancelado = false;

    // O Google chama esta função global quando recusa a chave (domínio fora
    // da restrição, API desligada, cobrança suspensa). Sem ela o mapa fica
    // cinza com uma marca d'água em inglês e ninguém sabe o porquê.
    const w = window as unknown as { gm_authFailure?: () => void };
    w.gm_authFailure = () => setCarga("chave-recusada");

    (async () => {
      try {
        await carregarGoogleMaps(CHAVE);
        const { Map: MapaGoogle, InfoWindow } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
        if (cancelado || !divMapa.current) return;
        mapa.current = new MapaGoogle(divMapa.current, {
          mapId: MAP_ID,
          center: { lat: -14.2, lng: -51.9 },
          zoom: 4,
          // Rolar a página não pode virar zoom no mapa sem querer.
          gestureHandling: "cooperative",
          clickableIcons: false,
          streetViewControl: false,
          mapTypeControl: false,
        });
        balao.current = new InfoWindow();
        setCarga("pronto");
      } catch (e) {
        console.error("[PainelExecutivo] falha ao carregar o Google Maps:", e);
        if (!cancelado) setCarga("erro");
      }
    })();

    return () => {
      cancelado = true;
      balao.current?.close();
    };
  }, [obras.length]);

  // 2. Procura no Geocoding as obras que só têm bairro.
  useEffect(() => {
    if (carga !== "pronto") return;
    const enderecos = Array.from(
      new Set(obras.filter((o) => o.latitude === null && o.bairro).map((o) => o.bairro!))
    ).slice(0, MAX_GEOCODIFICACOES);
    if (enderecos.length === 0) return;
    let cancelado = false;

    (async () => {
      const { Geocoder } = (await google.maps.importLibrary("geocoding")) as google.maps.GeocodingLibrary;
      const geocoder = new Geocoder();
      for (const bairro of enderecos) {
        const chave = `${bairro}|${municipio}|${estado}`;
        if (!cacheBairros.has(chave)) {
          try {
            const { results } = await geocoder.geocode({
              address: `${bairro}, ${municipio} - ${estado}, Brasil`,
              componentRestrictions: { country: "BR" },
            });
            // Só vale se o Google achou o BAIRRO. Quando ele não acha, devolve
            // o centro da cidade — e empilhar ali todas as obras sem endereço
            // seria desenhar um canteiro na praça da prefeitura.
            const achado = results.find((r) => r.types.some((t) => TIPOS_DE_BAIRRO.includes(t)));
            cacheBairros.set(chave, achado ? achado.geometry.location.toJSON() : null);
          } catch {
            cacheBairros.set(chave, null);
          }
        }
        if (cancelado) return;
        setBairros((atual) => new Map(atual).set(bairro, cacheBairros.get(chave) ?? null));
      }
    })().catch((e) => console.error("[PainelExecutivo] falha no Geocoding:", e));

    return () => {
      cancelado = true;
    };
  }, [carga, obras, municipio, estado]);

  const posicoes = useMemo(() => {
    const p = new Map<string, Posicao>();
    for (const o of obras) {
      if (o.latitude !== null && o.longitude !== null) {
        p.set(o.id, { lat: o.latitude, lng: o.longitude, aproximada: false });
      } else if (o.bairro) {
        const achado = bairros.get(o.bairro);
        if (achado) p.set(o.id, { ...achado, aproximada: true });
      }
    }
    return p;
  }, [obras, bairros]);

  // 3. Enquadra o município quando chegam posições novas (as do Geocoding
  //    chegam depois). Esconder uma situação na legenda não reenquadra: não
  //    pode tirar o prefeito de onde ele estava.
  useEffect(() => {
    if (carga !== "pronto" || !mapa.current || posicoes.size === 0) return;
    const limites = new google.maps.LatLngBounds();
    posicoes.forEach((p) => limites.extend(p));
    if (posicoes.size > enquadradas.current) {
      mapa.current.fitBounds(limites, 48);
      // Obra única daria zoom de rua; o bairro em volta é o contexto útil.
      google.maps.event.addListenerOnce(mapa.current, "idle", () => {
        if ((mapa.current?.getZoom() ?? 0) > 16) mapa.current?.setZoom(16);
      });
    }
    enquadradas.current = posicoes.size;
  }, [carga, posicoes]);

  // 4. Desenha os marcadores visíveis.
  useEffect(() => {
    if (carga !== "pronto" || !mapa.current) return;
    let cancelado = false;
    const criados: google.maps.marker.AdvancedMarkerElement[] = [];

    (async () => {
      const { AdvancedMarkerElement } = (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;
      if (cancelado) return;
      for (const o of obras) {
        if (ocultas.has(o.situacao)) continue;
        const pos = posicoes.get(o.id);
        if (!pos) continue;
        const m = new AdvancedMarkerElement({
          map: mapa.current,
          position: { lat: pos.lat, lng: pos.lng },
          content: marcador(COR_SITUACAO[o.situacao], pos.aproximada),
          // Nome acessível: o leitor de tela anuncia a obra e a situação, e o
          // marcador clicável entra na ordem do Tab.
          title: `${o.nome} · ${NOME_SITUACAO[o.situacao]}${pos.aproximada ? " · posição aproximada" : ""}`,
          gmpClickable: true,
          // Parada fica por cima: é a que pede decisão.
          zIndex: o.situacao === "parada" ? 3 : o.situacao === "andamento" ? 2 : 1,
        });
        m.addEventListener("gmp-click", () => {
          balao.current?.setContent(conteudoBalao(o, pos.aproximada));
          balao.current?.open({ map: mapa.current, anchor: m });
        });
        criados.push(m);
      }
    })().catch((e) => console.error("[PainelExecutivo] falha nos marcadores:", e));

    return () => {
      cancelado = true;
      for (const m of criados) m.map = null;
    };
  }, [carga, obras, posicoes, ocultas]);

  function alternar(s: SituacaoNoMapa) {
    setOcultas((atual) => {
      const proxima = new Set(atual);
      if (proxima.has(s)) proxima.delete(s);
      else proxima.add(s);
      return proxima;
    });
  }

  const porSituacao = (s: SituacaoNoMapa) => obras.filter((o) => o.situacao === s).length;
  const aproximadas = Array.from(posicoes.values()).filter((p) => p.aproximada).length;
  const bairrosNaoAchados = obras.filter(
    (o) => o.latitude === null && o.bairro && bairros.get(o.bairro) === null
  ).length;

  return (
    <section aria-labelledby="titulo-obras-no-mapa">
      <div className="flex items-center justify-between mb-3">
        <h2 id="titulo-obras-no-mapa" className="font-semibold text-sm text-muted">
          Obras no mapa
        </h2>
        <Link
          href="/dashboard/secretarias/obras"
          className="text-xs font-semibold text-brand hover:underline"
        >
          Ver obras →
        </Link>
      </div>

      {obras.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted leading-relaxed">
          Nenhuma obra em andamento, parada ou concluída tem localização
          cadastrada ainda. Informe a latitude e a longitude, ou ao menos o
          bairro, na tela de Obras, e ela aparece aqui.
        </div>
      ) : !CHAVE ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted leading-relaxed">
          O mapa ainda não foi configurado nesta instalação: falta a chave do
          Google Maps (<code className="text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>).
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {SITUACOES.map((s) => {
              const ativa = !ocultas.has(s);
              const total = porSituacao(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => alternar(s)}
                  disabled={total === 0}
                  aria-pressed={ativa}
                  className="flex items-center gap-2 text-sm font-medium transition-opacity duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ opacity: ativa || total === 0 ? 1 : 0.4 }}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      background: COR_SITUACAO[s],
                      border: "2px solid var(--sobre-forte)",
                      boxShadow: "0 0 0 1px var(--border)",
                    }}
                  />
                  {NOME_SITUACAO[s]}
                  <span className="text-muted tabular-nums">{total}</span>
                </button>
              );
            })}
          </div>

          <div className="relative isolate z-0 rounded-xl overflow-hidden border border-border h-[320px] sm:h-[420px]">
            <div ref={divMapa} className="absolute inset-0" />
            {carga !== "pronto" && (
              <div
                className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted leading-relaxed"
                style={{ background: "var(--card)" }}
              >
                {carga === "carregando" && "Carregando mapa…"}
                {carga === "erro" &&
                  "Não foi possível carregar o Google Maps. Costuma ser bloqueio de rede da prefeitura; a lista completa continua em Obras."}
                {carga === "chave-recusada" &&
                  "O Google recusou a chave do mapa. Confira no Google Cloud se este endereço está na restrição de domínio e se a Maps JavaScript API está ativa."}
              </div>
            )}
          </div>

          {(aproximadas > 0 || bairrosNaoAchados > 0 || semLocal > 0 || planejadas > 0) && (
            <ul className="text-xs text-muted leading-relaxed space-y-0.5">
              {aproximadas > 0 && (
                <li>
                  Marcador vazado: {aproximadas === 1 ? "a obra tem" : `${aproximadas} obras têm`} só o
                  bairro cadastrado, e aparece{aproximadas === 1 ? "" : "m"} no centro dele.
                </li>
              )}
              {bairrosNaoAchados > 0 && (
                <li>
                  {bairrosNaoAchados === 1 ? "Uma obra ficou" : `${bairrosNaoAchados} obras ficaram`} fora
                  porque o Google não encontrou o bairro em {municipio}.
                </li>
              )}
              {semLocal > 0 && (
                <li>
                  {semLocal === 1 ? "Uma obra não tem" : `${semLocal} obras não têm`} coordenada nem bairro
                  e não {semLocal === 1 ? "aparece" : "aparecem"} no mapa.
                </li>
              )}
              {planejadas > 0 && (
                <li>
                  {planejadas === 1 ? "Uma obra planejada fica" : `${planejadas} obras planejadas ficam`} fora
                  do mapa até começar.
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
