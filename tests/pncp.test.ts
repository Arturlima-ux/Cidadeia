import { describe, it, expect } from "vitest";
import {
  MODALIDADES_MUNICIPAIS,
  normalizarNumero,
  anoDoNumero,
  conferirPublicacao,
  resumirConferencia,
  processosSoNoPncp,
  paraLicitacaoLocal,
  familiaModalidade,
  linkPncp,
  type ContratacaoPncp,
  type LicitacaoLocal,
} from "@/lib/pncp";

function noPncp(numeroCompra: string, anoCompra: number): ContratacaoPncp {
  return {
    numeroCompra,
    anoCompra,
    modalidade: "Dispensa",
    objeto: "Objeto de teste",
    valorEstimado: 1000,
    numeroControlePncp: `87990800000185-1-000${numeroCompra}/${anoCompra}`,
    publicadaEm: `${anoCompra}-03-01T10:00:00`,
  };
}

function local(id: string, numero: string): LicitacaoLocal {
  return { id, numero, objeto: "Objeto", status: "aberta" };
}

describe("modalidades consultadas", () => {
  it("cobre as que um município realmente usa", () => {
    // O parâmetro é obrigatório na API, então não existe "buscar tudo" — cada
    // modalidade é uma requisição, contra um limite apertado.
    const nomes = MODALIDADES_MUNICIPAIS.map((m) => m.nome.toLowerCase());
    expect(nomes.some((n) => n.includes("pregão"))).toBe(true);
    expect(nomes.some((n) => n.includes("dispensa"))).toBe(true);
    expect(nomes.some((n) => n.includes("inexigibilidade"))).toBe(true);
    expect(new Set(MODALIDADES_MUNICIPAIS.map((m) => m.codigo)).size).toBe(
      MODALIDADES_MUNICIPAIS.length
    );
  });
});

describe("normalização de número de processo", () => {
  it("casa formatos que a prefeitura e o PNCP escrevem diferente", () => {
    // A prefeitura digita "PE 014/2026"; o PNCP guarda "0014".
    expect(normalizarNumero("PE 014/2026")).toBe("14");
    expect(normalizarNumero("0014")).toBe("14");
    expect(normalizarNumero("Pregão 14/2026")).toBe("14");
    expect(normalizarNumero("14")).toBe("14");
  });

  it("não confunde o número com o ano depois da barra", () => {
    expect(normalizarNumero("1/2026")).toBe("1");
    expect(normalizarNumero("2026/2026")).toBe("2026");
  });

  it("devolve vazio quando não há dígito nenhum", () => {
    expect(normalizarNumero("processo sem número")).toBe("");
    expect(normalizarNumero("")).toBe("");
  });

  it("lê o ano quando o número o traz", () => {
    expect(anoDoNumero("PE 014/2026")).toBe(2026);
    expect(anoDoNumero("14")).toBeNull();
    expect(anoDoNumero("PE 14/26")).toBeNull();
  });
});

describe("conferência", () => {
  it("reconhece publicado apesar da diferença de formato", () => {
    const r = conferirPublicacao([local("a", "PE 014/2025")], [noPncp("0014", 2025)], true);
    expect(r[0].situacao).toBe("publicada");
    expect(r[0].correspondente?.numeroCompra).toBe("0014");
  });

  it("aponta o que não está no PNCP", () => {
    // É o achado que justifica a tela: sem divulgação o contrato não produz
    // efeito, e ninguém avisa o gestor disso hoje.
    const r = conferirPublicacao([local("a", "PE 099/2025")], [noPncp("0014", 2025)], true);
    expect(r[0].situacao).toBe("ausente");
    expect(r[0].correspondente).toBeNull();
  });

  it("não casa o mesmo número de anos diferentes", () => {
    // Sem a checagem de ano, o processo 14/2025 seria dado como publicado por
    // causa do 14/2026 — a tela mentiria exatamente onde precisa acertar.
    const r = conferirPublicacao([local("a", "PE 014/2025")], [noPncp("0014", 2026)], true);
    expect(r[0].situacao).toBe("ausente");
  });

  it("casa por número quando o local não informa ano", () => {
    const r = conferirPublicacao([local("a", "14")], [noPncp("0014", 2025)], true);
    expect(r[0].situacao).toBe("publicada");
  });

  it("nunca dá por publicado um processo sem número", () => {
    // Número vazio casaria com qualquer coisa se a comparação fosse ingênua.
    const r = conferirPublicacao([local("a", "sem número")], [noPncp("0014", 2025)], true);
    expect(r[0].situacao).not.toBe("publicada");
  });

  it("resume separando o que falta", () => {
    const r = conferirPublicacao(
      [local("a", "PE 014/2025"), local("b", "PE 099/2025"), local("c", "PE 100/2025")],
      [noPncp("0014", 2025)],
      true
    );
    const resumo = resumirConferencia(r);
    expect(resumo.total).toBe(3);
    expect(resumo.publicadas).toBe(1);
    expect(resumo.ausentes.map((a) => a.licitacao.id)).toEqual(["b", "c"]);
  });

  it("com lista local vazia não inventa pendência", () => {
    const resumo = resumirConferencia(conferirPublicacao([], [noPncp("0014", 2025)], true));
    expect(resumo.total).toBe(0);
    expect(resumo.ausentes).toHaveLength(0);
  });
});

