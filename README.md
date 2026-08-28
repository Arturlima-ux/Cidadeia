# CidadeIA — Sistema Operacional Inteligente para Gestão Municipal

Projeto real (Next.js + banco de dados + autenticação), separado do site de
vendas. Este é o produto de verdade — login, cadastro de prefeitura,
dashboard e IA Central conectada.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4** — visual alinhado com a marca (creme + verde institucional)
- **Drizzle ORM + libSQL (SQLite)** — banco local em arquivo, sem precisar
  instalar servidor de banco. Troca para Turso (libSQL remoto) em produção
  só mudando uma variável de ambiente — nenhum código muda.
  *(Usamos libSQL em vez de Prisma porque o Prisma precisa baixar um binário
  de um domínio que pode estar bloqueado em ambientes com rede restrita —
  libSQL evita esse problema.)*
- **Autenticação própria**: sessão via cookie JWT assinado (`jose`), senha
  com hash `bcrypt`. Sem dependência de serviço de terceiro.
- **IA Central**: `@anthropic-ai/sdk`, respondendo com base SOMENTE nos dados
  reais cadastrados (nunca inventa números).

## Como rodar localmente

```bash
npm install
cp .env.example .env
```

Edite o `.env`:
- `AUTH_SECRET`: gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `ANTHROPIC_API_KEY`: opcional para rodar o site, mas necessária pra IA
  Central responder de verdade. Gere em https://console.anthropic.com/settings/keys
  Sem essa chave, a IA Central mostra uma mensagem explicando que precisa
  ser configurada — o resto do site funciona normalmente.

Depois:

```bash
npx drizzle-kit migrate   # cria as tabelas no banco local.db
npm run dev               # http://localhost:3000
```

Acesse `http://localhost:3000` → você será redirecionado para `/login` →
clique em **Cadastrar Prefeitura** para criar sua primeira conta.

