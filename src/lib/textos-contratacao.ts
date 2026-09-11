// ── TEXTOS DA CONTRATAÇÃO E DA CONFORMIDADE ──
//
// Viviam dentro de src/app/page.tsx. Saíram de lá quando a home encolheu:
// as seções "Como sai do papel" e "Antes de assinar" viraram páginas
// próprias (/como-contratar e /conformidade), e a home ficou com um resumo
// de quatro passos que aponta para elas. O conteúdo é o mesmo — mudou de
// endereço, não de teor.

export const OBJECOES = [
  {
    pergunta: "E se mudar o prefeito?",
    resposta:
      "O contrato é da prefeitura, não da gestão. E os dados são do município: exportação completa em formato aberto a qualquer momento, sem custo e sem pedir autorização.",
  },
  {
    pergunta: "E o que já está no sistema atual?",
    resposta:
      "Importação por planilha, feita junto com a implantação. Não é preciso desligar o sistema antigo antes — os dois rodam em paralelo durante a transição.",
  },
  {
    pergunta: "Quem responde se o sistema cair?",
    resposta:
      "O acordo de nível de serviço vai anexo ao contrato, com disponibilidade e prazo de atendimento definidos, e um canal de suporte nomeado.",
  },
  {
    pergunta: "Precisa de servidor e equipe de TI?",
    resposta:
      "Não. Roda no navegador. Sem servidor na prefeitura, sem licença de sistema operacional, sem licitação de infraestrutura e sem TI dedicada.",
  },
  {
    pergunta: "Como fica a LGPD?",
    resposta:
      "O município é o controlador dos dados; nós somos operadores. O acordo de tratamento vai no kit, e os dados de cada município ficam isolados.",
  },
  {
    pergunta: "E o secretário, vê tudo?",
    resposta:
      "Não. Cada secretário enxerga apenas a própria área. O financeiro consolidado e a administração de usuários ficam restritos ao prefeito.",
  },
];

export const CONFORMIDADE = [
  {
    exigencia: "Transparência ativa",
    lei: "Lei 12.527/2011 (LAI)",
    entrega: "Portal público com endereço próprio do município, acessível sem cadastro.",
  },
  {
    exigencia: "Manifestação anônima",
    lei: "Lei 13.460/2017, art. 10",
    entrega:
      "Ouvidoria aceita denúncia sem identificação, com protocolo aleatório — não dá para enumerar denúncias em sequência.",
  },
  {
    exigencia: "Acompanhamento do pedido",
    lei: "Lei 13.460/2017, art. 10, VI",
    entrega: "Número de protocolo e chave privada na hora; o cidadão consulta o andamento sozinho.",
  },
  {
    exigencia: "Proteção de dados",
    lei: "Lei 13.709/2018 (LGPD)",
    entrega: "Dados de cada município isolados, senhas com hash e acesso por perfil.",
  },
  {
    exigencia: "Prestação de contas",
    lei: "Tribunal de Contas do Estado",
    entrega: "Relatório executivo em PDF da prefeitura ou de uma secretaria, sem limite de geração.",
  },
];

export const IMPLANTACAO = [
  {
    n: "01",
    titulo: "Processo montado",
    texto: "Com o termo de referência e as certidões que vão no kit.",
  },
  {
    n: "02",
    titulo: "Cadastro e módulos",
    texto: "CNPJ, dados do município e as áreas que a prefeitura vai usar.",
  },
  {
    n: "03",
    titulo: "Acessos e importação",
    texto: "Cada secretário na própria área; os dados do sistema antigo entram por planilha.",
  },
  {
    n: "04",
    titulo: "Portal no ar",
    texto: "O endereço de transparência do município passa a responder.",
    fim: true,
  },
];
