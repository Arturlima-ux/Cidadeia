import { describe, it, expect } from "vitest";
import { juntarContratados, comoFoiAgrupado } from "@/lib/contratados";
import { detectarConcentracaoDeFornecedor } from "@/lib/padroes-licitacoes";

const proc = (p: Partial<Parameters<typeof juntarContratados>[0][number]> = {}) => ({
  numero: "PE 1/2026",
  objeto: "Aquisição de gêneros",
  valorEstimado: 100_000,
  fornecedor: "Boa Mesa Ltda",
  status: "homologada",
  numeroControlePncp: null,
  modalidade: "Pregão eletrônico",
  ...p,
});

const ctr = (c: Partial<Parameters<typeof juntarContratados>[1][number]> = {}) => ({
  id: "c1",
  numeroControlePncp: "00000000000191-2-000001/2026",
  numeroControlePncpCompra: null,
  objeto: "Aquisição de gêneros",
  fornecedorDocumento: "12345678000199",
  fornecedorNome: "BOA MESA LTDA",
  fornecedorTipoPessoa: "PJ",
  valorGlobal: 100_000,
  ...c,
});

describe("identidade do contratado", () => {
  it("o documento agrupa o que o nome separava", () => {
    // O defeito real: 115 fornecedores distintos por nome contra 114 por
    // documento num município medido. A mesma empresa com duas grafias virava
    // duas, e o padrão se dividia em grupos pequenos demais para disparar.
    const r = juntarContratados(
      [],
      [
        ctr({ id: "a", numeroControlePncp: "x-1", fornecedorNome: "A. M. DE ANDRADE & CIA LTDA" }),
        ctr({ id: "b", numeroControlePncp: "x-2", fornecedorNome: "AM Andrade Cia Ltda." }),
      ]
    );
    expect(r).toHaveLength(1);
    expect(r[0]!.quantidade).toBe(2);
    expect(r[0]!.porDocumento).toBe(true);
  });

  it("documentos diferentes não são fundidos por nome parecido", () => {
    // O erro na direção oposta, que a heurística de nome cometia: duas
    // empresas distintas com razão social semelhante viravam uma.
    const r = juntarContratados(
      [],
      [
        ctr({ id: "a", numeroControlePncp: "x-1", fornecedorDocumento: "11111111000191", fornecedorNome: "Construtora Silva Ltda" }),
        ctr({ id: "b", numeroControlePncp: "x-2", fornecedorDocumento: "22222222000191", fornecedorNome: "Construtora Silva ME" }),
      ]
    );
    expect(r).toHaveLength(2);
  });

  it("sem contrato, cai no nome — e diz que caiu", () => {
    const r = juntarContratados([proc(), proc({ numero: "PE 2/2026", fornecedor: "boa mesa ltda." })], []);
    expect(r).toHaveLength(1);
    expect(r[0]!.porDocumento).toBe(false);
    expect(comoFoiAgrupado(r[0]!)).toMatch(/semelhança de nome/);
  });

  it("a tela distingue a força das duas afirmações", () => {
    // "3 contratos do mesmo CNPJ" é fato; "3 processos com nome parecido" é
    // suspeita de grafia. Dizê-las igual emprestaria certeza à segunda.
    const porDoc = juntarContratados([], [ctr()])[0]!;
    const porNome = juntarContratados([proc()], [])[0]!;
    expect(comoFoiAgrupado(porDoc)).toMatch(/CNPJ\/CPF/);
    expect(comoFoiAgrupado(porNome)).not.toMatch(/CNPJ\/CPF do contrato$/);
  });
});

