import { EMPRESA, type DadosEmpresa } from "@/lib/empresa";
import { CONTATO_PUBLICO } from "@/lib/contato-comercial";

// ── POLÍTICA DE PRIVACIDADE E TERMOS DE USO ──
//
// O rodapé linkava os dois para /sobre (hoje /seguranca), que explica COMO os
// dados são protegidos, e não o que é coletado, com que base legal e por
// quanto tempo. O jurídico da prefeitura abre esta pasta antes de autorizar.
//
// Cada afirmação corresponde a algo verificável no código. A revisão de
// outubro de 2026 achou a versão de setembro desatualizada: dizia que não
// havia formulário (há o pedido de proposta e o de ligação), não nomeava
// controlador nem encarregado, não falava de transferência internacional nem
// do provedor de inteligência artificial, e calava sobre os dados de saúde e
// de crianças e adolescentes que os módulos novos tratam. O que mudou:
//
//   - formulários: pedido de proposta (pedidos_proposta: nome, cargo, e-mail,
//     telefone, município, módulos, observação), pedido de ligação (nome,
//     cargo, telefone, horário) e aviso do Raio-X (leads: nome, cargo,
//     e-mail, município);
//   - visitas: contadas sem cookie, com identificador diário embaralhado
//     (lib/registrar-evento.ts, lib/analytics.ts);
//   - conta: nome, CPF/CNPJ, e-mail, celular e foto de perfil opcionais
//     (usuarios.celular, usuarios.foto_url);
//   - hospedagem: Vercel na região gru1 e banco Supabase em sa-east-1 (São
//     Paulo), mas empresas estrangeiras; e-mail por Gmail ou Resend;
//     inteligência artificial pela Anthropic, nos Estados Unidos;
//   - a IA recebe dados de gestão e, das manifestações, só tipo, situação e
//     datas (lib/ia.ts), nunca texto, nome ou contato do cidadão.
//
// SE ALGUMA DESSAS COISAS MUDAR, ESTE ARQUIVO MUDA JUNTO. Documento legal que
// descreve um sistema que não existe mais vira declaração falsa assinada.

/** Data da última revisão, mostrada nas duas páginas. */
export const VIGENCIA_DOCUMENTOS = "23 de outubro de 2026";

export type SecaoLegal = { titulo: string; paragrafos: string[] };

/** Quem é o controlador, com o nome jurídico quando já está preenchido na Vercel. */
function quemSomos(e: DadosEmpresa): string {
  const id = [e.razaoSocial, e.cnpj ? `CNPJ ${e.cnpj}` : null, e.endereco].filter(Boolean).join(", ");
  return id ? `o CidadeIA (${id})` : "o CidadeIA";
}

function encarregado(e: DadosEmpresa): string {
  const email = e.encarregadoEmail ?? CONTATO_PUBLICO;
  return e.encarregadoNome
    ? `O encarregado pelo tratamento de dados pessoais (LGPD, art. 41) é ${e.encarregadoNome}, pelo e-mail ${email}.`
    : `O canal do encarregado pelo tratamento de dados pessoais (LGPD, art. 41) é o e-mail ${email}.`;
}

