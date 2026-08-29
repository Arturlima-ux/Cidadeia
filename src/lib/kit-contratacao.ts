// ── KIT DE CONTRATAÇÃO ──
//
// O que trava a assinatura numa prefeitura quase nunca é a decisão: é o
// servidor que precisa montar o processo do zero. Estes são os modelos que
// vão junto da proposta, para o jurídico conferir em vez de redigir.
//
// Os documentos ficam como DADO estruturado, e não como arquivo solto, por
// dois motivos: renderizar a mesma fonte na tela, em .doc e em texto puro
// sem versões divergindo; e permitir que um teste garanta que todo campo a
// preencher aparece na lista de pendências, em vez de ir para uma prefeitura
// com "[RAZÃO SOCIAL]" no meio da cláusula sem ninguém perceber.

export type Bloco =
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "lista"; itens: string[] }
  | { tipo: "tabela"; cabecalho: string[]; linhas: string[][] };

export type Clausula = { titulo: string; blocos: Bloco[] };

export type Documento = {
  chave: string;
  nome: string;
  subtitulo: string;
  resumo: string;
  /** false = a gente não emite este documento; ver `origem`. */
  geramos: boolean;
  origem?: string;
  clausulas: Clausula[];
};

/**
 * Campos que SÓ a empresa contratada pode preencher. Aparecem nos documentos
 * entre colchetes e são listados na tela como pendência — publicar o kit com
 * um destes em branco é o tipo de descuido que só se descobre quando o
 * processo já está na mesa do jurídico da prefeitura.
 */
export const CAMPOS_A_PREENCHER = [
  { marcador: "[RAZÃO SOCIAL]", descricao: "Razão social completa da empresa" },
  { marcador: "[CNPJ]", descricao: "CNPJ da empresa" },
  { marcador: "[ENDEREÇO]", descricao: "Endereço da sede" },
  { marcador: "[REPRESENTANTE LEGAL]", descricao: "Nome e CPF de quem assina pela empresa" },
  { marcador: "[VALOR MENSAL]", descricao: "Valor mensal por módulo, conforme a proposta" },
  { marcador: "[VALOR ANUAL]", descricao: "Valor total de doze meses" },
  { marcador: "[TELEFONE]", descricao: "Telefone de suporte" },
  { marcador: "[E-MAIL DE SUPORTE]", descricao: "Canal oficial de abertura de chamado" },
  { marcador: "[DISPONIBILIDADE]", descricao: "Percentual de disponibilidade mensal que a empresa se compromete a manter" },
  { marcador: "[HOSPEDAGEM]", descricao: "Provedor e país onde os dados ficam hospedados" },
] as const;

const AVISO_JURIDICO =
  "Este é um MODELO, oferecido para acelerar a montagem do processo. Não substitui a análise da assessoria jurídica da prefeitura, que deve adaptá-lo às normas do município e à legislação vigente na data da contratação.";

// ── 1. TERMO DE REFERÊNCIA ──

