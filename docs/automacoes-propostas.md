# Automações que fazem o trabalho

*Proposta de outubro de 2026. Escrita a partir do código desta branch, não de intenção.*

## O ponto de partida

Hoje o CidadeIA lê bases públicas e avisa: o vigia fiscal confere no Tesouro se o RREO e o RGF foram
entregues (`lib/vigia-fiscal*.ts`), a rotina diária importa PNCP, CNES e SICONFI
(`lib/importacao-automatica.ts`), e as regras de `lib/deteccao-automatica.ts` apontam prazo vencendo,
obra parada, contrato sem tempo de licitar. Já existem três peças que **fazem** em vez de avisar:

- o rascunho de resposta à ouvidoria (`lib/rascunho-resposta.ts`), gerado quando o servidor clica;
- a classificação da manifestação pela secretaria certa (`lib/classificar-manifestacao.ts`);
- o ofício ao Conselho Tutelar da busca ativa e os pedidos de reposição em CSV (saúde e merenda);
- o rascunho do plano de contratações anual (`lib/pca.ts`).

O que falta é o resto do caminho: quando o sistema já sabe que algo precisa ser feito, ele também
tem os dados para montar o documento. Esta proposta lista onde isso é possível com o que já está no
banco, sem prometer integração que não existe.

**A regra para todas:** o sistema monta, uma pessoa confere e aprova. Nada é enviado, publicado ou
assinado sozinho; o rascunho diz que é rascunho até alguém aprovar, e a aprovação fica registrada
com nome, cargo e data. O que o sistema não sabe vira um campo entre [colchetes], nunca uma
estimativa.

## A lista, por impacto ÷ esforço

Notas de 1 a 5. Impacto pesa quantas vezes por ano o trabalho acontece, quanto custa errar e quanto
tempo de servidor some. Esforço pesa dado que falta, tela nova e risco jurídico do texto.

| # | Automação | Módulo | Impacto | Esforço | Razão |
|---|---|---|---|---|---|
| 1 | Processo de renovação do contrato que vence, montado | Licitações | 5 | 2 | 2,5 |
| 2 | Notificação à contratada da obra que passou do prazo | Obras | 4 | 2 | 2,0 |
| 3 | Resposta da LAI e da ouvidoria pronta na chegada, com dado interno | Essencial | 4 | 2 | 2,0 |
| 4 | Pacote da audiência pública do quadrimestre | Gestão / Saúde | 5 | 3 | 1,7 |
| 5 | Pedido de atualização do CNES por unidade | Saúde | 3 | 2 | 1,5 |
| 6 | Extratos pendentes de divulgação no PNCP | Licitações | 3 | 2 | 1,5 |
| 7 | Divergência de matrícula Censo × escola, com a lista para retificar | Educação | 4 | 3 | 1,3 |
| 8 | Conferência do RGF antes da assinatura | Gestão | 4 | 4 | 1,0 |
| 9 | Chamada pública da agricultura familiar quando os 30% não fecham | Educação | 3 | 3 | 1,0 |

A primeira foi construída nesta branch. As demais são candidatas, na ordem em que valem a pena.

---

## 1. Processo de renovação do contrato que vence, montado

**Construída.** Tela em *Licitações → Contratos e vigência → Montar a renovação*.

**O trabalho manual que elimina, e de quem.** Quando um contrato está para vencer, alguém do setor
de compras (ou o próprio secretário, em município pequeno) precisa: descobrir que vence, decidir
entre prorrogar e licitar de novo, escrever o documento de formalização de demanda, abrir o estudo
técnico preliminar com os treze itens, levantar o que o município já pagou pelo mesmo objeto,
calcular até quando o edital precisa sair, e — se for prorrogar — escrever o ofício à contratada,
juntar o checklist de certidões e redigir o termo aditivo. É meio dia a dois dias de trabalho por
contrato, e numa prefeitura real (São Sepé/RS, medição de 29/09/2026) havia 27 contratos vencendo em
90 dias. O que acontece quando ninguém faz é conhecido: dispensa emergencial, depois outra, depois
fracionamento.

