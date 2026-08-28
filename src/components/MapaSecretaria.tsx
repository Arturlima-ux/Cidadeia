"use client";

import { useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// O bundler do Next.js não resolve os ícones padrão do Leaflet a partir do
// pacote — sem isso, os marcadores apareceriam quebrados/invisíveis.
const iconePadrao = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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
  corDestaque = "#1a5c35",
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
      <div
        className="relative rounded-xl overflow-hidden border border-border"
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
            <Marker key={p.id} position={[p.latitude, p.longitude]} icon={iconePadrao}>
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