const TERMO_DE_REFERENCIA: Documento = {
  chave: "termo-de-referencia",
  nome: "Termo de referência",
  subtitulo: "Modelo para instruir o processo de contratação",
  resumo:
    "Descreve o objeto, a justificativa, os requisitos técnicos e as obrigações das partes. É a peça que instrui a dispensa ou o pregão.",
  geramos: true,
  clausulas: [
    {
      titulo: "1. Do objeto",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Contratação de serviço de software como serviço (SaaS) para gestão pública municipal, compreendendo os módulos indicados na proposta, com hospedagem em nuvem, suporte técnico e disponibilização de canais públicos de atendimento ao cidadão.",
        },
        {
          tipo: "paragrafo",
          texto:
            "O serviço é prestado de forma continuada, mediante acesso por navegador, sem necessidade de instalação de programa ou de servidor nas dependências da contratante.",
        },
      ],
    },
    {
      titulo: "2. Da justificativa",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "A contratação atende a obrigações legais de transparência ativa, de ouvidoria e de tratamento de manifestações do cidadão, além de consolidar informações hoje dispersas entre as secretarias, o que hoje é feito por planilhas isoladas e sem histórico auditável.",
        },
        {
          tipo: "lista",
          itens: [
            "Lei nº 12.527/2011 — acesso à informação e transparência ativa;",
            "Lei nº 13.460/2017 — participação, proteção e defesa dos direitos do usuário de serviços públicos, incluindo manifestação anônima e acompanhamento do pedido;",
            "Lei nº 13.709/2018 — proteção de dados pessoais;",
            "Obrigações de prestação de contas perante o Tribunal de Contas do Estado.",
          ],
        },
      ],
    },
    {
      titulo: "3. Da especificação do serviço",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Os módulos são contratados de forma avulsa, conforme a necessidade da contratante, sem exigência de pacote mínimo. Não há cobrança por usuário adicional nem limite de geração de relatórios.",
        },
        {
          tipo: "tabela",
          cabecalho: ["Módulo", "Escopo funcional"],
          linhas: [
            [
              "Essencial",
              "Portal da transparência público com endereço próprio do município; ouvidoria com manifestação anônima e protocolo não sequencial; protocolo de atendimento com número e chave de consulta entregues ao cidadão.",
            ],
            [
              "Gestão",
              "Painel financeiro consolidado; alertas gerais; histórico e projeção de indicadores; relatório executivo em PDF; administração de usuários e perfis.",
            ],
            [
              "Saúde",
              "Cadastro de unidades de saúde, indicadores da secretaria, visualização em mapa e relatório em PDF.",
            ],
            [
              "Educação",
              "Cadastro de escolas, indicadores da secretaria, visualização em mapa e relatório em PDF.",
            ],
            [
              "Obras",
              "Cadastro de obras com progresso executado e esperado, valor de contrato, visualização em mapa e relatório em PDF.",
            ],
            [
              "Licitações",
              "Cadastro de processos licitatórios com modalidade, valor estimado, fornecedor e observação de risco, e relatório em PDF.",
            ],
          ],
        },
      ],
    },
    {
      titulo: "4. Dos requisitos técnicos",
      blocos: [
        {
          tipo: "lista",
          itens: [
            "Acesso via navegador de internet, sem instalação de programa na estação de trabalho;",
            "Hospedagem em nuvem, sem necessidade de servidor, licença de sistema operacional ou equipe de tecnologia da informação dedicada por parte da contratante;",
            "Isolamento dos dados de cada município garantido no banco de dados, e não apenas na aplicação;",
            "Perfis de acesso distintos, de modo que o titular de cada secretaria acesse apenas a área correspondente, e que o painel financeiro consolidado permaneça restrito ao chefe do Executivo e aos administradores designados;",
            "Autenticação individual, com senha armazenada exclusivamente em forma de resumo criptográfico (hash);",
            "Exportação integral dos dados do município, em formato aberto, a qualquer tempo, por iniciativa da contratante e sem custo adicional;",
            "Importação de dados provenientes de sistema anteriormente utilizado, a partir de arquivo em formato CSV.",
          ],
        },
      ],
    },
    {
      titulo: "5. Do uso de inteligência artificial",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Os recursos de inteligência artificial do sistema operam exclusivamente sobre os dados já cadastrados pela contratante e possuem caráter de apoio à decisão.",
        },
        {
          tipo: "lista",
          itens: [
            "Nenhuma informação numérica é gerada ou estimada pela ferramenta: na ausência do dado, o sistema informa a ausência;",
            "Sugestões produzidas por inteligência artificial não se convertem em alerta oficial sem aprovação humana registrada;",
            "A responsabilidade pelo conteúdo publicado permanece integralmente da contratante.",
          ],
        },
      ],
    },
    {
      titulo: "6. Das obrigações da contratada",
      blocos: [
        {
          tipo: "lista",
          itens: [
            "Disponibilizar o serviço conforme o acordo de nível de serviço anexo;",
            "Realizar a implantação assistida, incluindo criação dos acessos e importação dos dados existentes;",
            "Prestar suporte técnico pelos canais e nos prazos definidos no acordo de nível de serviço;",
            "Manter as condições de habilitação e regularidade fiscal durante toda a vigência contratual;",
            "Observar a Lei nº 13.709/2018 na condição de operadora dos dados pessoais, conforme o acordo de tratamento de dados anexo;",
            "Devolver a integralidade dos dados, em formato aberto, ao término do contrato, independentemente do motivo da extinção.",
          ],
        },
      ],
    },
    {
      titulo: "7. Das obrigações da contratante",
      blocos: [
        {
          tipo: "lista",
          itens: [
            "Designar servidor responsável pelo acompanhamento e fiscalização da execução contratual;",
            "Fornecer os dados e as informações necessárias à implantação;",
            "Zelar pela guarda das credenciais de acesso atribuídas aos seus agentes;",
            "Responder pela veracidade e pela atualização das informações publicadas nos canais públicos;",
            "Efetuar o pagamento nas condições pactuadas.",
          ],
        },
      ],
    },
    {
      titulo: "8. Do prazo e da forma de pagamento",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "A vigência é de 12 (doze) meses, contados da assinatura, prorrogável na forma da Lei nº 14.133/2021.",
        },
        {
          tipo: "paragrafo",
          texto:
            "O pagamento é mensal, no valor de [VALOR MENSAL] por módulo contratado, totalizando [VALOR ANUAL] no período, mediante apresentação de nota fiscal e atesto do fiscal do contrato.",
        },
      ],
    },
    {
      titulo: "9. Do recebimento e dos critérios de aceitação",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "O objeto será considerado recebido definitivamente quando verificado, pelo fiscal do contrato, que: os módulos contratados estão acessíveis aos usuários designados; o endereço público de transparência do município responde; e a ouvidoria e o protocolo recebem e permitem consultar manifestações.",
        },
      ],
    },
    {
      titulo: "10. Das sanções",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "O descumprimento das obrigações sujeita a contratada às sanções previstas na Lei nº 14.133/2021 e no instrumento contratual, assegurados o contraditório e a ampla defesa.",
        },
      ],
    },
    {
      titulo: "Observação",
      blocos: [{ tipo: "paragrafo", texto: AVISO_JURIDICO }],
    },
  ],
};

