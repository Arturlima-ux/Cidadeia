// ── POLÍTICA DE PRIVACIDADE E TERMOS DE USO ──
//
// O rodapé linkava os dois para /sobre, que é "Segurança & LGPD" — uma página
// que explica COMO os dados são protegidos, não um documento que diz o que é
// coletado, com que base legal e por quanto tempo. Não é a mesma coisa, e o
// setor jurídico de uma prefeitura sabe disso: é a primeira pasta que ele abre
// antes de autorizar a contratação.
//
// O texto é curto de propósito. Política longa e genérica é a que ninguém lê e
// que descreve um produto que não é este — fala de rastreadores de terceiros,
// perfis publicitários e transferência internacional que aqui não existem.
// Cada afirmação abaixo corresponde a algo verificável no código:
//
//   - o contato do site é um `mailto:` (ContatoEmail.tsx), então nenhum
//     formulário de contato grava dado em servidor nosso;
//   - o diagnóstico roda inteiro no navegador — a pasta app/diagnostico tem
//     só page.tsx, sem action nem rota de escrita;
//   - a sessão é um cookie httpOnly assinado (lib/sessao.ts);
//   - a exclusão em cascata está declarada em 20 tabelas (db/schema.ts), o que
//     é o que torna verdadeira a promessa de apagar tudo junto com a conta;
//   - as consultas externas vão a SICONFI, PNCP e IBGE, todas públicas, e a
//     nenhuma delas se envia dado de usuário.
//
// SE ALGUMA DESSAS COISAS MUDAR, ESTE ARQUIVO MUDA JUNTO. Documento legal que
// descreve um sistema que não existe mais é pior que documento nenhum: vira
// declaração falsa assinada.

/** Data da última revisão, mostrada nas duas páginas. */
export const VIGENCIA_DOCUMENTOS = "9 de setembro de 2026";

export type SecaoLegal = { titulo: string; paragrafos: string[] };

export const POLITICA_PRIVACIDADE: SecaoLegal[] = [
  {
    titulo: "Quem é responsável pelos dados",
    paragrafos: [
      "Há dois papéis diferentes aqui, e confundi-los é o erro mais comum. Sobre os dados de quem VISITA ou usa este site, o CidadeIA é o controlador. Sobre os dados que uma prefeitura cliente cadastra no sistema — inclusive manifestações de cidadãos e informações de saúde e educação —, o controlador é o município, e o CidadeIA atua como operador, tratando apenas o que o município determina.",
      "Isso não é formalidade: significa que um cidadão que queira exercer direitos sobre dados que estão no sistema de uma prefeitura deve procurar aquela prefeitura, que é quem decide sobre eles. O acordo de tratamento de dados que rege essa relação vai anexo ao contrato e está disponível no kit de contratação, sem cadastro.",
    ],
  },
  {
    titulo: "O que este site coleta de quem apenas navega",
    paragrafos: [
      "Praticamente nada, e isso é verificável. O canal de contato é um endereço de e-mail comum: ao clicar, abre o seu próprio programa de e-mail, e a mensagem vai direto para nós sem passar por formulário nosso. O diagnóstico de conformidade roda inteiro no seu navegador — as respostas não são enviadas nem armazenadas em servidor algum, e fechar a aba as apaga.",
      "Não usamos rastreadores de publicidade, não montamos perfil de navegação e não vendemos nem compartilhamos dado com terceiros para fins comerciais.",
    ],
  },
  {
    titulo: "O que é coletado de quem cria conta",
    paragrafos: [
      "No cadastro: nome, CPF ou CNPJ, e-mail, telefone quando informado, e os dados da prefeitura — município, estado, CNPJ, população e cargo do usuário. A finalidade é identificar quem entra, separar o acesso por cargo e emitir a proposta de contratação. A base legal é a execução do contrato, ou os procedimentos preliminares a ele, nos termos do art. 7º, V da LGPD.",
      "A senha nunca é guardada em texto legível: fica apenas o resultado de uma função de hash (bcrypt), que não permite recuperar a senha original. A sessão é um cookie assinado e inacessível por JavaScript, usado só para manter você conectado.",
      "Durante o uso, o sistema registra o que você mesmo cadastra — indicadores, obras, licitações, publicações do portal e manifestações recebidas. Esses dados pertencem ao município.",
    ],
  },
  {
    titulo: "Com quem os dados são compartilhados",
    paragrafos: [
      "Com os prestadores necessários para o serviço funcionar, e nada além disso: a hospedagem da aplicação, o banco de dados e o serviço de envio de e-mails transacionais — como a recuperação de senha. Todos tratam os dados sob nossa instrução e para as finalidades descritas aqui.",
      "As consultas que o sistema faz a bases externas — SICONFI do Tesouro Nacional, PNCP e IBGE — são de leitura e usam apenas identificadores públicos do município, como o código IBGE. Nenhum dado pessoal é enviado a elas.",
      "Quando a funcionalidade de inteligência artificial estiver ativa, o texto enviado para análise contém dados de gestão do município e é processado por um provedor contratado, sob acordo que veda o uso desse conteúdo para treinar modelos.",
    ],
  },
  {
    titulo: "Por quanto tempo ficam guardados",
    paragrafos: [
      "Enquanto a conta existir. Encerrada a relação, os dados da prefeitura e de seus usuários são apagados a pedido, e a exclusão é em cascata — apagar a prefeitura apaga junto tudo o que estava vinculado a ela, sem sobras em tabelas soltas.",
      "Antes de sair, o município pode exportar tudo em CSV e JSON, a qualquer momento, sem custo e sem precisar de autorização nossa. A saída é um direito escrito no contrato, não um favor.",
    ],
  },
  {
    titulo: "Seus direitos",
    paragrafos: [
      "A LGPD garante confirmação da existência de tratamento, acesso, correção, anonimização, portabilidade, informação sobre compartilhamento e revogação do consentimento quando ele for a base legal. Para dados de conta e cadastro, fale conosco pelo canal de contato do site.",
      "Para dados que estão no sistema de uma prefeitura — um protocolo de ouvidoria, por exemplo —, o pedido deve ser dirigido àquele município, que é o controlador. Se recebermos um pedido desses, encaminhamos ao município e informamos você.",
    ],
  },
];

