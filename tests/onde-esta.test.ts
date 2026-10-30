import { describe, expect, it } from "vitest";
import { localPelaConexao, nomeDoLocal } from "@/lib/onde-esta";
import { GET } from "@/app/api/onde-estou/route";

const cab = (o: Record<string, string>) => new Headers(o);

describe("onde o visitante está, pela conexão", () => {
  it("lê cidade, estado e coordenadas dos cabeçalhos da Vercel", () => {
    const l = localPelaConexao(cab({
      "x-vercel-ip-country": "BR",
      "x-vercel-ip-country-region": "PI",
      "x-vercel-ip-city": "Teresina",
      "x-vercel-ip-latitude": "-5.0892",
      "x-vercel-ip-longitude": "-42.8016",
    }));
    expect(l).toEqual({ lat: -5.09, lng: -42.8, cidade: "Teresina", uf: "PI" });
    expect(nomeDoLocal(l)).toBe("Teresina, PI");
  });

  it("decodifica a cidade com acento (a Vercel manda codificada)", () => {
    const l = localPelaConexao(cab({ "x-vercel-ip-city": "S%C3%A3o%20Lu%C3%ADs", "x-vercel-ip-latitude": "-2.53", "x-vercel-ip-longitude": "-44.3" }));
    expect(l?.cidade).toBe("São Luís");
    expect(nomeDoLocal(l)).toBe("São Luís");
  });

  it("fora do Brasil, sem coordenadas ou com coordenada fora do país, não acende nada", () => {
    expect(localPelaConexao(cab({ "x-vercel-ip-country": "PT", "x-vercel-ip-latitude": "38.7", "x-vercel-ip-longitude": "-9.1" }))).toBeNull();
    expect(localPelaConexao(cab({ "x-vercel-ip-country": "BR" }))).toBeNull();
    expect(localPelaConexao(cab({ "x-vercel-ip-latitude": "40.7", "x-vercel-ip-longitude": "-74" }))).toBeNull();
    expect(localPelaConexao(cab({ "x-vercel-ip-latitude": "abc", "x-vercel-ip-longitude": "-44" }))).toBeNull();
  });

  it("estado esquisito ou cidade quebrada não viram texto na tela", () => {
    const l = localPelaConexao(cab({ "x-vercel-ip-country-region": "<script>", "x-vercel-ip-city": "%E0%A4%A", "x-vercel-ip-latitude": "-5", "x-vercel-ip-longitude": "-42" }));
    expect(l?.uf).toBeNull();
    expect(l?.cidade).toBeNull();
    expect(nomeDoLocal(l)).toBeNull();
  });

  it("o endereço devolve só à própria página, sem cache compartilhado", async () => {
    const r = await GET(new Request("https://x/api/onde-estou", { headers: { "x-vercel-ip-latitude": "-5.09", "x-vercel-ip-longitude": "-42.8", "x-vercel-ip-city": "Teresina" } }));
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toContain("no-store");
    expect(await r.json()).toMatchObject({ cidade: "Teresina" });
    const sem = await GET(new Request("https://x/api/onde-estou"));
    expect(sem.status).toBe(204);
    const fora = await GET(new Request("https://x/api/onde-estou", { headers: { "sec-fetch-site": "cross-site" } }));
    expect(fora.status).toBe(403);
  });
});