export function politicaDePrivacidade(e: DadosEmpresa = EMPRESA): SecaoLegal[] {
  return [
    {
      titulo: "Quem é responsável pelos dados",
      paragrafos: [
        `Há dois papéis diferentes, e confundi-los é o erro mais comum. Sobre os dados de quem visita este site, pede proposta ou cria conta, o controlador é ${quemSomos(e)}. Sobre os dados que uma prefeitura cliente trata no sistema, inclusive as manifestações de cidadãos e as informações de saúde e educação, o controlador é o município, e o CidadeIA atua como operador, tratando apenas o que o município determina.`,
        "Por isso, quem quiser exercer direitos sobre dados que estão no sistema de uma prefeitura deve procurar aquela prefeitura. O acordo de tratamento de dados que rege essa relação vai anexo ao contrato e está no kit de contratação, sem cadastro.",
        encarregado(e),
      ],
    },
    {
      titulo: "O que o site coleta de quem navega",
      paragrafos: [
        "As visitas são contadas sem cookie: o servidor guarda a página aberta, o tipo de aparelho, o site de origem e um identificador que muda todo dia e não permite saber quem é a pessoa. Não usamos rastreador de publicidade, não montamos perfil de navegação e não vendemos nem compartilhamos dado para fins comerciais.",
        "O diagnóstico de conformidade roda inteiro no navegador: as respostas não são enviadas a servidor algum. A busca de município e o botão de localização também: a posição do aparelho só vira o ponto no mapa e o nome da cidade mais próxima, calculados no próprio navegador.",
      ],
    },
    {
      titulo: "O que os formulários coletam",
      paragrafos: [
        "Pedido de proposta: nome, cargo, e-mail, telefone quando informado, município, módulos escolhidos e a observação que a pessoa escrever. Pedido de ligação: nome, cargo, telefone e o melhor horário. Aviso do Raio-X: nome, cargo, e-mail e município. A finalidade é responder ao pedido e conduzir a contratação, com base nos procedimentos preliminares a um contrato (LGPD, art. 7º, V) e no legítimo interesse de responder a quem nos procurou (art. 7º, IX).",
        "Esses dados ficam guardados enquanto houver conversa comercial e são apagados a pedido, pelo canal do encarregado.",
      ],
    },
    {
      titulo: "O que é coletado de quem tem conta",
      paragrafos: [
        "Nome, CPF ou CNPJ, e-mail, cargo e, se a pessoa quiser, celular e foto de perfil, além dos dados da prefeitura. A finalidade é identificar quem entra, separar o acesso por cargo e executar o contrato (LGPD, art. 7º, V).",
        "A senha nunca é guardada em texto legível: fica só o resultado de uma função de hash (bcrypt). A sessão é um cookie assinado e inacessível por JavaScript, usado só para manter a pessoa conectada.",
      ],
    },
    {
      titulo: "Dados de saúde e de crianças e adolescentes",
      paragrafos: [
        "Os módulos Saúde e Educação permitem que a prefeitura registre ocorrências nas unidades de saúde e acompanhe a busca ativa de alunos, inclusive com ofício ao Conselho Tutelar. Isso pode envolver dados pessoais sensíveis (LGPD, art. 11) e dados de crianças e adolescentes, que devem ser tratados no seu melhor interesse (art. 14).",
        "Nesses casos o controlador é o município, que trata os dados para executar políticas públicas e cumprir obrigações legais (art. 11, II, a e b). O sistema pede só o necessário: as ocorrências de saúde são sobre a unidade (falta de médico, de insumo, equipamento quebrado) e não têm campo para identificar paciente; a busca ativa guarda nome, turma, idade e frequência do aluno e só é vista pela escola dele, pela secretaria de educação, pelo prefeito e por quem administra a conta da prefeitura. O CidadeIA fornece ao município as informações sobre o sistema de que ele precisa para o relatório de impacto à proteção de dados (art. 38).",
      ],
    },
    {
      titulo: "Com quem os dados são compartilhados",
      paragrafos: [
        "Só com os prestadores necessários para o serviço funcionar, que tratam os dados sob nossa instrução: a hospedagem da aplicação (Vercel), o banco de dados (Supabase), o envio de e-mails (Google e Resend) e, quando a função de inteligência artificial é usada, o provedor do modelo (Anthropic).",
        "A inteligência artificial recebe dados de gestão do município, e das manifestações de cidadãos só o tipo, a situação e as datas, nunca o texto, o nome ou o contato de quem escreveu. O provedor trata esse conteúdo sob acordo que veda o seu uso para treinar modelos.",
        "As consultas a bases públicas (Tesouro Nacional, IBGE, PNCP, DataSUS, INEP, FNDE, Fiocruz, ObrasGov e Transferegov) são de leitura e usam só identificadores públicos do município, como o código IBGE e o CNPJ. Nenhum dado pessoal é enviado a elas.",
      ],
    },
    {
      titulo: "Transferência internacional",
      paragrafos: [
        "A aplicação e o banco de dados rodam em servidores em São Paulo. Mas os prestadores acima são empresas com sede no exterior, e o provedor de inteligência artificial processa os dados nos Estados Unidos, o que configura transferência internacional de dados pessoais (LGPD, art. 33). Ela se dá nos termos do art. 33 da LGPD e dos contratos com esses prestadores, que exigem medidas de segurança e proíbem uso dos dados para outra finalidade.",
      ],
    },
    {
      titulo: "Por quanto tempo ficam guardados",
      paragrafos: [
        "Os dados de conta e da prefeitura ficam enquanto o contrato existir. Encerrada a relação, são apagados a pedido, e a exclusão é em cascata: apagar a prefeitura apaga junto tudo o que estava vinculado a ela.",
        "Antes de sair, o município pode exportar tudo em CSV e JSON, a qualquer momento, sem custo e sem precisar de autorização nossa.",
      ],
    },
    {
      titulo: "Seus direitos",
      paragrafos: [
        "A LGPD garante confirmação da existência de tratamento, acesso, correção, anonimização, portabilidade, eliminação, informação sobre compartilhamento e revogação do consentimento quando ele for a base legal (art. 18). Para dados de visita, formulário ou conta, use o canal do encarregado.",
        "Para dados que estão no sistema de uma prefeitura, como um protocolo de ouvidoria, o pedido deve ir àquele município, que é o controlador. Se recebermos um pedido desses, encaminhamos ao município e avisamos você.",
      ],
    },
  ];
}

