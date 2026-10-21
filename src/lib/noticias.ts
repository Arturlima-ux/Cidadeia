// ── NOTÍCIAS: O QUE MUDOU NO PRODUTO, COM DATA ──
//
// Só entra aqui o que já está no ar, na data em que entrou. Nada de
// "em breve", nada de matéria sobre o setor escrita para encher página:
// num site que vende conformidade, uma notícia que promete o que não existe
// desmonta o resto. Cada item aponta para onde a novidade pode ser vista.

export type Noticia = {
  /** AAAA-MM-DD, o dia em que entrou no ar. */
  data: string;
  categoria: "Produto" | "Portal do cidadão" | "Dados públicos";
  titulo: string;
  resumo: string;
  /** Onde ver. */
  link?: { href: string; rotulo: string };
};

export const NOTICIAS: Noticia[] = [
  {
    data: "2026-10-20",
    categoria: "Produto",
    titulo: "A Visão do prefeito ganha o painel do vídeo, com a despesa com pessoal como gráfico de bolsa",
    resumo:
      "Despesa com pessoal, protocolos abertos e obras no prazo no alto do painel, e a série da despesa nas linhas de 48,6%, 51,3% e 54% da LRF, com valor e data ao passar o dedo e a projeção quando há aviso antecipado. A primeira importação do RGF passa a trazer os quatro anos já publicados no Tesouro.",
    link: { href: "/demo", rotulo: "Ver na demonstração" },
  },
  {
    data: "2026-10-20",
    categoria: "Dados públicos",
    titulo: "Educação lê o SIOPE do FNDE: prazos e mínimos pelo número oficial",
    resumo:
      "O módulo Educação passa a ler o SIOPE: aviso de declaração em atraso, que suspende transferências voluntárias (Lei 14.113/2020, art. 38, § 1º), e os mínimos de 25% em manutenção do ensino e de 70% do FUNDEB pelo número declarado ao FNDE.",
    link: { href: "/modulos/educacao", rotulo: "Conhecer o módulo Educação" },
  },
  {
    data: "2026-10-20",
    categoria: "Dados públicos",
    titulo: "Saúde acompanha a dengue pelo InfoDengue, da Fiocruz, com as cidades vizinhas",
    resumo:
      "Alerta de dengue e chikungunya do município e das cidades ao redor, semana a semana, para a prefeitura agir antes de a transmissão chegar. As obras federais de saúde do município aparecem na mesma tela.",
    link: { href: "/modulos/saude", rotulo: "Conhecer o módulo Saúde" },
  },
  {
    data: "2026-10-20",
    categoria: "Produto",
    titulo: "Obras: o esperado sai do prazo do contrato, e as obras federais entram sozinhas",
    resumo:
      "O cadastro pede início e término, e o painel calcula todo dia quanto a obra já deveria ter andado. As obras federais do município são lidas no ObrasGov toda semana, com aviso de obra paralisada, atrasada ou sem medição.",
    link: { href: "/modulos/obras", rotulo: "Conhecer o módulo Obras" },
  },
  {
    data: "2026-10-20",
    categoria: "Produto",
    titulo: "E-mails com padrão de empresa, e a ouvidoria falando com a voz da prefeitura",
    resumo:
      "Os e-mails do sistema passam a sair num modelo único, com marca, motivo do envio, descadastro e versão em texto. A resposta ao cidadão sai em nome da prefeitura.",
  },
  {
    data: "2026-10-16",
    categoria: "Portal do cidadão",
    titulo: "Portal do cidadão: Pergunte à cidade, Perto de você e dados abertos",
    resumo:
      "O morador pergunta em uma frase e recebe endereço, telefone e link; sem resposta, a pergunta vira pedido de informação já preenchido. Também chegaram as unidades de saúde, escolas e obras mais próximas, os conjuntos de dados em CSV e JSON e o painel de acessibilidade com \"Ouvir esta página\".",
    link: { href: "/transparencia", rotulo: "Abrir o portal" },
  },
  {
    data: "2026-10-16",
    categoria: "Portal do cidadão",
    titulo: "\"A resposta resolveu?\": o cidadão avalia a ouvidoria",
    resumo:
      "Em um toque, o cidadão diz se a resposta da prefeitura resolveu. A satisfação aparece no portal, e o \"não resolveu\" chega na hora a quem respondeu.",
  },
  {
    data: "2026-10-14",
    categoria: "Produto",
    titulo: "Importação automática toda semana, e a Segunda do prefeito por e-mail",
    resumo:
      "RGF e RREO do Tesouro, unidades do CNES e processos e contratos do PNCP entram sozinhos toda semana, conforme os módulos contratados. Toda segunda, o prefeito recebe um resumo com as decisões e os prazos da semana, e cada secretário recebe o da sua área.",
  },
  {
    data: "2026-10-14",
    categoria: "Produto",
    titulo: "O alerta vai para quem resolve",
    resumo:
      "O secretário da área recebe e vê os alertas dele; o prefeito recebe o urgente de todas as áreas. A ouvidoria avisa por e-mail quem precisa responder e confirma ao cidadão cada etapa.",
  },
  {
    data: "2026-10-13",
    categoria: "Dados públicos",
    titulo: "Panorama por estado: as prefeituras de cada UF na régua da LRF",
    resumo:
      "Uma página por estado, com os números das prefeituras dele ao lado dos do país, atualizada toda segunda a partir do Tesouro Nacional.",
    link: { href: "/panorama", rotulo: "Ver o panorama" },
  },
  {
    data: "2026-10-07",
    categoria: "Produto",
    titulo: "Vigia fiscal: entrega do RREO e do RGF conferida todo dia no Tesouro",
    resumo:
      "O módulo Gestão confere diariamente se cada relatório consta entregue, comum ou simplificado, e avisa antes do prazo, no dia do atraso e quando os números do RGF não fecham. O alerta some sozinho quando a entrega aparece.",
    link: { href: "/modulos/gestao", rotulo: "Conhecer o módulo Gestão" },
  },
];

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "20 de outubro de 2026" */
export function dataDaNoticia(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}
