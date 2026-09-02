"use client";

import { useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── MAPA ÚNICO DA CIDADE ──
//
// O MapaSecretaria mostra uma camada por vez, dentro da tela de cada
// secretaria. Aqui é a visão do gabinete: obra, escola e unidade de saúde na
// mesma tela, porque é assim que o prefeito pensa o município — não por
// secretaria, mas por bairro.
//
// A obra atrasada muda de cor. É a única informação do mapa que exige ação, e
// é o motivo de o prefeito abrir esta tela em vez das três separadas.

export type CamadaMapa = "saude" | "educacao" | "obras";

export type PontoCidade = {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  camada: CamadaMapa;
  descricao?: string;
  /** Só em obras: destaca em vermelho e explica por quê. */
  emAtraso?: boolean;
};

export const CORES_CAMADA: Record<CamadaMapa, string> = {
  saude: "#e0533d",
  educacao: "#2f7ad6",
  obras: "#e0a441",
};

const COR_ATRASO = "#c0392b";

export const NOME_CAMADA: Record<CamadaMapa, string> = {
  saude: "Saúde",
  educacao: "Educação",
  obras: "Obras",
};

/**
 * Marcador desenhado como SVG embutido, não como imagem baixada.
 *
 * O MapaSecretaria puxa o ícone padrão do Leaflet de um CDN externo. Aqui não
 * dá: são três camadas com cores diferentes, e mais um estado de atraso — e
 * uma prefeitura atrás de firewall veria marcador quebrado em vez de mapa.
 * Desenhado localmente, funciona sem rede e a cor vira informação.
 */
function icone(cor: string, destacado: boolean): L.DivIcon {
  const tamanho = destacado ? 30 : 24;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="${tamanho}" height="${tamanho * 1.33}">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.4 18.6 0 12 0z"
            fill="${cor}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="12" cy="12" r="4.5" fill="#ffffff"/>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [tamanho, tamanho * 1.33],
    iconAnchor: [tamanho / 2, tamanho * 1.33],
    popupAnchor: [0, -tamanho],
  });
}

export default function MapaCidade({ pontos }: { pontos: PontoCidade[] }) {
  const [ocultas, setOcultas] = useState<Set<CamadaMapa>>(new Set());
  const [tilesFalharam, setTilesFalharam] = useState(false);
  const carregouAlgumTile = useRef(false);

  const visiveis = useMemo(
    () => pontos.filter((p) => !ocultas.has(p.camada)),
    [pontos, ocultas]
  );

  const centro = useMemo<[number, number] | null>(() => {
    if (pontos.length === 0) return null;
    return [
      pontos.reduce((s, p) => s + p.latitude, 0) / pontos.length,
      pontos.reduce((s, p) => s + p.longitude, 0) / pontos.length,
    ];
  }, [pontos]);

  if (centro === null) {
    return (
      <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted leading-relaxed">
        Nenhuma obra, escola ou unidade de saúde tem latitude e longitude
        cadastradas ainda. O mapa aparece assim que a primeira tiver.
      </div>
    );
  }

  function alternar(camada: CamadaMapa) {
    setOcultas((atual) => {
      const proxima = new Set(atual);
      if (proxima.has(camada)) proxima.delete(camada);
      else proxima.add(camada);
      return proxima;
    });
  }

  const porCamada = (c: CamadaMapa) => pontos.filter((p) => p.camada === c).length;
  const atrasadas = pontos.filter((p) => p.emAtraso).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {(Object.keys(NOME_CAMADA) as CamadaMapa[]).map((c) => {
          const ativa = !ocultas.has(c);
          const total = porCamada(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => alternar(c)}
              disabled={total === 0}
              aria-pressed={ativa}
              className="flex items-center gap-2 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ opacity: ativa || total === 0 ? 1 : 0.4 }}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: CORES_CAMADA[c], border: "2px solid #fff", boxShadow: "0 0 0 1px var(--border)" }}
              />
              {NOME_CAMADA[c]}
              <span className="text-muted tabular-nums">{total}</span>
            </button>
          );
        })}

        {atrasadas > 0 && (
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: COR_ATRASO }}>
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ background: COR_ATRASO, border: "2px solid #fff" }}
            />
            {atrasadas} {atrasadas === 1 ? "obra atrasada" : "obras atrasadas"}
          </span>
        )}
      </div>

      <div className="relative rounded-xl overflow-hidden border border-border" style={{ height: 460 }}>
        <MapContainer center={centro} zoom={12} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{
              tileload: () => {
                carregouAlgumTile.current = true;
                if (tilesFalharam) setTilesFalharam(false);
              },
              tileerror: () => {
                if (!carregouAlgumTile.current) setTilesFalharam(true);
              },
            }}
          />
          {visiveis.map((p) => (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={icone(p.emAtraso ? COR_ATRASO : CORES_CAMADA[p.camada], Boolean(p.emAtraso))}
            >
              <Popup>
                <strong>{p.nome}</strong>
                <br />
                <span style={{ color: "#666" }}>{NOME_CAMADA[p.camada]}</span>
                {p.descricao && (
                  <>
                    <br />
                    {p.descricao}
                  </>
                )}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {tilesFalharam && (
        <div
          className="border rounded-lg px-3 py-2 text-xs"
          style={{ color: "var(--medio)", background: "var(--medio-tint)", borderColor: "var(--medio-borda)" }}
        >
          <p className="font-semibold">Não foi possível carregar as imagens do mapa.</p>
          <p className="mt-0.5 leading-relaxed">
            Costuma ser bloqueio de rede da prefeitura. Os marcadores continuam
            no lugar certo — só o fundo não carregou.
          </p>
        </div>
      )}
    </div>
  );
}