export const POLITICA_PRIVACIDADE: SecaoLegal[] = politicaDePrivacidade();

export const TERMOS_DE_USO: SecaoLegal[] = [
  {
    titulo: "O que é este serviço",
    paragrafos: [
      "O CidadeIA é um sistema de gestão municipal contratado por módulos. Ele importa o que já é público nas bases oficiais (Tesouro Nacional, CNES, INEP, PNCP, ObrasGov e outras), recebe o que só a prefeitura sabe e os servidores lançam nas telas, aplica regras públicas sobre esses dados e avisa quando algo exige decisão.",
      "As áreas do site abertas sem login (página inicial, produtos, Raio-X, panorama, diagnóstico, kit de contratação e portais do cidadão publicados) podem ser usadas por qualquer pessoa. As áreas internas exigem conta e vínculo com uma prefeitura.",
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
      "Criar conta é gratuito. A conta nasce sem módulo ativo e sem portal público: os módulos e o endereço do portal do cidadão só são liberados depois que a equipe confere o contrato com a prefeitura, o que comprova o vínculo de quem criou a conta.",
      "Quem cria a conta responde pelo uso das credenciais e por quem cadastra dentro dela. Cada cargo enxerga o que lhe cabe — secretário vê a própria secretaria, o financeiro consolidado e a administração de usuários ficam com o prefeito. Comunicar imediatamente qualquer acesso indevido é obrigação do titular da conta.",
      "É vedado usar o sistema para inserir dado que você não tem autoridade para tratar, tentar acessar dados de outro município, ou explorar falhas de segurança. Encontrou uma, avise: a comunicação responsável é bem-vinda e não gera retaliação.",
    ],
  },
  {
    titulo: "Contratação, pagamento e encerramento",
    paragrafos: [
      "A contratação por órgão público segue a Lei 14.133/2021 e é formalizada por processo administrativo: dispensa por valor ou pregão, conforme o caso. O valor de cada módulo vem na proposta formal, calculado pelo porte do município, junto do termo de referência. Contratar, acrescentar ou retirar módulo depende de processo e de termo aditivo, como em qualquer contrato público.",
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