// ── 2. MINUTA DE CONTRATO ──

const MINUTA_CONTRATO: Documento = {
  chave: "minuta-de-contrato",
  nome: "Minuta de contrato",
  subtitulo: "Modelo de instrumento contratual",
  resumo:
    "Vigência, valor, reajuste, obrigações, propriedade dos dados e rescisão. Acompanha o termo de referência.",
  geramos: true,
  clausulas: [
    {
      titulo: "Das partes",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "CONTRATANTE: MUNICÍPIO DE [MUNICÍPIO], pessoa jurídica de direito público interno, inscrito no CNPJ sob o nº [CNPJ DO MUNICÍPIO], neste ato representado por [AUTORIDADE].",
        },
        {
          tipo: "paragrafo",
          texto:
            "CONTRATADA: [RAZÃO SOCIAL], inscrita no CNPJ sob o nº [CNPJ], com sede em [ENDEREÇO], neste ato representada por [REPRESENTANTE LEGAL].",
        },
      ],
    },
    {
      titulo: "Cláusula primeira — Do objeto",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Prestação de serviço de software como serviço para gestão pública municipal, nos termos e nas especificações do Termo de Referência, que integra este contrato independentemente de transcrição.",
        },
      ],
    },
    {
      titulo: "Cláusula segunda — Da vigência",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "O prazo de vigência é de 12 (doze) meses, contados da data de assinatura, podendo ser prorrogado na forma da Lei nº 14.133/2021.",
        },
        {
          tipo: "paragrafo",
          texto:
            "A alternância de gestão municipal não constitui, por si só, causa de extinção contratual, permanecendo o contrato vinculado ao Município.",
        },
      ],
    },
    {
      titulo: "Cláusula terceira — Do valor e do pagamento",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "O valor mensal é de [VALOR MENSAL], perfazendo [VALOR ANUAL] no período de vigência, pago até o [DIA] dia útil do mês subsequente ao da prestação, mediante nota fiscal e atesto do fiscal do contrato.",
        },
        {
          tipo: "paragrafo",
          texto:
            "Não haverá cobrança por usuário adicional, por volume de relatórios gerados ou por acesso do cidadão aos canais públicos.",
        },
      ],
    },
    {
      titulo: "Cláusula quarta — Do reajuste",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Decorridos 12 (doze) meses da data da proposta, o valor poderá ser reajustado pela variação acumulada do [ÍNDICE], mediante requerimento fundamentado da contratada e concordância da contratante.",
        },
      ],
    },
    {
      titulo: "Cláusula quinta — Das obrigações das partes",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "As partes obrigam-se ao disposto nos itens 6 e 7 do Termo de Referência, cujo teor integra esta cláusula.",
        },
      ],
    },
    {
      titulo: "Cláusula sexta — Da titularidade e da devolução dos dados",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Os dados inseridos no sistema são de titularidade exclusiva do Município, não constituindo ativo da contratada a qualquer título.",
        },
        {
          tipo: "lista",
          itens: [
            "A contratante pode extrair a integralidade dos dados, em formato aberto e legível por máquina, a qualquer tempo, por iniciativa própria e sem custo adicional;",
            "A extração independe de anuência, de aviso prévio ou de estar o contrato adimplido;",
            "Extinto o contrato por qualquer motivo, a contratada entregará a base completa em até [PRAZO] dias e procederá à eliminação definitiva dos dados em seus ambientes, mediante declaração formal.",
          ],
        },
      ],
    },
    {
      titulo: "Cláusula sétima — Da proteção de dados pessoais",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Para os fins da Lei nº 13.709/2018, o Município é o controlador e a contratada é a operadora dos dados pessoais tratados por meio do sistema, observado o Acordo de Tratamento de Dados anexo.",
        },
      ],
    },
    {
      titulo: "Cláusula oitava — Do nível de serviço",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "A disponibilidade do serviço e os prazos de atendimento observarão o Acordo de Nível de Serviço anexo, que integra este contrato.",
        },
      ],
    },
    {
      titulo: "Cláusula nona — Da rescisão",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "O contrato pode ser extinto por acordo entre as partes ou por denúncia unilateral, mediante comunicação escrita com antecedência mínima de [PRAZO DE AVISO] dias, sem imposição de multa rescisória à contratante.",
        },
        {
          tipo: "paragrafo",
          texto:
            "A extinção não afeta o direito de extração e de devolução dos dados previsto na cláusula sexta.",
        },
      ],
    },
    {
      titulo: "Cláusula décima — Do foro",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Fica eleito o foro da Comarca de [MUNICÍPIO] para dirimir as questões oriundas deste contrato.",
        },
      ],
    },
    {
      titulo: "Observação",
      blocos: [{ tipo: "paragrafo", texto: AVISO_JURIDICO }],
    },
  ],
};