**Base legal.** Lei 14.133/2021: art. 18 (fase preparatória e os elementos do estudo técnico
preliminar, com o mínimo do § 2º), art. 12, VII (plano de contratações anual), art. 55 (prazo mínimo
do edital), art. 72, I (documento de formalização de demanda na contratação direta), art. 107
(prorrogação de serviço e fornecimento contínuos até dez anos, com atestado de vantajosidade),
art. 91, § 4º (regularidade fiscal, CEIS, CNEP e certidões antes de prorrogar), art. 94 (divulgação
do aditivo no PNCP como condição de eficácia) e art. 111 (obra prorroga sozinha — por isso fica de
fora).

**Dados que usa.** Todos já existem: a tabela `contratos` (importada do PNCP: objeto, contratado,
CNPJ, valores, vigência, categoria, adesão), os demais contratos do município para o histórico do
mesmo objeto (`lib/fracionamento.ts` dá a semelhança), a régua do art. 55 (`lib/vigencia.ts`), o
recuo em dias úteis (`lib/pca.ts`) e o cadastro da prefeitura (nome, CNPJ, prefeito).

**O que sai pronto.** Dois caminhos, cada um com seus documentos, na tela e em .doc para o Word:

- *Prorrogar:* ofício à contratada perguntando se tem interesse e em que condições; checklist de
  instrução com as exigências dos arts. 107 e 91, § 4º, e a conta da vigência decenal pela data de
  início registrada no PNCP; minuta do termo aditivo com partes, contrato, processo e datas.
- *Licitar de novo:* documento de formalização de demanda com a justificativa a partir do contrato
  que vence, a data em que o novo precisa estar vigente e o grau de prioridade; estudo técnico
  preliminar com os treze itens do art. 18, § 1º, os cinco obrigatórios marcados, e o histórico do
  município no levantamento de mercado; a data-limite para publicar o edital.

Em ambos, a lista de pendências (cada [colchete] que só a prefeitura sabe preencher) e o histórico
de contratações do mesmo objeto no município, com valor e vigência.

**Onde entra a pessoa.** Escolhe o caminho; lê; aprova. A aprovação grava na trilha de auditoria
quem aprovou, com que cargo, quando, e uma impressão do texto aprovado. Se o contrato mudar depois
(o PNCP trouxe um aditivo, a vigência mudou), a tela avisa que o texto aprovado não é mais o que está
sendo gerado. O arquivo baixado diz "rascunho, não aprovado" ou "conferido e aprovado por Fulana em
tal data" — e em nenhum dos dois casos é assinatura: assinar continua sendo no processo.

**Risco.** Texto jurídico errado instruindo processo. Mitigação: só artigos conferidos, os campos de
juízo (necessidade, quantidade, pesquisa de preços, vantajosidade) ficam em branco com a pergunta
certa, e obra fica de fora porque segue o art. 111. Contrato já vencido só oferece licitar: aditivo
depois do vencimento não prorroga.

**Esforço.** Baixo: sem migração (a aprovação mora na tabela `auditoria`), sem integração nova, e o
formato de documento estruturado já existia no kit de contratação.

**Por que um concorrente comum não faz.** Gerador de ETP existe; o que ele entrega é um formulário
em branco que alguém precisa lembrar de abrir. Aqui o processo nasce do relógio do contrato,
preenchido com o que o PNCP já publicou do próprio município, com a decisão prorrogar × licitar
posta na frente e a data-limite do edital calculada. O ERP de compras conhece o contrato mas não
cruza com o histórico público; o portal de licitação conhece o edital mas não o contrato que vence.

## 2. Notificação à contratada da obra que passou do prazo

**O trabalho que elimina.** O fiscal ou o secretário de Obras redigindo a notificação à empresa com
número do contrato, objeto, prazo, percentual medido e prazo para resposta — hoje, o painel aponta a
obra e registra a decisão (`lib/decisao-obra.ts`), mas o documento que formaliza a mora não existe.

**Base legal.** Art. 111, parágrafo único, I, da Lei 14.133/2021 (constituição em mora); art. 156
(sanções) e art. 157 (defesa de 15 dias úteis na multa), quando a notificação abrir processo
sancionador.

