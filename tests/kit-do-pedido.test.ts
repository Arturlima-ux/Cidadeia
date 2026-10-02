import { describe, it, expect } from "vitest";
import { substituicoesDoPedido, documentoDoPedido } from "@/lib/kit-do-pedido";
import { documentoPorChave, documentoPreenchido, textoCorrido, marcadoresDe } from "@/lib/kit-contratacao";
import { empresaDoAmbiente, pendenciasDaEmpresa } from "@/lib/empresa";

const pedido = { municipio: "Jerumenha", uf: "pi", mensal: 1_200 };
const vazia = {
  razaoSocial: null,
  cnpj: null,
  endereco: null,
  representante: null,
  emailSuporte: null,
  telefoneSuporte: null,
};
const semEmpresa = vazia;
const comEmpresa = {
  ...vazia,
  razaoSocial: "CidadeIA Tecnologia LTDA",
  cnpj: "00.000.000/0001-00",
};

const minuta = () => documentoPreenchido(documentoPorChave("minuta-de-contrato")!);

describe("o que o pedido preenche", () => {
  it("o município entra em caixa alta, com a UF para desfazer homônimo", () => {
    // Há muitos municípios de mesmo nome no Brasil, e a qualificação das
    // partes num contrato não pode ficar ambígua.
    const s = substituicoesDoPedido(pedido, semEmpresa);
    expect(s.get("[MUNICÍPIO]")).toBe("JERUMENHA (PI)");
  });

  it("o valor anual é doze vezes o mensal, e os dois saem formatados", () => {
    const s = substituicoesDoPedido(pedido, semEmpresa);
    expect(s.get("[VALOR MENSAL]")).toContain("1.200,00");
    expect(s.get("[VALOR ANUAL]")).toContain("14.400,00");
  });

  it("faixa sob consulta não vira R$ 0,00", () => {
    // mensal é null quando a faixa de população é definida em proposta
    // específica. Um contrato com "R$ 0,00" é pior que um com campo
    // visivelmente a preencher.
    const s = substituicoesDoPedido({ ...pedido, mensal: null }, semEmpresa);
    expect(s.has("[VALOR MENSAL]")).toBe(false);
    expect(s.has("[VALOR ANUAL]")).toBe(false);
  });

  it("valor zero também não entra", () => {
    const s = substituicoesDoPedido({ ...pedido, mensal: 0 }, semEmpresa);
    expect(s.has("[VALOR MENSAL]")).toBe(false);
  });

  it("os dados da empresa entram quando existem, e só então", () => {
    expect(substituicoesDoPedido(pedido, semEmpresa).has("[RAZÃO SOCIAL]")).toBe(false);
    expect(substituicoesDoPedido(pedido, comEmpresa).get("[CNPJ]")).toBe("00.000.000/0001-00");
  });
});

describe("o que continua em branco de propósito", () => {
  it("o CNPJ do município não é adivinhado", () => {
    // Existiria como buscar: o PNCP devolve o CNPJ do órgão junto do código
    // IBGE. Mas errar o CNPJ numa minuta é pior que deixá-lo em branco, e quem
    // assina digita o próprio em dez segundos.
    const d = documentoDoPedido(minuta(), pedido, comEmpresa);
    expect(textoCorrido(d)).toContain("[CNPJ DO MUNICÍPIO]");
  });

  it("a autoridade que assina pela prefeitura fica para a assinatura", () => {
    const d = documentoDoPedido(minuta(), pedido, comEmpresa);
    expect(textoCorrido(d)).toContain("[AUTORIDADE]");
  });

  it("sem empresa constituída, a qualificação da contratada fica visível", () => {
    const d = documentoDoPedido(minuta(), pedido, semEmpresa);
    const t = textoCorrido(d);
    expect(t).toContain("[RAZÃO SOCIAL]");
    expect(t).toContain("[CNPJ]");
  });
});