describe("varredura parcial não vira acusação", () => {
  // Este bloco existe por causa de um defeito real: a consulta lia só a
  // primeira página de cada modalidade. Medindo um município de verdade (São
  // Sepé/RS, 2026) o PNCP tem 480 processos em 10 páginas — entravam 150, e o
  // resto era dado como "não publicado", ou seja, contrato sem eficácia pelo
  // art. 94. Acusação falsa no módulo que vende credibilidade.

  it("sem afirmar varredura completa, o que não foi achado fica indeterminado", () => {
    const r = conferirPublicacao([local("a", "PE 099/2025")], [noPncp("0014", 2025)]);
    expect(r[0]!.situacao).toBe("indeterminada");
  });

  it("o padrão é pessimista: quem não diz que olhou tudo não acusa", () => {
    // Se um dia alguém acrescentar um chamador e esquecer o terceiro
    // argumento, o pior que acontece é a tela dizer "não deu para confirmar".
    const r = conferirPublicacao([local("a", "PE 099/2025")], []);
    expect(r[0]!.situacao).not.toBe("ausente");
  });

  it("achar é prova positiva e vale mesmo em varredura parcial", () => {
    // A assimetria é o ponto: presença é fato, ausência é inferência.
    const r = conferirPublicacao([local("a", "PE 014/2025")], [noPncp("0014", 2025)]);
    expect(r[0]!.situacao).toBe("publicada");
    expect(r[0]!.correspondente).not.toBeNull();
  });

  it("o resumo separa o que falta do que não deu para conferir", () => {
    const resumo = resumirConferencia(
      conferirPublicacao([local("a", "PE 014/2025"), local("b", "PE 099/2025")], [noPncp("0014", 2025)])
    );
    expect(resumo.publicadas).toBe(1);
    expect(resumo.ausentes).toHaveLength(0);
    expect(resumo.indeterminadas.map((c) => c.licitacao.id)).toEqual(["b"]);
  });
});

describe("o que o PNCP tem e o cadastro não", () => {
  it("aponta os processos que ninguém digitou", () => {
    // O histórico real da prefeitura é público e obrigatório desde abril de
    // 2024. Era ele que faltava para fracionamento e concentração de
    // fornecedor pararem de rodar sobre o que alguém teve paciência de digitar.
    const faltando = processosSoNoPncp(
      [local("a", "PE 014/2025")],
      [noPncp("0014", 2025), noPncp("0099", 2025), noPncp("0100", 2025)]
    );
    expect(faltando.map((c) => c.numeroCompra)).toEqual(["0099", "0100"]);
  });

  it("não oferece para importar o que já está cadastrado em outro formato", () => {
    // "PE 014/2025" e "0014" são o mesmo processo. Se as duas direções não
    // usassem a mesma regra de casamento, o gestor importaria cópias.
    expect(processosSoNoPncp([local("a", "PE 014/2025")], [noPncp("0014", 2025)])).toHaveLength(0);
  });

  it("número local sem ano casa com qualquer ano, como na conferência", () => {
    // A conferência dá "14" como publicado pelo "0014/2025". A inversa precisa
    // concordar, senão um processo apareceria como publicado E como faltando.
    expect(processosSoNoPncp([local("a", "14")], [noPncp("0014", 2025)])).toHaveLength(0);
  });

  it("o mesmo número em ano diferente é outro processo", () => {
    const faltando = processosSoNoPncp([local("a", "PE 014/2025")], [noPncp("0014", 2026)]);
    expect(faltando).toHaveLength(1);
    expect(faltando[0]!.anoCompra).toBe(2026);
  });

  it("contratação do PNCP sem número aproveitável não entra na importação", () => {
    // Sem número não há como casar depois, e importar isso criaria uma linha
    // que a conferência do ano seguinte acusaria de não publicada.
    expect(processosSoNoPncp([], [{ ...noPncp("", 2025), numeroCompra: "" }])).toHaveLength(0);
  });

  it("cadastro vazio devolve tudo — é o caso de quem acabou de contratar", () => {
    expect(processosSoNoPncp([], [noPncp("0014", 2025), noPncp("0015", 2025)])).toHaveLength(2);
  });
});