describe("contrato e edital não são contados duas vezes", () => {
  it("processo já representado por um contrato não soma de novo", () => {
    // O mesmo negócio somado duas vezes infla a contagem E o dinheiro do
    // padrão, que é o que decide se ele dispara.
    const r = juntarContratados(
      [proc({ numeroControlePncp: "compra-1", valorEstimado: 100_000 })],
      [ctr({ numeroControlePncpCompra: "compra-1", valorGlobal: 95_000 })]
    );
    expect(r).toHaveLength(1);
    expect(r[0]!.quantidade).toBe(1);
    expect(r[0]!.valor).toBe(95_000);
    expect(r[0]!.processosSemContrato).toHaveLength(0);
  });

  it("processo sem contrato publicado ainda conta", () => {
    // O contrato é publicado depois do edital: todo processo recém-homologado
    // passa um tempo sem par, e sumir com ele esconderia o mais recente.
    const r = juntarContratados(
      [proc({ numero: "PE 9/2026", numeroControlePncp: "compra-9", fornecedor: "Outra Empresa" })],
      [ctr({ numeroControlePncpCompra: "compra-1" })]
    );
    expect(r).toHaveLength(2);
    expect(r.find((c) => c.nome === "Outra Empresa")!.processosSemContrato).toHaveLength(1);
  });

  it("o processo sem contrato entra no contratado que já tem documento", () => {
    // Sem este casamento a mesma empresa apareceria duas vezes — uma por CNPJ,
    // outra por nome — e o padrão ficaria dividido.
    const r = juntarContratados(
      [proc({ numero: "PE 2/2026", numeroControlePncp: "compra-2", fornecedor: "Boa Mesa LTDA" })],
      [ctr({ numeroControlePncpCompra: "compra-1" })]
    );
    expect(r).toHaveLength(1);
    expect(r[0]!.porDocumento).toBe(true);
    expect(r[0]!.quantidade).toBe(2);
    expect(comoFoiAgrupado(r[0]!)).toMatch(/entraram pelo nome/);
  });

  it("processo não homologado nunca entra", () => {
    expect(juntarContratados([proc({ status: "em_disputa" })], [])).toHaveLength(0);
    expect(juntarContratados([proc({ status: "publicada" })], [])).toHaveLength(0);
  });

  it("contratado sem documento e sem nome é descartado", () => {
    const r = juntarContratados([], [ctr({ fornecedorDocumento: null, fornecedorNome: null })]);
    expect(r).toHaveLength(0);
  });

  it("ordena por dinheiro, que é a ordem em que o gestor quer olhar", () => {
    const r = juntarContratados(
      [],
      [
        ctr({ id: "a", numeroControlePncp: "x-1", fornecedorDocumento: "11111111000191", valorGlobal: 10_000 }),
        ctr({ id: "b", numeroControlePncp: "x-2", fornecedorDocumento: "22222222000191", valorGlobal: 500_000 }),
      ]
    );
    expect(r.map((c) => c.valor)).toEqual([500_000, 10_000]);
  });
});

describe("o detector de concentração usando os contratos", () => {
  it("duas grafias do mesmo CNPJ agora disparam o padrão que antes escapava", () => {
    // Antes: "Andrade Ltda" e "Andrade ME" contavam como duas empresas com um
    // processo cada — nenhuma chegava ao mínimo de três. O padrão não aparecia
    // justamente onde deveria.
    const contratos = [
      ctr({ id: "a", numeroControlePncp: "x-1", fornecedorNome: "ANDRADE E CIA LTDA", valorGlobal: 100 }),
      ctr({ id: "b", numeroControlePncp: "x-2", fornecedorNome: "Andrade Cia", valorGlobal: 100 }),
      ctr({ id: "c", numeroControlePncp: "x-3", fornecedorNome: "andrade & cia ltda.", valorGlobal: 100 }),
      ctr({ id: "d", numeroControlePncp: "x-4", fornecedorDocumento: "99999999000191", fornecedorNome: "Outra", valorGlobal: 100 }),
    ];
    const padroes = detectarConcentracaoDeFornecedor([], contratos);
    expect(padroes).toHaveLength(1);
    expect(padroes[0]!.texto).toContain("venceu 3 dos 4 processos homologados");
    expect(padroes[0]!.texto).toMatch(/agrupado pelo CNPJ\/CPF/);
  });

  it("a chave do aviso diz por qual identidade ele foi agrupado", () => {
    // Um aviso dispensado por nome não deve reaparecer calado como dispensado
    // por documento, nem o contrário.
    // Dois contratos do mesmo CNPJ concentrando mais da metade do valor: um
    // contrato sozinho não é "vencer processo atrás de processo", e a regra
    // exige no mínimo dois — foi o que este teste me lembrou.
    const porDoc = detectarConcentracaoDeFornecedor(
      [],
      [
        ctr({ id: "a", numeroControlePncp: "x-1", valorGlobal: 600 }),
        ctr({ id: "b", numeroControlePncp: "x-2", valorGlobal: 300 }),
        ctr({ id: "c", numeroControlePncp: "x-3", fornecedorDocumento: "99999999000191", fornecedorNome: "Outra", valorGlobal: 100 }),
      ]
    );
    expect(porDoc[0]!.chave).toBe("licitacoes:fornecedor:12345678000199");
  });

  it("sem contratos, continua funcionando exatamente como antes", () => {
    // O parâmetro é opcional de propósito: quem só cadastrou editais não perde
    // o detector.
    const padroes = detectarConcentracaoDeFornecedor([
      proc({ numero: "A", valorEstimado: 100 }),
      proc({ numero: "B", fornecedor: "boa mesa LTDA.", valorEstimado: 100 }),
      proc({ numero: "C", fornecedor: "Boa Mesa", valorEstimado: 100 }),
      proc({ numero: "D", fornecedor: "Outra", valorEstimado: 100 }),
    ]);
    expect(padroes[0]!.texto).toContain("venceu 3 dos 4 processos homologados");
  });

  it("nem com contratos a tela acusa alguém", () => {
    const padroes = detectarConcentracaoDeFornecedor(
      [],
      [
        ctr({ id: "a", numeroControlePncp: "x-1", valorGlobal: 900 }),
        ctr({ id: "b", numeroControlePncp: "x-2", valorGlobal: 100 }),
      ]
    );
    for (const p of padroes) {
      expect(`${p.texto} ${p.acao}`).not.toMatch(/irregular|fraude|direcion|ilegal|descumpri/i);
    }
  });
});
