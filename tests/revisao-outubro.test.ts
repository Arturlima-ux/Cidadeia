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

describe("segunda revisão de outubro", () => {
  it("cadastro aberto não ganha portal: só prefeitura com módulo contratado", async () => {
    const { portalVerificado } = await import("@/lib/endereco-publico");
    expect(portalVerificado("[]")).toBe(false);
    expect(portalVerificado(null)).toBe(false);
    expect(portalVerificado('["gestao"]')).toBe(true);
    const acoes = ler("src/app/transparencia/actions.ts");
    expect(acoes).toMatch(/portalVerificado\(linha\.planosContratados\)/);
    expect(acoes).toMatch(/includes\("essencial"\)/);
  });

  it("o TR descreve os módulos com a mesma fonte da página de produtos", async () => {
    const { documentoPorChave } = await import("@/lib/kit-contratacao");
    const { MODULOS_DETALHE } = await import("@/lib/modulos-detalhe");
    const tr = JSON.stringify(documentoPorChave("termo-de-referencia"));
    for (const m of MODULOS_DETALHE) expect(tr).toContain(m.capacidades[0]);
    expect(tr).toMatch(/art\. 72/);
    expect(tr).toMatch(/75, § 3º/);
    expect(tr).toMatch(/DOTAÇÃO ORÇAMENTÁRIA/);
  });

  it("o reajuste é por apostila, sem depender de concordância da prefeitura", async () => {
    const { documentoPorChave } = await import("@/lib/kit-contratacao");
    const minuta = JSON.stringify(documentoPorChave("minuta-de-contrato"));
    expect(minuta).not.toMatch(/concordância da contratante/);
    expect(minuta).toMatch(/apostila/);
    expect(minuta).toMatch(/Da dotação orçamentária/);
  });

  it("a política fala de formulários, transferência internacional, encarregado e dados sensíveis", async () => {
    const { politicaDePrivacidade } = await import("@/lib/documentos-legais");
    const texto = JSON.stringify(politicaDePrivacidade({ razaoSocial: null, cnpj: null, endereco: null, representante: null, emailSuporte: null, telefoneSuporte: null }));
    for (const t of ["Pedido de proposta", "art. 33", "art. 41", "art. 14", "Anthropic"]) expect(texto).toContain(t);
    expect(texto).not.toMatch(/sem passar por formulário/);
  });
});

describe("terceira revisão de outubro", () => {
  it("o kit oferece pós-pago após o atesto como padrão e antecipado como alternativa", async () => {
    const { documentoPorChave } = await import("@/lib/kit-contratacao");
    const tr = JSON.stringify(documentoPorChave("termo-de-referencia"));
    expect(tr).toMatch(/Opção A, padrão — pagamento após o atesto/);
    expect(tr).toMatch(/Opção B, alternativa — pagamento antecipado/);
    expect(tr).not.toMatch(/praticado pelo mercado/);
    expect(tr).toMatch(/2 \(dois\) meses, contados da emissão da nota fiscal/);
  });

  it("o kit não fala do tamanho da operação nem diz que os dados não saem do país", async () => {
    const tudo = JSON.stringify((await import("@/lib/kit-contratacao")).documentoPorChave("acordo-de-tratamento-de-dados")) + JSON.stringify((await import("@/lib/compromissos")).COMPROMISSOS);
    expect(tudo).not.toMatch(/uma pessoa/);
    expect(tudo).not.toMatch(/não deixam o território nacional/);
    expect(tudo).not.toMatch(/\.\./);
  });

  it("dia sem verificação conta contra, e a lista tem um dia por linha", async () => {
    const { apurar, porDia } = await import("@/lib/disponibilidade");
    const m = (d: string, h = "09") => ({ verificadoEm: `${d}T${h}:00:00.000Z`, ok: true, ms: 300, detalhe: null });
    const a = apurar([m("2026-10-01"), m("2026-10-03")]);
    expect(a.diasSemVerificacao).toBe(1);
    expect(porDia([m("2026-10-02", "09"), m("2026-10-02", "21"), m("2026-10-01")])).toHaveLength(2);
  });

  it("portal oficial sem propaganda do fornecedor", () => {
    expect(ler("src/app/transparencia/PortalMinimo.tsx")).not.toMatch(/Feito com CidadeIA/);
    expect(ler("src/app/transparencia/PortalCidade.tsx")).not.toMatch(/Feito com CidadeIA/);
  });

  it("a página do prefeito não promete conferir o RGF antes da assinatura", async () => {
    const { CARGOS } = await import("@/lib/cargos");
    const p = JSON.stringify(CARGOS.find((c) => c.slug === "prefeito"));
    expect(p).not.toMatch(/antes de assinar/);
    expect(p).not.toMatch(/o senhor/);
  });
});