describe("número do PNCP reinicia por modalidade", () => {
  // Achado dos dados REAIS, não de raciocínio: 496 contratações de um município
  // no ano têm só 416 pares número+ano distintos. "Dispensa 5/2026" e
  // "Pregão 5/2026" são processos diferentes com o mesmo número.
  const pregao = { ...noPncp("0005", 2026), modalidade: "Pregão - Eletrônico", numeroControlePncp: "97229181000164-1-000111/2026" };
  const dispensa = { ...noPncp("0005", 2026), modalidade: "Dispensa", numeroControlePncp: "97229181000164-1-000222/2026" };

  it("não dá por publicada uma dispensa por causa do pregão homônimo", () => {
    // O erro na direção pior: tranquilizar o gestor sobre contrato que, sem
    // divulgação, não produz efeito (art. 94).
    const r = conferirPublicacao(
      [{ id: "a", numero: "Dispensa 05/2026", objeto: "x", status: "publicada", modalidade: "Dispensa por valor" }],
      [pregao],
      true
    );
    expect(r[0]!.situacao).toBe("ausente");
  });

  it("a modalidade desempata e acha o processo certo", () => {
    const r = conferirPublicacao(
      [{ id: "a", numero: "05/2026", objeto: "x", status: "publicada", modalidade: "dispensa" }],
      [pregao, dispensa],
      true
    );
    expect(r[0]!.situacao).toBe("publicada");
    expect(r[0]!.correspondente?.numeroControlePncp).toBe(dispensa.numeroControlePncp);
  });

  it("empate que a modalidade não resolve fica indeterminado, não chutado", () => {
    // Sem modalidade no cadastro, escolher um dos dois seria escolher no
    // escuro, e as duas escolhas erradas mentem.
    const r = conferirPublicacao([local("a", "05/2026")], [pregao, dispensa], true);
    expect(r[0]!.situacao).toBe("indeterminada");
    expect(r[0]!.motivo).toBe("numero_ambiguo");
    expect(r[0]!.correspondente).toBeNull();
  });

  it("a chave do portal não tem ambiguidade para resolver", () => {
    const r = conferirPublicacao(
      [{ id: "a", numero: "05/2026", objeto: "x", status: "publicada", numeroControlePncp: dispensa.numeroControlePncp }],
      [pregao, dispensa],
      true
    );
    expect(r[0]!.situacao).toBe("publicada");
    expect(r[0]!.correspondente?.modalidade).toBe("Dispensa");
  });

  it("processo importado que saiu do portal aparece como ausente, não como outro", () => {
    // Se o casamento fosse por número, o pregão homônimo ocuparia o lugar dele
    // e a ausência sumiria.
    const r = conferirPublicacao(
      [{ id: "a", numero: "05/2026", objeto: "x", status: "publicada", numeroControlePncp: dispensa.numeroControlePncp }],
      [pregao],
      true
    );
    expect(r[0]!.situacao).toBe("ausente");
  });

  it("a importação não esconde o pregão por causa da dispensa cadastrada", () => {
    // Era a mesma colisão na outra direção: 80 dos 496 processos do município
    // desapareceriam da oferta de importação, sem aviso.
    const faltando = processosSoNoPncp(
      [{ id: "a", numero: "05/2026", objeto: "x", status: "publicada", modalidade: "Dispensa" }],
      [pregao, dispensa]
    );
    expect(faltando.map((c) => c.modalidade)).toEqual(["Pregão - Eletrônico"]);
  });

  it("reimportar o ano não cria segunda cópia", () => {
    // A chave exata no cadastro é o que torna o clique duplo inofensivo, antes
    // mesmo do índice único do banco entrar em ação.
    const jaImportados = [pregao, dispensa].map((c) => ({
      id: c.numeroControlePncp,
      numero: `${c.numeroCompra}/${c.anoCompra}`,
      objeto: "x",
      status: "publicada",
      numeroControlePncp: c.numeroControlePncp,
      modalidade: c.modalidade,
    }));
    expect(processosSoNoPncp(jaImportados, [pregao, dispensa])).toHaveLength(0);
  });

  it("sem modalidade em nenhum dos lados, prefere não oferecer a duplicar", () => {
    const faltando = processosSoNoPncp([local("a", "05/2026")], [dispensa]);
    expect(faltando).toHaveLength(0);
  });

  it("reconhece a família da modalidade apesar da grafia do portal", () => {
    expect(familiaModalidade("Pregão - Eletrônico")).toBe("pregao");
    expect(familiaModalidade("pregao eletronico")).toBe("pregao");
    expect(familiaModalidade("Concorrência - Eletrônica")).toBe("concorrencia");
    expect(familiaModalidade("Dispensa por valor")).toBe("dispensa");
    expect(familiaModalidade("Inexigibilidade")).toBe("inexigibilidade");
    expect(familiaModalidade("")).toBeNull();
    expect(familiaModalidade(null)).toBeNull();
    // Texto que não é modalidade nenhuma não pode virar família por acidente:
    // uma família errada desempataria para o lado errado.
    expect(familiaModalidade("processo administrativo")).toBeNull();
  });
});