// ── 3. ACORDO DE TRATAMENTO DE DADOS (LGPD) ──

const ACORDO_DADOS: Documento = {
  chave: "acordo-de-tratamento-de-dados",
  nome: "Acordo de tratamento de dados",
  subtitulo: "Anexo de proteção de dados pessoais — Lei nº 13.709/2018",
  resumo:
    "Define os papéis de controlador e operador, as finalidades, as medidas de segurança e o que acontece com os dados ao fim do contrato.",
  geramos: true,
  clausulas: [
    {
      titulo: "1. Dos papéis",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "O Município é o CONTROLADOR: define as finalidades e os meios do tratamento. A [RAZÃO SOCIAL] é a OPERADORA: trata os dados pessoais em nome do controlador e conforme suas instruções.",
        },
        {
          tipo: "paragrafo",
          texto:
            "A operadora não utiliza os dados pessoais para finalidade própria, não os comercializa e não os emprega para treinar modelos de inteligência artificial.",
        },
      ],
    },
    {
      titulo: "2. Das finalidades e das categorias de dados",
      blocos: [
        {
          tipo: "tabela",
          cabecalho: ["Categoria", "Finalidade", "Base legal indicada"],
          linhas: [
            [
              "Agentes públicos: nome, CPF/CNPJ, cargo, e-mail, telefone",
              "Autenticação e controle de acesso por perfil",
              "Execução de políticas públicas e cumprimento de obrigação legal",
            ],
            [
              "Cidadãos: nome, e-mail, telefone e conteúdo da manifestação",
              "Recebimento, tramitação e resposta de protocolo e ouvidoria",
              "Cumprimento de obrigação legal (Lei nº 13.460/2017)",
            ],
            [
              "Manifestações anônimas: apenas o conteúdo",
              "Recebimento e tramitação sem identificação do manifestante",
              "Cumprimento de obrigação legal (Lei nº 13.460/2017, art. 10)",
            ],
          ],
        },
        {
          tipo: "paragrafo",
          texto:
            "Manifestação registrada como anônima não é identificada em nenhuma etapa, inclusive nas exportações de dados solicitadas pelo próprio Município, e recebe protocolo não sequencial, de modo a impedir a enumeração de denúncias.",
        },
      ],
    },
    {
      titulo: "3. Das medidas de segurança",
      blocos: [
        {
          tipo: "lista",
          itens: [
            "Isolamento dos dados de cada município no banco de dados, e não apenas na camada de aplicação;",
            "Senhas armazenadas exclusivamente como resumo criptográfico, sem possibilidade de leitura reversa;",
            "Tráfego cifrado entre o navegador e o serviço;",
            "Controle de acesso por perfil, restringindo o agente público à sua área de atuação;",
            "Chaves de consulta e material de autenticação excluídos de qualquer exportação de dados.",
          ],
        },
      ],
    },
    {
      titulo: "4. Da hospedagem e dos subcontratados",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Os dados são hospedados em [HOSPEDAGEM]. A operadora informará o controlador previamente à contratação de novo subcontratado que trate dados pessoais, facultada objeção fundamentada.",
        },
      ],
    },
    {
      titulo: "5. Dos incidentes",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Verificado incidente de segurança que possa acarretar risco ou dano relevante aos titulares, a operadora comunicará o controlador em até [PRAZO DE INCIDENTE] horas da ciência, informando a natureza do incidente, os dados afetados, as medidas adotadas e as recomendações de mitigação, de modo a permitir ao controlador a comunicação à Autoridade Nacional de Proteção de Dados e aos titulares.",
        },
      ],
    },
    {
      titulo: "6. Dos direitos dos titulares",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Recebida pela operadora solicitação de titular relativa a acesso, correção, portabilidade ou eliminação, esta será encaminhada ao controlador, a quem cabe responder, prestando a operadora o auxílio técnico necessário.",
        },
      ],
    },
    {
      titulo: "7. Do término",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Extinto o contrato, a operadora entregará ao controlador a integralidade dos dados em formato aberto e, em seguida, eliminará definitivamente os dados de seus ambientes, ressalvada a retenção estritamente necessária ao cumprimento de obrigação legal, mediante declaração formal de eliminação.",
        },
      ],
    },
    {
      titulo: "Observação",
      blocos: [{ tipo: "paragrafo", texto: AVISO_JURIDICO }],
    },
  ],
};