describe("as duas camadas, na ordem certa", () => {
  it("os compromissos de serviço entram antes, e valem para qualquer município", () => {
    // documentoPreenchido roda primeiro; documentoDoPedido só cuida do que
    // muda de pedido para pedido.
    const sla = documentoDoPedido(
      documentoPreenchido(documentoPorChave("acordo-de-nivel-de-servico")!),
      pedido,
      comEmpresa
    );
    const t = textoCorrido(sla);
    expect(t).not.toContain("[RESPOSTA CRÍTICA]");
    expect(t).toContain("4 horas úteis");
  });

  it("o documento do pedido tem menos pendências que o genérico", () => {
    const generico = marcadoresDe(minuta());
    const doPedido = marcadoresDe(documentoDoPedido(minuta(), pedido, comEmpresa));
    expect(doPedido.length).toBeLessThan(generico.length);
    // E nada apareceu que não existia antes.
    for (const m of doPedido) expect(generico).toContain(m);
  });

  it("nenhum marcador some sem ter sido substituído", () => {
    const subs = substituicoesDoPedido(pedido, comEmpresa);
    const antes = marcadoresDe(minuta());
    const depois = marcadoresDe(documentoDoPedido(minuta(), pedido, comEmpresa));
    for (const m of antes.filter((x) => !depois.includes(x))) {
      expect(subs.has(m), `${m} sumiu sem substituição`).toBe(true);
    }
  });

  it("o preenchimento não altera o documento de origem", () => {
    // DOCUMENTOS é a fonte e precisa continuar crua para o teste de cobertura.
    documentoDoPedido(minuta(), pedido, comEmpresa);
    expect(textoCorrido(documentoPorChave("minuta-de-contrato")!)).toContain("[MUNICÍPIO]");
  });
});

describe("a identificação da empresa vem de uma fonte só", () => {
  // ── O DEFEITO QUE ISTO IMPEDE ──
  //
  // Havia duas: lib/empresa.ts lia NEXT_PUBLIC_RAZAO_SOCIAL e NEXT_PUBLIC_CNPJ
  // para o rodapé do site, e lib/proposta-comercial.ts lia EMPRESA_* e
  // SUPORTE_* para a proposta em PDF.
  //
  // Preencher um conjunto deixava o outro em branco — e quem preenchesse
  // acharia que tinha terminado, justamente na parte que o jurídico da
  // prefeitura lê.

  it("o nome novo e o antigo levam ao mesmo lugar", () => {
    expect(empresaDoAmbiente({ EMPRESA_CNPJ: "11.111.111/0001-11" }).cnpj).toBe(
      "11.111.111/0001-11"
    );
    // O nome antigo continua aceito para não quebrar ambiente já configurado.
    expect(
      empresaDoAmbiente({ NEXT_PUBLIC_CNPJ: "22.222.222/0001-22" }).cnpj
    ).toBe("22.222.222/0001-22");
  });

  it("o nome novo tem precedência sobre o antigo", () => {
    const e = empresaDoAmbiente({
      EMPRESA_CNPJ: "novo",
      NEXT_PUBLIC_CNPJ: "antigo",
    });
    expect(e.cnpj).toBe("novo");
  });

  it("variável em branco conta como ausente", () => {
    // String vazia na Vercel é fácil de criar sem querer, e "   " passaria
    // por preenchida numa checagem ingênua.
    expect(empresaDoAmbiente({ EMPRESA_CNPJ: "   " }).cnpj).toBeNull();
  });

  it("as pendências saem pelo NOME DA VARIÁVEL, para serem copiáveis", () => {
    const faltam = pendenciasDaEmpresa(empresaDoAmbiente({}));
    expect(faltam).toEqual([
      "EMPRESA_RAZAO_SOCIAL",
      "EMPRESA_CNPJ",
      "EMPRESA_ENDERECO",
      "EMPRESA_REPRESENTANTE",
      "SUPORTE_EMAIL",
      "SUPORTE_TELEFONE",
    ]);
  });

  it("a lista encolhe conforme se preenche", () => {
    const faltam = pendenciasDaEmpresa(
      empresaDoAmbiente({ EMPRESA_CNPJ: "x", SUPORTE_EMAIL: "y" })
    );
    expect(faltam).not.toContain("EMPRESA_CNPJ");
    expect(faltam).not.toContain("SUPORTE_EMAIL");
    expect(faltam).toHaveLength(4);
  });

  it("o kit preenche os seis campos da contratada quando existem", () => {
    const completa = {
      razaoSocial: "CidadeIA Tecnologia LTDA",
      cnpj: "11.111.111/0001-11",
      endereco: "Rua Tal, 100 — Teresina/PI",
      representante: "Fulano de Tal, CPF 000.000.000-00",
      emailSuporte: "suporte@exemplo.com.br",
      telefoneSuporte: "(86) 99999-0000",
    };
    const t = textoCorrido(documentoDoPedido(minuta(), pedido, completa));
    for (const m of ["[RAZÃO SOCIAL]", "[CNPJ]", "[ENDEREÇO]", "[REPRESENTANTE LEGAL]"]) {
      expect(t, `${m} não foi preenchido`).not.toContain(m);
    }
    expect(t).toContain("CidadeIA Tecnologia LTDA");
  });
});
