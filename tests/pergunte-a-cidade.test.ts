import { describe, expect, it } from "vitest";
import { buscar, montarIndice, normalizar, palavrasDaPergunta, type DadosDoIndice } from "@/lib/pergunte-a-cidade";

const dados: DadosDoIndice = {
  municipio: "Bela Aurora",
  servicos: [
    { id: "s1", titulo: "IPTU: segunda via do carnê", conteudo: "Emita a segunda via do IPTU.", requisitos: "Inscrição do imóvel", prazo: "Na hora", contato: "Setor de Tributos", linkExterno: null, secretaria: "Finanças" },
    { id: "s2", titulo: "Alvará de funcionamento", conteudo: "Licença para abrir um comércio.", requisitos: "CNPJ", prazo: "15 dias", contato: null, linkExterno: "https://exemplo/alvara", secretaria: "Finanças" },
  ],
  outrasPublicacoes: [{ id: "f1", tipo: "faq", titulo: "Onde pego remédio de graça?", conteudo: "Na Farmácia Básica.", secretaria: "Saúde" }],
  unidades: [
    { id: "u1", nome: "UBS do Centro", tipo: "ubs", bairro: "Centro", endereco: "Rua da Matriz, 45", telefone: "(00) 3333-0201", turno: "Seg. a sex.", latitude: -5, longitude: -42 },
    { id: "u2", nome: "UPA 24 horas", tipo: "upa", bairro: "Jardim", endereco: null, telefone: null, turno: "24 horas", latitude: null, longitude: null },
  ],
  escolas: [{ id: "e1", nome: "Escola Municipal Aurora", bairro: "Vila Nova", endereco: "Rua das Acácias", telefone: null, etapas: "Fundamental", latitude: null, longitude: null }],
  obras: [
    { id: "o1", nome: "Reforma da Praça da Matriz", status: "em_andamento", bairro: "Centro", valorContrato: 320000, progressoAtual: 40 },
    { id: "o2", nome: "Quadra coberta da escola", status: "atrasada", bairro: "Vila Nova", valorContrato: 690000, progressoAtual: 35 },
  ],
  compras: [{ id: "c1", objeto: "Merenda escolar", numero: "PE 12/2026", status: "publicada", valorEstimado: 540000 }],
  dinheiro: { receita: 62_400_000, despesas: 51_150_000, saldo: 11_250_000 },
};
const indice = montarIndice(dados);
const primeiro = (p: string) => buscar(indice, p)[0];

describe("as palavras da pergunta", () => {
  it("tira acento, pontuação e palavras vazias", () => {
    expect(normalizar("Onde é a UBS?")).toBe("onde e a ubs");
    expect(palavrasDaPergunta("Onde tem posto de saúde?")).toEqual(["posto", "saude"]);
  });
});

describe("o morador pergunta do jeito dele", () => {
  it("posto de saúde acha a UBS, com endereço, telefone e o caminho no mapa", () => {
    const r = primeiro("onde tem posto de saúde?");
    expect(r.tipo).toBe("saude");
    expect(r.detalhes).toContain("Telefone: (00) 3333-0201");
    expect(r.link?.href).toContain("google.com/maps/dir");
  });

  it("emergência acha a UPA", () => {
    expect(primeiro("é uma emergência").titulo).toBe("UPA 24 horas");
  });

  it("obras atrasadas traz a atrasada primeiro", () => {
    expect(primeiro("quais obras estão atrasadas?").id).toBe("obra:o2");
  });

  it("quanto custou a praça traz a obra com o valor", () => {
    const r = primeiro("quanto custou a praça?");
    expect(r.id).toBe("obra:o1");
    expect(r.detalhes.join(" ")).toContain("320.000");
  });

  it("quanto a prefeitura gastou responde com o dinheiro numa frase", () => {
    const r = primeiro("quanto a prefeitura gastou?");
    expect(r.tipo).toBe("dinheiro");
    expect(r.resposta).toContain("de cada R$ 100, R$ 82 já saíram");
  });

  it("imposto da casa acha o IPTU; abrir empresa acha o alvará, com o link do serviço online", () => {
    expect(primeiro("imposto da casa").id).toBe("servico:s1");
    const alvara = primeiro("quero abrir minha empresa");
    expect(alvara.id).toBe("servico:s2");
    expect(alvara.link).toEqual({ href: "https://exemplo/alvara", rotulo: "Fazer online" });
  });

  it("remédio acha a pergunta frequente", () => {
    expect(primeiro("onde pego remédio").id).toBe("publicacao:f1");
  });

  it("matrícula do filho acha a escola", () => {
    expect(primeiro("matricular meu filho").tipo).toBe("escola");
  });

  it("buraco na rua leva a fazer um pedido", () => {
    expect(buscar(indice, "tem um buraco na minha rua").map((r) => r.id)).toContain("acao:pedido");
  });

  it("pergunta sem relação não inventa resposta", () => {
    expect(buscar(indice, "xyzabc")).toEqual([]);
    expect(buscar(indice, "de que")).toEqual([]);
  });
});
