import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { homePrecisaSerMontada } from "@/lib/home-montada";

// ── A HOME SAI DO CACHE; SÓ O QUE MUDA A PÁGINA VAI AO SERVIDOR ──
// A home ficou estática (novembro de 2026). Se alguém voltar a ler cookie,
// cabeçalho ou parâmetro direto nela, ela volta a ser montada a cada visita
// sem ninguém perceber, e o primeiro byte volta a esperar banco.

const ler = (p: string) => readFileSync(p, "utf8");

describe("home estática com versão montada", () => {
  it("só município, estado, porta do morador e sessão levam à versão montada", () => {
    const q = (s: string) => new URLSearchParams(s);
    expect(homePrecisaSerMontada(q(""), false)).toBe(false);
    expect(homePrecisaSerMontada(q("utm_source=whatsapp&fbclid=x"), false)).toBe(false);
    expect(homePrecisaSerMontada(q("m=2211001"), false)).toBe(true);
    expect(homePrecisaSerMontada(q("uf=PI"), false)).toBe(true);
    expect(homePrecisaSerMontada(q("para=morador"), false)).toBe(true);
    expect(homePrecisaSerMontada(q(""), true)).toBe(true);
  });

  it("o proxy reescreve a home para app/inicio, e só a home", () => {
    const proxy = ler("src/proxy.ts");
    expect(proxy).toMatch(/pathname === "\/" && homePrecisaSerMontada\(/);
    expect(proxy).toMatch(/url\.pathname = "\/inicio";\s*return NextResponse\.rewrite\(url\)/);
  });

  it("a home não lê sessão, cabeçalho nem parâmetro, e se refaz no máximo de hora em hora", () => {
    const home = ler("src/app/page.tsx");
    expect(home).toMatch(/export const revalidate = 3600;/);
    expect(home).not.toMatch(/lerSessao|from "next\/headers"|searchParams/);
    // O registro de visita no servidor só existe na versão montada.
    expect(home).toMatch(/if \(pedido\) \{\s*await registrarEvento\(\{ tipo: "visita"/);
    // Na estática, quem conta é o navegador.
    expect(home).toMatch(/\{!pedido && <ContarVisita \/>\}/);
  });

  it("a versão montada tem a mesma canônica da home", () => {
    const montada = ler("src/app/inicio/page.tsx");
    expect(montada).toMatch(/export const metadata = metadataDaHome/);
    expect(ler("src/app/page.tsx")).toMatch(/caminho: "\/"/);
  });

  it("a visita contada pelo navegador só vale da própria página", () => {
    const rota = ler("src/app/api/visita/route.ts");
    expect(rota).toMatch(/sec-fetch-site/);
    expect(rota).toMatch(/registrarEvento\(\{ tipo: "visita", caminho: "\/", referer \}\)/);
  });
});