describe("importar do PNCP para o cadastro", () => {
  it("guarda a data da PUBLICAÇÃO, não a da importação", () => {
    // Este é o defeito que a função existe para não ter. A tela filtra o
    // fracionamento por exercício (createdAt começando com o ano). Se a
    // importação gravasse o instante de hoje, as 336 dispensas de 2025 de um
    // município entrariam no exercício corrente, e o detector somaria dois anos
    // num grupo só — exatamente a acusação do art. 75, § 1º, sobre um fato que
    // não aconteceu.
    const campos = paraLicitacaoLocal(noPncp("0014", 2025))!;
    expect(campos.createdAt.startsWith("2025")).toBe(true);
  });

  it("sem data de publicação, cai no 1º de janeiro do ano da compra — nunca em hoje", () => {
    const campos = paraLicitacaoLocal({ ...noPncp("0014", 2025), publicadaEm: "" })!;
    expect(campos.createdAt).toBe("2025-01-01");
  });

  it("o número guardado traz o ano, para a conferência do ano seguinte reencontrá-lo", () => {
    const campos = paraLicitacaoLocal(noPncp("0014", 2025))!;
    expect(campos.numero).toBe("0014/2025");
    expect(anoDoNumero(campos.numero)).toBe(2025);
    // O teste que fecha o círculo: o que foi importado é dado como publicado.
    const r = conferirPublicacao([local("x", campos.numero)], [noPncp("0014", 2025)], true);
    expect(r[0]!.situacao).toBe("publicada");
  });

  it("entra como publicada, nunca homologada", () => {
    // O endpoint de consulta diz que foi DIVULGADA. Marcar homologada faria o
    // detector de concentração de fornecedor rodar sobre um vencedor que a
    // consulta não informa.
    expect(paraLicitacaoLocal(noPncp("0014", 2025))!.status).toBe("publicada");
  });

  it("objeto vazio não vira linha em branco no cadastro", () => {
    const campos = paraLicitacaoLocal({ ...noPncp("0014", 2025), objeto: "   " })!;
    expect(campos.objeto).toBe("Objeto não informado no PNCP");
  });

  it("recusa contratação sem número aproveitável", () => {
    expect(paraLicitacaoLocal({ ...noPncp("0014", 2025), numeroCompra: "s/n" })).toBeNull();
  });
});

describe("link para o PNCP", () => {
  it("monta o endereço público a partir do número de controle", () => {
    const link = linkPncp(noPncp("0014", 2025));
    expect(link).toContain("pncp.gov.br/app/editais/87990800000185/2025/");
  });

  it("devolve null quando o número de controle não tem o formato esperado", () => {
    // Melhor não oferecer link do que oferecer um que abre em erro.
    expect(linkPncp({ ...noPncp("0014", 2025), numeroControlePncp: "formato-estranho" })).toBeNull();
  });
});
