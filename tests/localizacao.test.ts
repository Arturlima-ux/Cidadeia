import { describe, expect, it, vi } from "vitest";
import { localizarComPrecisao, melhorLeitura, paraMapa, textoDaMargem } from "@/lib/localizacao";

type Cb = (p: { coords: { latitude: number; longitude: number; accuracy: number } }) => void;

function geoFalso() {
  let sucesso: Cb = () => {};
  let falha: (e: unknown) => void = () => {};
  const geo = {
    watchPosition: vi.fn((s: Cb, f: (e: unknown) => void, _o?: PositionOptions) => { void _o; sucesso = s; falha = f; return 7; }),
    clearWatch: vi.fn(),
    getCurrentPosition: vi.fn(),
  };
  return { geo: geo as unknown as Geolocation, raw: geo, ler: (lat: number, lng: number, accuracy: number) => sucesso({ coords: { latitude: lat, longitude: lng, accuracy } }), errar: (e: unknown) => falha(e) };
}

describe("localização sem chute", () => {
  it("fica com a leitura de menor margem", () => {
    expect(melhorLeitura([{ lat: 1, lng: 1, precisaoM: 900 }, { lat: 2, lng: 2, precisaoM: 12 }, { lat: 3, lng: 3, precisaoM: 60 }])?.lat).toBe(2);
    expect(melhorLeitura([])).toBeNull();
  });

  it("diz a margem do jeito que a pessoa entende", () => {
    expect(textoDaMargem(28)).toBe("margem de 30 m");
    expect(textoDaMargem(140)).toBe("margem de 140 m");
    expect(textoDaMargem(1240)).toBe("margem de 1,2 km");
    expect(textoDaMargem(25_000)).toBe("margem de 25 km");
  });

  it("pede alta precisão, sem cache, e para quando o GPS fica bom", async () => {
    const { geo, raw, ler } = geoFalso();
    const p = localizarComPrecisao(geo);
    expect(raw.watchPosition.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: true, maximumAge: 0 });
    ler(-5.09, -42.8, 800); // primeira, pela rede
    ler(-5.0892, -42.8016, 18); // depois, GPS
    await expect(p).resolves.toEqual({ lat: -5.0892, lng: -42.8016, precisaoM: 18 });
    expect(raw.clearWatch).toHaveBeenCalledWith(7);
  });

  it("sem GPS bom, espera e entrega a melhor que chegou", async () => {
    vi.useFakeTimers();
    const { geo, ler } = geoFalso();
    const p = localizarComPrecisao(geo);
    ler(-5.1, -42.8, 2500);
    ler(-5.09, -42.8, 600);
    vi.advanceTimersByTime(8000);
    await expect(p).resolves.toMatchObject({ precisaoM: 600 });
    vi.useRealTimers();
  });

  it("sem permissão, rejeita sem inventar posição", async () => {
    const { geo, errar } = geoFalso();
    const p = localizarComPrecisao(geo);
    errar({ code: 1 });
    await expect(p).rejects.toEqual({ code: 1 });
  });

  it("Teresina cai no Nordeste do mapa", () => {
    const { x, y } = paraMapa(-5.09, -42.8);
    expect(x).toBeGreaterThan(700);
    expect(y).toBeLessThan(300);
  });
});