// ── 4. ACORDO DE NÍVEL DE SERVIÇO ──

const ACORDO_NIVEL_SERVICO: Documento = {
  chave: "acordo-de-nivel-de-servico",
  nome: "Acordo de nível de serviço",
  subtitulo: "Anexo de disponibilidade e suporte",
  resumo:
    "Disponibilidade mensal, janela de manutenção, prazos de atendimento por severidade e como isso é medido.",
  geramos: true,
  clausulas: [
    {
      titulo: "1. Da disponibilidade",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "A contratada compromete-se a manter disponibilidade mensal mínima de [DISPONIBILIDADE] do serviço, apurada sobre o total de minutos do mês.",
        },
        {
          tipo: "paragrafo",
          texto:
            "Não são computadas como indisponibilidade: as janelas de manutenção programada comunicadas com antecedência mínima de 48 (quarenta e oito) horas; as interrupções decorrentes de falha na conexão de internet da contratante; e os eventos de caso fortuito ou força maior.",
        },
      ],
    },
    {
      titulo: "2. Dos canais de atendimento",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "O suporte é prestado por [E-MAIL DE SUPORTE] e por [TELEFONE], em dias úteis, das 8h às 18h (horário de Brasília).",
        },
      ],
    },
    {
      titulo: "3. Dos prazos por severidade",
      blocos: [
        {
          tipo: "tabela",
          cabecalho: ["Severidade", "Situação", "Primeira resposta", "Prazo de solução"],
          linhas: [
            [
              "Crítica",
              "Serviço inacessível para todos os usuários, ou canal público do cidadão fora do ar",
              "[PRAZO] horas úteis",
              "[PRAZO] horas úteis",
            ],
            [
              "Alta",
              "Módulo contratado indisponível ou erro que impede tarefa essencial, sem alternativa",
              "[PRAZO] horas úteis",
              "[PRAZO] horas úteis",
            ],
            [
              "Média",
              "Erro que compromete parte de uma funcionalidade, com alternativa disponível",
              "[PRAZO] horas úteis",
              "[PRAZO] dias úteis",
            ],
            [
              "Baixa",
              "Dúvida de uso, ajuste cosmético ou sugestão de melhoria",
              "[PRAZO] dias úteis",
              "Conforme planejamento",
            ],
          ],
        },
      ],
    },
    {
      titulo: "4. Da medição e do relatório",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "A contratada disponibilizará ao fiscal do contrato, mediante solicitação, relatório mensal contendo a disponibilidade apurada, a relação de chamados abertos e os prazos observados.",
        },
      ],
    },
    {
      titulo: "5. Do descumprimento",
      blocos: [
        {
          tipo: "paragrafo",
          texto:
            "Não atingida a disponibilidade mínima no mês, a contratante fará jus a desconto de [DESCONTO] sobre a fatura do período, sem prejuízo das demais sanções contratuais.",
        },
      ],
    },
    {
      titulo: "Observação",
      blocos: [
        { tipo: "paragrafo", texto: AVISO_JURIDICO },
        {
          tipo: "paragrafo",
          texto:
            "Os prazos e o percentual de disponibilidade estão em branco de propósito: são compromissos que a empresa precisa conseguir cumprir de fato. Prometer no papel o que a operação não sustenta cria inadimplemento contratual, não credibilidade.",
        },
      ],
    },
  ],
};

