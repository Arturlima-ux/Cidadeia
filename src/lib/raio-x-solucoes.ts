import { proporcaoDaReceita } from "@/lib/raio-x-calculo";
import type { PlanoAddon } from "@/lib/planos";

// ── DO DIAGNÓSTICO PARA A SOLUÇÃO ──
//
// O Raio-X mostra o que o Tesouro publicou sobre a prefeitura e termina
// ali. Quem lê fica com o problema na mão e sem o passo seguinte — e "ver
// soluções" num menu genérico não responde ao que a pessoa acabou de ler.
//
// Isto liga uma coisa na outra: cada achado daquele município puxa o
// módulo que trata exatamente aquilo, citando o número que apareceu na
// tela acima. Não é uma lista de produtos; é a resposta à pergunta que o
// próprio Raio-X levantou.
//
// ── O QUE NÃO FAZ ──
// Não acusa. O Raio-X inteiro é escrito em tom público — "não consta",
// não "descumpriu" — e aqui é igual. Os percentuais da receita são
// indício, não cálculo de mínimo constitucional, e cada texto diz isso.
// Vender com o medo de um cálculo que a gente não fez seria mentir.
//
// Função pura, sem rede e sem banco: é o que os testes cobrem.

export type SolucaoSugerida = {
  /** O módulo que trata este achado. */
  modulo: PlanoAddon;
  /** O achado, na linguagem de quem leu o Raio-X. */
  achado: string;
  /** Por que isso apareceu — sempre com o número real da tela acima. */
  porque: string;
  /** O que o módulo faz com isso, em capacidade concreta, não promessa. */
  resolve: string;
  /** Ordena a lista: o que dói mais primeiro. Fica interno. */
  peso: number;
};

export type EntradaSolucoes = {
  municipio: string;
  codigoIbge: string;
  receita: number | null;
  despesaSaude: number | null;
  despesaEducacao: number | null;
  despesaObras: number | null;
  rreoFaltando: number[];
  rreoEsperados: number;
  bimestreReferencia: number | null;
};

/**
 * Abaixo destes indícios vale chamar atenção. Não são os mínimos
 * constitucionais (25% e 15%): a base legal do mínimo não é a receita
 * total, e usar estes números como veredito seria erro nosso.
 */
const INDICIO_EDUCACAO = 25;
const INDICIO_SAUDE = 15;