export const TERMOS_DE_USO: SecaoLegal[] = [
  {
    titulo: "O que é este serviço",
    paragrafos: [
      "O CidadeIA é um sistema de acompanhamento de gestão municipal, contratado por módulos. Ele organiza dados que a própria prefeitura cadastra, aplica regras públicas sobre eles e avisa quando algo exige decisão.",
      "As áreas do site abertas sem login — home, preços, Raio-X, diagnóstico, kit de contratação e portais de transparência publicados — podem ser usadas por qualquer pessoa. As áreas internas exigem conta e vínculo com uma prefeitura.",
    ],
  },
  {
    titulo: "O que o sistema NÃO é",
    paragrafos: [
      "Isto é a parte que mais importa, e a que costuma faltar em termos de uso. Os cálculos de mínimos constitucionais, teto de despesa com pessoal e prazos legais são ACOMPANHAMENTO: servem para agir a tempo, não para prestar contas. A composição legal de cada um desses números tem inclusões e exclusões que só o contador da prefeitura fecha, e o valor oficial é sempre o do demonstrativo publicado.",
      "O sistema não substitui parecer jurídico, contábil ou de controle interno, e não assume responsabilidade por decisão tomada com base apenas no que ele mostra. Quando um dado informado estiver desatualizado, a tela deixa de concluir e diz isso — mas manter os dados atualizados é responsabilidade de quem os informa.",
      "Os textos gerados por inteligência artificial são apoio à leitura dos dados cadastrados, e devem ser conferidos antes de virar decisão ou documento oficial.",
    ],
  },
  {
    titulo: "Conta e responsabilidade de acesso",
    paragrafos: [
      "Criar conta é gratuito. A conta nasce sem módulo ativo: ela reserva o acesso, e os módulos são liberados com a contratação.",
      "Quem cria a conta responde pelo uso das credenciais e por quem cadastra dentro dela. Cada cargo enxerga o que lhe cabe — secretário vê a própria secretaria, o financeiro consolidado e a administração de usuários ficam com o prefeito. Comunicar imediatamente qualquer acesso indevido é obrigação do titular da conta.",
      "É vedado usar o sistema para inserir dado que você não tem autoridade para tratar, tentar acessar dados de outro município, ou explorar falhas de segurança. Encontrou uma, avise: a comunicação responsável é bem-vinda e não gera retaliação.",
    ],
  },
  {
    titulo: "Contratação, pagamento e encerramento",
    paragrafos: [
      "A contratação por órgão público segue a Lei 14.133/2021 e é formalizada por processo administrativo — dispensa por valor, adesão a ata ou pregão, conforme o caso. Os preços de cada módulo estão publicados no site, por porte de município, e a proposta formal acompanha o termo de referência.",
      "O contrato é da prefeitura, não da gestão: mudança de prefeito não o encerra automaticamente nem transfere os dados a quem sai. Encerrada a relação, o município leva os dados em formato aberto, e a exclusão é feita a pedido.",
    ],
  },
  {
    titulo: "Disponibilidade e mudanças",
    paragrafos: [
      "O acordo de nível de serviço, com disponibilidade e prazo de atendimento, vai anexo ao contrato. Interrupções programadas para manutenção são comunicadas com antecedência.",
      "Estes termos podem mudar quando o produto mudar. A data de revisão aparece no topo da página, e alterações que afetem direitos de clientes contratados são comunicadas antes de valer.",
    ],
  },
  {
    titulo: "Foro",
    paragrafos: [
      "Fica eleito o foro da comarca do município contratante para dirimir controvérsias decorrentes da relação contratual, na forma da legislação aplicável às contratações públicas.",
    ],
  },
];