// ── 5. CERTIDÕES (checklist, não documento gerado) ──

const CERTIDOES: Documento = {
  chave: "certidoes-de-regularidade",
  nome: "Certidões de regularidade",
  subtitulo: "Lista de habilitação — documentos emitidos por órgãos oficiais",
  resumo:
    "Não é um modelo: são certidões emitidas pelos órgãos competentes, que a empresa obtém e anexa ao processo.",
  geramos: false,
  origem:
    "Emitidas pela Receita Federal, pela Caixa Econômica Federal, pela Justiça do Trabalho e pelas fazendas estadual e municipal. Nenhum sistema pode gerá-las.",
  clausulas: [
    {
      titulo: "Documentos de habilitação",
      blocos: [
        {
          tipo: "tabela",
          cabecalho: ["Documento", "Onde se obtém", "Validade típica"],
          linhas: [
            ["Certidão negativa de débitos federais e dívida ativa da União", "Receita Federal do Brasil", "180 dias"],
            ["Certificado de regularidade do FGTS (CRF)", "Caixa Econômica Federal", "30 dias"],
            ["Certidão negativa de débitos trabalhistas (CNDT)", "Tribunal Superior do Trabalho", "180 dias"],
            ["Certidão negativa estadual", "Secretaria da Fazenda do estado da sede", "Varia por estado"],
            ["Certidão negativa municipal", "Prefeitura da sede da empresa", "Varia por município"],
            ["Ato constitutivo, estatuto ou contrato social em vigor", "Junta Comercial", "—"],
            ["Prova de inscrição no CNPJ", "Receita Federal do Brasil", "—"],
          ],
        },
        {
          tipo: "paragrafo",
          texto:
            "As certidões precisam estar vigentes na data da apresentação e permanecer válidas durante a execução contratual. Convém verificá-las antes de enviar a proposta: certidão vencida é o motivo mais comum de devolução do processo.",
        },
      ],
    },
  ],
};

