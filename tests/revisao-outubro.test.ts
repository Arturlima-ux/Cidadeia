import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { FONTES_OFICIAIS, MUNICIPIOS_COM_PREFEITURA } from "@/lib/fontes-oficiais";
import { todosOsMunicipios } from "@/lib/municipios";
import { PANORAMA } from "@/lib/panorama";
import { AVISO_FRACIONAMENTO } from "@/lib/contratacao";
import { CONTATO_PUBLICO } from "@/lib/contato-comercial";
import { mensagensDeExemplo } from "@/lib/portal-exemplo";

// A revisão de outubro de 2026 achou números que não batiam entre páginas,
// um rótulo jurídico errado e o e-mail pessoal do fundador no site. Estes
// testes seguram cada correção.

const ler = (p: string) => readFileSync(p, "utf8");

describe("números que batem entre as páginas", () => {
  it("5.570 municípios com prefeitura: a tabela do IBGE sem Brasília, e o mesmo do panorama", () => {
    expect(todosOsMunicipios().filter((m) => m.uf !== "DF")).toHaveLength(MUNICIPIOS_COM_PREFEITURA);
    expect(PANORAMA.brasil.municipios).toBe(MUNICIPIOS_COM_PREFEITURA);
  });

  it("uma lista só de bases oficiais, usada pela home, Quem somos e Governança", () => {
    expect(FONTES_OFICIAIS.length).toBe(9);
    for (const p of ["src/app/page.tsx", "src/app/quem-somos/page.tsx", "src/app/governanca/page.tsx", "src/components/site/inicio/ComoFunciona.tsx"]) {
      expect(ler(p)).toMatch(/fontes-oficiais/);
    }
  });
});

describe("o que é jurídico, certo", () => {
  it("52,4% de despesa com pessoal é acima do prudencial, não fora da lei", () => {
    const s = ler("src/components/site/inicio/ComoFunciona.tsx");
    expect(s).not.toMatch(/Fora da lei/);
    expect(s).toMatch(/Acima do prudencial/);
  });

  it("o limite da dispensa é da soma do ano, e o site diz isso", () => {
    expect(AVISO_FRACIONAMENTO.base).toMatch(/75, § 1º/);
    for (const p of ["src/app/page.tsx", "src/app/como-contratar/page.tsx", "src/app/kit/page.tsx"]) {
      expect(ler(p)).toMatch(/AVISO_FRACIONAMENTO/);
    }
  });

  it("o portal se diz complementar ao Portal da Transparência da LC 131", () => {
    expect(ler("src/app/transparencia/PortalCidade.tsx")).toMatch(/complementa, e não substitui/);
  });
});

describe("contato e acabamento", () => {
  it("o site mostra o e-mail do projeto, nunca o pessoal", () => {
    expect(CONTATO_PUBLICO).toBe("cidadeia1326@gmail.com");
    for (const p of ["src/components/site/ContatoEmail.tsx", "src/lib/seo.tsx"]) {
      expect(ler(p)).not.toMatch(/arturmlo2005/);
    }
  });

  it("o título da home tem cada palavra uma vez só", () => {
    const h1 = ler("src/app/page.tsx").match(/<h1[\s\S]*?<\/h1>/)![0];
    expect(h1.match(/inteira,/g)).toHaveLength(1);
  });

  it("no exemplo, nenhuma mensagem fica esperando resposta por semanas", () => {
    const agora = Date.UTC(2026, 9, 22);
    for (const l of mensagensDeExemplo(agora)) {
      if (l.respondidoEm) continue;
      expect((agora - Date.parse(l.createdAt)) / 86_400_000).toBeLessThan(10);
    }
  });
});
