// A auditoria de SEO de 23/10/2026 (claude-seo) achou 27 problemas. Estes
// testes seguram os que já foram corrigidos para não voltarem.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReguaLrf from "@/components/site/inicio/ReguaLrf";
import { DESCRICAO_PADRAO, TITULO_DO_SITE, ldDadosDoMunicipio } from "@/lib/seo";
import { MODULOS_DETALHE } from "@/lib/modulos-detalhe";
import { CARGOS } from "@/lib/cargos";

const ler = (rel: string) => readFileSync(path.join(__dirname, "..", rel), "utf8");

describe("régua da LRF no HTML do servidor", () => {
  it("escreve o percentual do RGF, não o ponto de partida da animação", () => {
    const html = renderToStaticMarkup(
      createElement(ReguaLrf, {
        dado: {
          modo: "real",
          municipio: "Teresina",
          percentual: 42.3,
          situacao: "confortavel",
          periodo: "RGF do 2º quadrimestre de 2026",
          margemAtePrudencial: 1000,
          baseDeReserva: false,
        },
      })
    );
    expect(html).toContain("42,3%");
    expect(html).not.toContain("30,0%");
    // A leitura do número vem visível, sem esperar a animação terminar.
    expect(html).toContain("Abaixo do alerta.");
    expect(html).not.toMatch(/<p[^>]*style="[^"]*opacity:\s*0/);
  });

  it("no exemplo, também sai o valor final", () => {
    const html = renderToStaticMarkup(createElement(ReguaLrf, { dado: { modo: "exemplo" } }));
    expect(html).toContain("52,4%");
  });
});

describe("canônicas", () => {
  it("a home aponta para / (as 5.570 variantes /?m= consolidam nela)", () => {
    expect(ler("src/app/page.tsx")).toMatch(/caminho: "\/"/);
  });

  it.each([
    ["src/app/raio-x/page.tsx", "/raio-x"],
    ["src/app/conformidade/page.tsx", "/conformidade"],
    ["src/app/transparencia/page.tsx", "/transparencia"],
    ["src/app/disponibilidade/page.tsx", "/disponibilidade"],
    ["src/app/suporte/page.tsx", "/suporte"],
  ])("%s declara canônica", (arquivo, caminho) => {
    const fonte = ler(arquivo);
    expect(fonte).toContain("compartilhamento(");
    expect(fonte).toContain(`caminho: "${caminho}"`);
  });
});

describe("schema da página de município", () => {
  const ld = ldDadosDoMunicipio({
    nome: "Teresina",
    uf: "PI",
    nomeDoEstado: "Piauí",
    codigoIbge: "2211001",
    populacao: 908012,
    caminho: "/raio-x/pi/teresina",
    ano: 2026,
  });

  it("é um conjunto de dados do Tesouro, não a prefeitura", () => {
    expect(ld["@type"]).toBe("Dataset");
    expect(JSON.stringify(ld)).not.toContain("Prefeitura Municipal");
    expect((ld.creator as { name: string }).name).toBe("Tesouro Nacional");
  });

  it("tem descrição no tamanho que o Google aceita para Dataset", () => {
    const d = ld.description as string;
    expect(d.length).toBeGreaterThanOrEqual(50);
    expect(d.length).toBeLessThanOrEqual(5000);
  });

  it("a página não usa mais o schema de prefeitura", () => {
    expect(ler("src/app/raio-x/[uf]/[slug]/page.tsx")).not.toContain("ldPrefeitura");
  });
});


// O layout acrescenta " — CidadeIA" (11 caracteres). O Google mostra cerca
// de 60 no título e corta a descrição perto de 155.
const SUFIXO = " — CidadeIA".length;

describe("títulos e descrições para busca", () => {
  it("o título do site diz o que a prefeitura procura", () => {
    expect(TITULO_DO_SITE.toLowerCase()).toContain("sistema de gestão municipal");
    expect(TITULO_DO_SITE.length).toBeLessThanOrEqual(60);
    expect(DESCRICAO_PADRAO.length).toBeLessThanOrEqual(155);
  });

  it.each(MODULOS_DETALHE.map((m) => [m.chave, m]))("módulo %s: título e descrição no tamanho", (_, m) => {
    expect(m.tituloBusca.length + SUFIXO).toBeLessThanOrEqual(60);
    expect(m.descricaoBusca.length).toBeLessThanOrEqual(158);
    expect(m.descricaoBusca.length).toBeGreaterThanOrEqual(110);
  });

  it.each(CARGOS.map((c) => [c.slug, c]))("cargo %s: sem a marca duas vezes", (_, c) => {
    expect(c.tituloBusca).not.toContain("CidadeIA");
    expect(c.tituloBusca.length + SUFIXO).toBeLessThanOrEqual(60);
    expect(c.descricaoSeo.length).toBeLessThanOrEqual(158);
  });

  it("município: despesa com pessoal no título, sem os 91 caracteres de antes", () => {
    const fonte = ler("src/app/raio-x/[uf]/[slug]/page.tsx");
    expect(fonte).toContain("despesa com pessoal e LRF em ${ano}");
    // Maior nome de município do país + UF + o resto do modelo.
    const maior = "Vila Bela da Santíssima Trindade (MT): despesa com pessoal e LRF em 2026";
    expect(maior.length + SUFIXO).toBeLessThanOrEqual(85);
  });

  it("portal de cada cidade tem título com o nome dela", () => {
    expect(ler("src/app/transparencia/[slug]/page.tsx")).toContain("Portal do Cidadão de ${cidade}");
  });
});