export function solucoesParaORaioX(e: EntradaSolucoes): SolucaoSugerida[] {
  const lista: SolucaoSugerida[] = [];
  const pSaude = proporcaoDaReceita(e.despesaSaude, e.receita);
  const pEducacao = proporcaoDaReceita(e.despesaEducacao, e.receita);
  const pct = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

  // ── o relatório que não consta ──
  if (e.rreoFaltando.length > 0) {
    lista.push({
      modulo: "gestao",
      achado: `${e.rreoFaltando.length} relatório(s) bimestral(is) sem constar no Tesouro`,
      porque: `Dos ${e.rreoEsperados} bimestres já encerrados neste exercício, ${e.rreoFaltando.map((b) => `${b}º`).join(", ")} não aparecem na consulta ao SICONFI. Pode ser atraso de publicação, e é assim que o tribunal de contas vê primeiro.`,
      resolve:
        "O calendário das obrigações fiscais do ano — RREO, gestão fiscal, SIOPS e SIOPE — com aviso antes do prazo. O sistema consulta o Tesouro para saber se o relatório foi mesmo entregue, e o alerta some sozinho quando ele aparece lá.",
      peso: 40,
    });
  }

  // ── a aplicação por área, como indício ──
  if (pEducacao !== null && pEducacao < INDICIO_EDUCACAO) {
    lista.push({
      modulo: "gestao",
      achado: `Educação em ${pct(pEducacao)}% da receita até aqui`,
      porque: `Indício, não cálculo do mínimo: a base legal dos 25% não é a receita total. Mas é o tipo de número que, se estiver mesmo baixo em dezembro, não dá mais para corrigir.`,
      resolve:
        "O acompanhamento dos mínimos de 25% em educação e 15% em saúde durante o exercício, com a base informada pelo contador: quanto falta aplicar para fechar o ano dentro do mínimo, e quantas vezes o ritmo mensal precisa subir para chegar lá.",
      peso: 32,
    });
  }
  if (pSaude !== null && pSaude < INDICIO_SAUDE) {
    lista.push({
      modulo: "gestao",
      achado: `Saúde em ${pct(pSaude)}% da receita até aqui`,
      porque: "Mesmo caso da educação: indício sobre a receita total, não o cálculo do mínimo. Serve para olhar agora, enquanto o exercício corre.",
      resolve:
        "O mesmo acompanhamento, com o ritmo necessário até dezembro — e o calendário do SIOPS, que é por onde esse número é prestado.",
      peso: 30,
    });
  }

  // ── o que base pública nenhuma mostra ──
  lista.push({
    modulo: "saude",
    achado: "O Tesouro diz quanto foi gasto; não diz o que está acontecendo na UBS",
    porque: `Nenhuma base pública mostra a unidade sem médico hoje, a insulina que acabou ontem ou a UBS com cadastro parado no CNES há mais de um ano.`,
    resolve:
      "A rede inteira vem do CNES em um clique, cada unidade ganha ficha e um acesso próprio para a gerência registrar o que está acontecendo, e o estoque avisa em quantos dias o remédio acaba — antes de faltar.",
    peso: 20,
  });

  lista.push({
    modulo: "educacao",
    achado: "Nem quantos alunos a prefeitura está atendendo sem receber por eles",
    porque:
      "O FUNDEB paga por aluno declarado ao Censo Escolar. Aluno que a escola tem e não declarou é repasse que o município não recebe — e nenhum relatório público mostra essa diferença.",
    resolve:
      "A rede vem do Censo Escolar, cada escola informa a matrícula de hoje, e o sistema converte a diferença em reais. Junto: os 200 dias letivos da LDB contados sozinhos, os 30% da agricultura familiar no PNAE e o ofício de busca ativa ao Conselho Tutelar saindo pronto.",
    peso: 18,
  });

  if (e.despesaObras !== null && e.despesaObras > 0) {
    lista.push({
      modulo: "obras",
      achado: "Investimento publicado, sem dizer o que está parado",
      porque: `O Tesouro registra o valor investido no exercício, e nada além. Obra parada há meses aparece no mesmo número de obra andando no prazo.`,
      resolve:
        "Cada obra com progresso previsto contra o realizado, e a que está atrasada em destaque no mapa da cidade — com a data da última atualização à vista.",
      peso: 14,
    });
  }

  lista.push({
    modulo: "essencial",
    achado: "E o cidadão de " + e.municipio + " ainda precisa de um canal que conte o prazo",
    porque:
      "A Lei de Acesso à Informação dá 20 dias para responder e a Lei 13.460 dá 30. O prazo corre com ou sem sistema; sem sistema, ninguém sabe qual vence amanhã.",
    resolve:
      "Portal público próprio do município, ouvidoria que aceita manifestação sem identificação, protocolo com chave de consulta na hora, e a contagem dos dois prazos legais com aviso cinco dias antes de vencer.",
    peso: 10,
  });

  return lista.sort((a, b) => b.peso - a.peso);
}

/**
 * A frase de abertura da seção, que muda conforme o que foi achado.
 * Quando não há nada de errado nos números públicos, ela diz isso — e
 * muda o argumento para o que a base pública não alcança, em vez de
 * fingir um problema que não apareceu.
 */
export function resumoDasSolucoes(e: EntradaSolucoes): string {
  const pSaude = proporcaoDaReceita(e.despesaSaude, e.receita);
  const pEducacao = proporcaoDaReceita(e.despesaEducacao, e.receita);
  const achados =
    (e.rreoFaltando.length > 0 ? 1 : 0) +
    (pEducacao !== null && pEducacao < INDICIO_EDUCACAO ? 1 : 0) +
    (pSaude !== null && pSaude < INDICIO_SAUDE ? 1 : 0);

  if (achados === 0) {
    return `Nos números públicos, ${e.municipio} está em dia — relatórios constando e aplicação dentro do que se espera. O que segue não é correção de problema: é o que base pública nenhuma alcança.`;
  }
  return `O Raio-X acima levantou ${achados === 1 ? "um ponto" : `${achados} pontos`} em ${e.municipio}. Abaixo, o que o CidadeIA faz com cada um — e o que ele vê que o Tesouro não publica.`;
}