## Estrutura do projeto

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (server-side)
│   ├── dashboard/         # Dashboard autenticado
│   ├── login/            # Página de login
│   ├── cadastro/         # Onboarding de prefeituras
│   ├── globals.css       # Estilos globais com Tailwind v4
│   └── layout.tsx        # Layout raiz
├── components/           # Componentes React reutilizáveis
├── db/                  # Schema Drizzle ORM
├── lib/                 # Funções e utilitários
│   ├── sessao.ts       # Gerenciamento de sessão JWT
│   ├── ia.ts           # Integração com IA Anthropic
│   ├── planos.ts       # Lógica de planos e add-ons
│   └── ...             # Outros utilitários
└── proxy.ts            # Middleware de proxy/autenticação
```

## Segurança

- Autenticação: JWT assinado via `jose`, senhas com hash `bcrypt`
- Sessões: cookie seguro, httpOnly, sameSite=strict
- CORS: Server Actions limitadas a origens conhecidas
- Headers: Content-Type-Options, X-Frame-Options, etc.
- Banco: SQLite local + Turso (libSQL) em produção

## Deploy em produção

1. **Banco de dados**: crie um banco gratuito em https://turso.tech (libSQL
   hospedado) e configure `DATABASE_URL` e `DATABASE_AUTH_TOKEN` no seu
   provedor de hospedagem.

2. **Variáveis de ambiente em produção**:
   - Gere uma `AUTH_SECRET` segura: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Defina `ANTHROPIC_API_KEY` se usar IA Central
   - Atualize `NEXT_PUBLIC_APP_URL` com seu domínio em produção

3. **Deploy no Vercel**:
   ```bash
   npm i -g vercel
   vercel
   ```
   Adicione as variáveis no painel do Vercel antes de fazer deploy.
2. **Hospedagem**: Vercel é o caminho mais simples para Next.js
   (`vercel.com` → importar o repositório → configurar as variáveis de
   ambiente do `.env` no painel do projeto).
3. Rode `npx drizzle-kit migrate` apontando pro banco de produção antes do
   primeiro deploy (ou configure isso como parte do seu processo de build).

## O que já está pronto (Fase 1 + Fase 2 + Fase 3)

- [x] Login por CPF/CNPJ + senha (com hash bcrypt)
- [x] Cadastro de prefeitura em 4 etapas (dados → sistemas → plano → maior problema)
- [x] Proteção de rotas `/dashboard/*` (redireciona pra login se não autenticado)
- [x] Dashboard com saudação dinâmica, indicadores (inserção manual) e alertas
- [x] CRUD de alertas (criar, listar, resolver)
- [x] Página de configurações com dados da prefeitura e status dos sistemas
- [x] **IA Central real**: chat que responde com base nos dados reais do
      banco (indicadores, alertas e agora também Saúde/Educação/Obras/
      Licitações), nunca inventando números.
- [x] **Secretaria da Saúde**: unidades de saúde (UBS/posto/hospital/SAMU) +
      indicadores (tempo de atendimento, médicos ativos, faltas, estoque)
- [x] **Secretaria da Educação**: escolas + indicadores (frequência, nota
      média, transporte, professores), com destaque visual pra evasão alta
- [x] **Obras**: cadastro com progresso atual vs. esperado, status, alerta
      automático (cálculo simples, não é IA) quando o progresso está muito
      abaixo do esperado
- [x] **Licitações**: processos com modalidade, valor, status e observação
      de risco manual, com destaque para processos sinalizados
- [x] **Múltiplos usuários por secretaria**: o prefeito (Configurações →
      Usuários) cria contas de secretário vinculadas a uma secretaria
      específica. Um secretário só enxerga a própria área — sem acesso ao
      financeiro geral, outras secretarias, alertas gerais ou configurações.
      A restrição vale na navegação (`proxy.ts`) e também na IA Central (o
      contexto que a IA recebe já vem filtrado pelo cargo de quem pergunta).
- [x] **Mapa geográfico de verdade** (Saúde, Educação, Obras): usando
      Leaflet + OpenStreetMap (gratuito, sem chave de API). Cada unidade de
      saúde, escola e obra pode receber latitude/longitude no cadastro; se
      tiver coordenadas, aparece como marcador no mapa da secretaria, com
      popup mostrando nome e detalhes. Itens sem coordenadas continuam
      listados normalmente, só não aparecem no mapa. Se as imagens do mapa
      não carregarem (bloqueio de rede/firewall), um aviso explica isso em
      vez de deixar tudo cinza sem explicação.
- [x] **Histórico e Simulação** (`/dashboard/historico`, só prefeito/admin):
      gráficos de tendência real — cada atualização de indicador (financeiro,
      saúde, educação) já vira uma linha nova no banco, então o histórico se
      acumula sozinho conforme o uso. Os gráficos só aparecem quando há pelo
      menos 2 registros reais; com menos que isso, mostra uma mensagem
      explicando a limitação em vez de inventar uma linha de tendência.
      A partir de **3 registros reais**, cada gráfico soma uma linha
      tracejada de **projeção estatística simples** (`src/lib/projecao.ts`):
      regressão linear sobre o histórico real, com nível de confiança
      (baixa/média/alta) calculado a partir da quantidade de pontos e do R².
      Essa mesma projeção (pra saldo financeiro) também entra no contexto
      da IA Central quando o plano Gestão está ativo — o system prompt
      instrui explicitamente a nunca apresentá-la como algo mais confiável
      do que uma regressão simples. Também tem um **simulador financeiro**
      (calculadora de "e se a receita/despesa variar X%", aritmética direta
      e transparente, identificada como calculadora).
      **O que isso NÃO é**: um gêmeo digital de verdade, nem previsão de
      risco de saúde, evasão escolar, atraso de obras etc. — isso exigiria
      um modelo estatístico multivariável treinado com anos de dados reais
      e validado contra o que de fato aconteceu, que este sistema ainda não
      tem tempo de acumular. A regressão linear simples é uma direção
      aproximada de curtíssimo prazo (~30 dias), não uma simulação.
- [x] **Relatórios em PDF automáticos**: usando `@react-pdf/renderer`
      (gera PDF de verdade no servidor, sem precisar de navegador headless —
      mais leve e confiável em produção/serverless que Puppeteer). Dois
      tipos: **Relatório Executivo** (financeiro + alertas + resumo de todas
      as secretarias, só prefeito/admin) e **Relatório por Secretaria**
      (indicadores + lista de itens daquela área — prefeito/admin baixa
      qualquer um, secretário só o da própria secretaria). Botão "Baixar
      relatório (PDF)" na Visão Geral e em cada página de secretaria. Testei
      extraindo o texto de dentro do PDF gerado pra confirmar que os valores
      reais (receita, alerta cadastrado, unidade de saúde) aparecem
      corretos — nada de conteúdo de exemplo. Os relatórios específicos por
      destinatário mencionados na visão original (Vice-Prefeito, Câmara
      Municipal, Tribunal de Contas, Audiências Públicas) ainda não têm
      formatação própria — hoje usam o mesmo Relatório Executivo/por
      secretaria; adaptar o layout para cada público é um próximo passo
      natural, não uma limitação de dados.

## O que ainda falta (próximas fases)

- **Integrações reais** (E-SUS, SIAFI, TCE, Portal da Transparência etc.):
  todos os dados das secretarias hoje são inseridos manualmente pela
  prefeitura. Integração de verdade depende de credenciais/API de cada
  sistema, que só a prefeitura consegue liberar.
- **IA preditiva / Gêmeo Digital de verdade**: construímos a base honesta
  disso — histórico real acumulado + calculadora financeira simples (ver
  item acima). Uma previsão de verdade (ex: "risco de superlotação em 18
  dias", "evasão escolar vai aumentar X%") exige um modelo estatístico
  treinado com meses/anos de dados históricos reais, que este sistema ainda
  não acumulou. Conforme os indicadores forem sendo atualizados ao longo do
  tempo pela prefeitura, dá para evoluir isso para projeções estatísticas
  reais (ex: regressão linear simples sobre a tendência real) — mas ainda
  não há dados suficientes para isso ter significado.
- **Recuperação de senha por e-mail**: hoje é só uma tela avisando que não
  está pronta.
- **Geocodificação automática**: hoje quem cadastra precisa saber a
  latitude/longitude manualmente. Um próximo passo natural é converter
  endereço/bairro em coordenadas automaticamente (ex: via Nominatim, que
  também é gratuito).

## Estrutura do projeto

```
src/
  app/
    login/            → tela de login + esqueci senha
    cadastro/          → wizard de 4 etapas
    dashboard/
      page.tsx         → Visão Geral
      ia/              → IA Central (chat real)
      alertas/         → CRUD de alertas
      configuracoes/   → dados da prefeitura
      secretarias/     → Saúde, Educação, Obras, Licitações (Fase 3)
  db/
    schema.ts          → todas as tabelas (Drizzle)
  lib/
    sessao.ts          → JWT em cookie httpOnly
    senha.ts           → hash/verificação bcrypt
    documento.ts       → validação de CPF/CNPJ
    ia.ts              → lógica da IA Central (contexto real + chamada à Anthropic)
    dados-prefeitura.ts → funções de leitura do banco
  proxy.ts             → protege rotas /dashboard/* (antigo "middleware")
```