describe("schema da marca e do site", () => {
  it("logo do Organization é quadrado, e CNPJ só entra quando existe", async () => {
    const { ldOrganizacao } = await import("@/lib/seo");
    const vazio = { razaoSocial: null, cnpj: null, endereco: null, representante: null, emailSuporte: null, telefoneSuporte: null };
    const sem = ldOrganizacao(vazio);
    const logo = sem.logo as { url: string; width: number; height: number };
    expect(logo.url).toMatch(/\/icon$/);
    expect(logo.width).toBe(logo.height);
    expect(sem).not.toHaveProperty("taxID");
    const com = ldOrganizacao({ ...vazio, razaoSocial: "Empresa Ltda", cnpj: "00.000.000/0001-00" });
    expect(com.taxID).toBe("00.000.000/0001-00");
    expect(com.legalName).toBe("Empresa Ltda");
  });

  it("a home publica WebSite", async () => {
    const { ldSite } = await import("@/lib/seo");
    expect(ldSite()["@type"]).toBe("WebSite");
    expect(ler("src/app/page.tsx")).toContain("ldSite()");
  });

  it("o panorama nacional e o de cada estado são Dataset", () => {
    expect(ler("src/app/panorama/page.tsx")).toContain("ldPanorama(");
    expect(ler("src/app/panorama/[uf]/page.tsx")).toContain("ldPanorama(");
  });
});

describe("/llms.txt", () => {
  it("aponta as páginas-chave e as descrições dos módulos", async () => {
    const { GET } = await import("@/app/llms.txt/route");
    const texto = await GET().text();
    expect(texto.startsWith("# CidadeIA")).toBe(true);
    expect(texto).toContain("/raio-x");
    expect(texto).toContain("/panorama");
    for (const m of MODULOS_DETALHE) expect(texto).toContain(m.descricaoBusca);
  });
});

describe("mapa do site dividido por estado", async () => {
  const { idsDoMapa, paginasDoEstado, paginasFixas, UFS_DO_MAPA } = await import("@/lib/mapa-do-site");
  const { todosOsMunicipios } = await import("@/lib/municipios");

  it("um arquivo de páginas fixas e um por estado, sem o DF", () => {
    expect(idsDoMapa()[0]).toBe("paginas");
    expect(UFS_DO_MAPA).toHaveLength(26);
    expect(idsDoMapa()).not.toContain("df");
  });

  it("todas as prefeituras entram uma vez, e Brasília não", () => {
    const urls = UFS_DO_MAPA.flatMap((uf) => paginasDoEstado(uf).map((p) => p.url));
    const municipais = urls.filter((u) => /\/raio-x\/[a-z]{2}\/.+/.test(u));
    expect(new Set(municipais).size).toBe(municipais.length);
    expect(municipais).toHaveLength(todosOsMunicipios().filter((m) => m.uf !== "DF").length);
    expect(urls.some((u) => u.includes("/raio-x/df"))).toBe(false);
  });

  it("páginas de dado têm data; institucionais não inventam uma", () => {
    expect(paginasDoEstado("pi").every((p) => p.lastModified)).toBe(true);
    const fixas = paginasFixas();
    expect(fixas.find((p) => p.url.endsWith("/panorama"))?.lastModified).toBeTruthy();
    expect(fixas.find((p) => p.url.endsWith("/quem-somos"))?.lastModified).toBeUndefined();
    expect(new Set(fixas.map((p) => p.url)).size).toBe(fixas.length);
  });

  it("cada arquivo fica bem abaixo do limite de 50 mil endereços", () => {
    for (const uf of UFS_DO_MAPA) expect(paginasDoEstado(uf).length).toBeLessThan(50_000);
  });
});