**Dados.** Existem: `obras` (contrato do PNCP, contratada, vigência, progresso medido, última
medição), `contratos` (CNPJ, número, processo) e `decisoes_obra` (a decisão "mora do contratado").

**O que sai pronto.** O ofício de notificação com os fatos da obra e o prazo para manifestação em
branco; ao aprovar, a decisão de mora é registrada junto.

**Revisão humana.** O fiscal confere os fatos; o secretário aprova. Ninguém é notificado pelo
sistema.

**Risco.** Afirmar culpa sem apuração. Mitigação: o texto notifica e pede justificativa; não
conclui. **Esforço:** baixo. **Diferencial:** os sistemas de obra conhecem o cronograma; não juntam
o contrato do PNCP, a medição e a decisão num documento.

## 3. Resposta da LAI e da ouvidoria pronta na chegada, com dado interno

**O trabalho que elimina.** Hoje o rascunho é gerado quando o servidor clica, e só com o que está no
portal público. O pedido de informação típico ("quanto a prefeitura pagou à empresa X", "quando
termina a obra da rua Y") tem resposta nos contratos e nas obras do sistema.

**Base legal.** Lei 12.527/2011, art. 11 (prazo de 20 dias, prorrogável por 10); Lei 13.460/2017,
art. 16 (30 dias, prorrogáveis por 30).

**Dados.** Existem: `atendimentos`, `contratos`, `obras`, `licitacoes`, snapshot financeiro.

**O que sai pronto.** Na chegada da manifestação: área classificada, rascunho gerado e guardado, e
para pedido de informação a tabela com os contratos/obras/valores encontrados. A caixa de entrada
vira "prontas para conferir".

**Revisão humana.** O servidor da área lê, ajusta e envia — como hoje. **Risco:** responder com dado
interno que não deveria ser público (sigilo, dado pessoal); só entra o que já é de divulgação
obrigatória (contrato, obra, licitação). **Esforço:** baixo-médio; precisa guardar o rascunho sem
migração (evento em `pedido_eventos`, como a prorrogação já faz). **Diferencial:** os sistemas de
ouvidoria entregam formulário e prazo; nenhum responde com o dado de contrato do próprio município.

## 4. Pacote da audiência pública do quadrimestre

**O trabalho que elimina.** O contador e o secretário de Finanças montando a apresentação das metas
fiscais à Câmara em fevereiro, maio e setembro; e o secretário de Saúde montando o Relatório
Detalhado do Quadrimestre Anterior para a audiência da Saúde.

**Base legal.** LRF, art. 9º, § 4º; Lei Complementar 141/2012, art. 36.

**Dados.** Parte existe (RREO/RGF importados, mínimos de saúde e educação, despesa com pessoal,
indicadores da APS); as metas fiscais da LDO não estão no sistema e ficariam em branco.

**O que sai pronto.** Roteiro da apresentação com os números do período e do anterior, a frente que
está em risco (já calculada em `lib/prestacao-de-contas.ts`) e o esqueleto da ata.

**Revisão humana.** O contador confere os números contra o sistema contábil antes da audiência.
**Risco:** número do Tesouro desatualizado; a tela diz a data da importação. **Esforço:** médio.
**Diferencial:** o sistema contábil gera o demonstrativo; não gera a fala para o vereador.

## 5. Pedido de atualização do CNES por unidade

**O trabalho que elimina.** A coordenação da atenção básica descobrindo quais unidades estão perto
dos 180 dias sem atualização e cobrando cada gerência.

**Base legal.** Portaria SAS/MS nº 118/2014 (desativação após 180 dias sem atualização), já aplicada
em `lib/cnes.ts`.

**Dados.** Existem: `unidades_saude` com a data da última atualização no CNES e o acesso da
gerência. **O que sai pronto:** um pedido por unidade, com a data-limite, e a lista consolidada para
a secretaria. **Revisão humana:** a coordenação aprova antes de ir para cada gerência. **Risco:**
baixo. **Esforço:** baixo. **Diferencial:** o CNES não avisa antes de desativar.

## 6. Extratos pendentes de divulgação no PNCP

**O trabalho que elimina.** Descobrir quais contratações registradas aqui não aparecem no PNCP e
montar a lista do que publicar, com os dados de cada extrato.

**Base legal.** Art. 94 da Lei 14.133/2021: a divulgação no PNCP é condição de eficácia do contrato e
dos aditamentos.

**Dados.** Existem: a conferência de publicação em `lib/pncp.ts` já separa "não consta" de "não deu
para conferir". **O que sai pronto:** a lista com os campos do extrato preenchidos do cadastro.
**Revisão humana:** quem publica no PNCP é o servidor credenciado. **Risco:** baixo. **Esforço:**
baixo. **Diferencial:** o portal de compras publica o que já está nele; não acha o que ficou fora.

## 7. Divergência de matrícula Censo × escola, com a lista para retificar

**O trabalho que elimina.** A secretaria de Educação comparando a matrícula declarada ao Censo com a
da escola, escola por escola, antes da janela de retificação.

**Base legal.** A distribuição do FUNDEB usa as matrículas do Censo Escolar (Lei 14.113/2020).

**Dados.** Parte existe: matrícula declarada (Catálogo do INEP) e a apuração em reais
(`lib/resultado-educacao.ts`); a matrícula atual é lançada pela escola. **O que sai pronto:** a lista
por escola com a diferença em reais e o pedido à direção para conferir no Educacenso. **Revisão
humana:** a direção confirma cada aluno. **Risco:** a matrícula lançada aqui estar errada; o pedido
diz de onde veio cada número. **Esforço:** médio (calendário do INEP muda por ano). **Diferencial:**
o Educacenso não compara com nada.

## 8. Conferência do RGF antes da assinatura

**O trabalho que elimina.** O controle interno conferindo o Anexo 1 contra a folha e a receita antes
de assinar.

**Base legal.** LRF, arts. 20, 54 e 55.

**Dados.** Parte existe: o RGF entregue e a régua dos 54%. A folha não está no sistema: seria preciso
importar o resumo da folha (CSV do sistema de pessoal). **O que sai pronto:** a conferência linha a
linha e a lista do que não fecha. **Risco:** médio. **Esforço:** alto (importação nova).
**Diferencial:** o sistema de folha e o contábil não se conferem um ao outro.

## 9. Chamada pública da agricultura familiar quando os 30% não fecham

**O trabalho que elimina.** A nutricionista e o setor de compras montando a chamada pública quando o
ano caminha para fechar abaixo dos 30%.

**Base legal.** Lei 11.947/2009, art. 14.

**Dados.** Existem: compras e repasses do PNAE e a projeção do fechamento (`lib/pnae.ts`). Faltam
gêneros e quantidades, que ficariam em branco. **O que sai pronto:** o valor que falta comprar até
dezembro e o esqueleto da chamada. **Risco:** médio. **Esforço:** médio. **Diferencial:** o sistema
de merenda controla estoque, não a obrigação do art. 14.

---

## Decisões que ficam com o dono

1. **Onde guardar estado sem migração.** A aprovação da renovação mora na tabela `auditoria` (ação
   "aprovar", entidade "contrato"). Funciona e é o lugar natural da pergunta "quem aprovou", mas o
   texto aprovado não fica guardado: guarda-se a impressão dele, e o texto é reconstruído dos dados.
   Para as automações 2 e 3, que precisam guardar texto editado, uma tabela própria de rascunhos
   seria mais limpa — e exige migração.
2. **IA nos documentos jurídicos.** A renovação é toda determinística. Não há chamada ao modelo
   porque cada frase vira peça de processo; se o dono quiser a IA reescrevendo a justificativa,
   a regra do rascunho da ouvidoria serve (mantém colchetes e não acrescenta fato), mas o texto
   aprovado passaria a depender de uma chamada que não se repete igual.
3. **Quem aprova.** Hoje aprova quem tem acesso à pasta de Licitações (prefeito, administrador ou
   secretário de Licitações). O documento de formalização de demanda, na prática, é assinado pela
   secretaria que usa o serviço — que hoje não enxerga a pasta de Licitações.
