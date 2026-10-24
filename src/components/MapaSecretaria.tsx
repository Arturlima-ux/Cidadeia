"use client";

import { useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── O MARCADOR É DESENHADO AQUI, NÃO BAIXADO ──
// Era o ícone padrão do Leaflet, buscado no unpkg. Atrás do firewall de uma
// prefeitura — o mesmo caso do aviso de "imagens do mapa não carregaram",
// que promete "os marcadores continuam corretos" — o marcador vinha como
// imagem quebrada. Desenhado localmente (como no MapaCidade), não depende de
// rede nenhuma.
function iconeMarcador(cor: string): L.DivIcon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="24" height="32" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.4 18.6 0 12 0z"
            fill="${cor}" stroke="var(--sobre-forte)" stroke-width="2"/>
      <circle cx="12" cy="12" r="4.5" fill="var(--sobre-forte)"/>
    </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [24, 32], iconAnchor: [12, 32], popupAnchor: [0, -28] });
}

export type PontoMapa = {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  descricao?: string;
  corBadge?: string;
};

export default function MapaSecretaria({
  pontos,
  corDestaque = "var(--serie-3)",
}: {
  pontos: PontoMapa[];
  corDestaque?: string;
}) {
  const [tilesFalharam, setTilesFalharam] = useState(false);
  const carregouAlgumTile = useRef(false);

  if (pontos.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted">
        Nenhum item com localização cadastrada ainda. Adicione latitude e
        longitude ao cadastrar um item para vê-lo aqui no mapa.
      </div>
    );
  }

  const centro: [number, number] = [
    pontos.reduce((s, p) => s + p.latitude, 0) / pontos.length,
    pontos.reduce((s, p) => s + p.longitude, 0) / pontos.length,
  ];

  return (
    <div className="space-y-2">
      {/* `isolate z-0`: o Leaflet dá z-index 400 às camadas e 1000 aos
          controles, e esses valores vazavam para a página — o mapa
          desenhava POR CIMA do menu "Atualizar indicadores" (z-10). Com um
          contexto de empilhamento próprio, os z-index do Leaflet só valem
          dentro do mapa. */}
      <div
        className="relative isolate z-0 rounded-xl overflow-hidden border border-border"
        style={{ height: 340 }}
      >
        <MapContainer
          center={centro}
          zoom={12}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{
              tileload: () => {
                carregouAlgumTile.current = true;
                if (tilesFalharam) setTilesFalharam(false);
              },
              tileerror: () => {
                // Só avisa se NENHUM tile carregou ainda — evita mostrar o
                // aviso por causa de uma falha isolada quando o resto do
                // mapa está funcionando normalmente.
                if (!carregouAlgumTile.current) setTilesFalharam(true);
              },
            }}
          />
          {pontos.map((p) => (
            <Marker key={p.id} position={[p.latitude, p.longitude]} icon={iconeMarcador(p.corBadge ?? corDestaque)} title={p.nome}>
              <Popup>
                <strong>{p.nome}</strong>
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
          style={{
            color: "var(--medio)",
            background: "var(--medio-tint)",
            borderColor: "var(--medio-borda)",
          }}
        >
          <p className="font-semibold">
            Não foi possível carregar as imagens do mapa (OpenStreetMap).
          </p>
          <p className="mt-0.5">
            Isso costuma acontecer por bloqueio de rede/firewall — os
            marcadores continuam corretos, só a imagem de fundo não carregou.
            Coordenadas cadastradas: {pontos.map((p) => p.nome).join(", ")}.
          </p>
        </div>
      )}
    </div>
  );
}