// ── 6. ATESTADO DE CAPACIDADE TÉCNICA ──

const ATESTADO: Documento = {
  chave: "atestado-de-capacidade-tecnica",
  nome: "Atestado de capacidade técnica",
  subtitulo: "Emitido pelo cliente, depois do contrato",
  resumo:
    "Não é um modelo que a gente assina: é o órgão contratante que declara que o serviço foi prestado. Só existe depois do primeiro contrato executado.",
  geramos: false,
  origem:
    "Emitido pelo órgão ou pela entidade que contratou o serviço, em papel timbrado próprio, atestando prazo, objeto e qualidade da execução.",
  clausulas: [
    {
      titulo: "O que costuma ser exigido",
      blocos: [
        {
          tipo: "lista",
          itens: [
            "Identificação do órgão emitente e do responsável pela assinatura;",
            "Descrição do objeto executado, compatível com o objeto que se pretende contratar;",
            "Período de execução;",
            "Declaração de que o serviço foi prestado de forma satisfatória.",
          ],
        },
        {
          tipo: "paragrafo",
          texto:
            "Enquanto não houver contrato executado, o edital ou o termo de dispensa pode ser instruído sem esta exigência, o que é usual em contratações de baixo valor.",
        },
      ],
    },
  ],
};

export const DOCUMENTOS: Documento[] = [
  TERMO_DE_REFERENCIA,
  MINUTA_CONTRATO,
  ACORDO_DADOS,
  ACORDO_NIVEL_SERVICO,
  CERTIDOES,
  ATESTADO,
];

export function documentoPorChave(chave: string): Documento | null {
  return DOCUMENTOS.find((d) => d.chave === chave) ?? null;
}

/** Todo texto do documento, para busca de marcadores e para exportação. */
export function textoCorrido(documento: Documento): string {
  const partes: string[] = [];
  for (const clausula of documento.clausulas) {
    partes.push(clausula.titulo);
    for (const bloco of clausula.blocos) {
      if (bloco.tipo === "paragrafo") partes.push(bloco.texto);
      else if (bloco.tipo === "lista") partes.push(...bloco.itens);
      else partes.push(...bloco.cabecalho, ...bloco.linhas.flat());
    }
  }
  return partes.join("\n");
}

/** Marcadores `[ASSIM]` que aparecem no documento, sem repetição. */
export function marcadoresDe(documento: Documento): string[] {
  const encontrados = textoCorrido(documento).match(/\[[A-ZÀ-Ú0-9 ÇÃÉÍÓÚÂÊÔÕ/.-]+\]/g) ?? [];
  return Array.from(new Set(encontrados)).sort();
}
