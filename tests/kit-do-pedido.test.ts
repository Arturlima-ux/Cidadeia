import { describe, it, expect } from "vitest";
import { substituicoesDoPedido, documentoDoPedido } from "@/lib/kit-do-pedido";
import { documentoPorChave, documentoPreenchido, textoCorrido, marcadoresDe } from "@/lib/kit-contratacao";

const pedido = { municipio: "Jerumenha", uf: "pi", mensal: 1_200 };
const semEmpresa = { razaoSocial: null, cnpj: null };
const comEmpresa = { razaoSocial: "CidadeIA Tecnologia LTDA", cnpj: "00.000.000/0001-00" };

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
