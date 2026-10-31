@AGENTS.md

# Design: como trabalhar na interface do CidadeIA

O site e o produto devem parecer feitos por designer e desenvolvedor de verdade, não com a cara genérica de IA. As skills de design ficam em `.claude/skills/` (cada pasta traz a licença do autor) e entram em todo trabalho de tela:

- **impeccable** (Paul Bakaus): regras de tipografia, espaçamento, layout, cor, hierarquia e acessibilidade. Use `audit`/`critique` antes de mexer e `polish`/`typeset`/`layout` para refinar. É refinamento, não redesenho: a identidade atual (tema escuro, roxo da marca, títulos grandes, tokens de `globals.css`) se preserva.
- **emil-design-eng** e as skills de animação do Emil Kowalski (`animate`, `review-animations`, `improve-animations`, `animation-performance`, `animation-vocabulary`, `find-animation-opportunities`, `apple-design`, `mobile-native`, `break-ui`): toda animação nova passa por elas — propriedades só de composição, curvas de saída, nada surgindo do zero, respeito a movimento reduzido.
- **taste-skill**: referências de sites premiados para fugir do visual de template (selo acima do título, fileira de cartões com ícone, degradê suave). Use para páginas públicas; telas do painel seguem `references/app-screens.md` dela.

Regras do projeto que as skills não mudam:
- Cor só por token (`var(--…)`); o teste de design-system proíbe cor literal fora de `lib/email-modelo.ts`.
- Texto em português do Brasil, linguagem de prefeitura e de morador.
- Nada de depoimento, cliente, pessoa ou número inventado apresentado como real; nenhum rosto gerado por IA como equipe ou cliente.

Ver o que construiu: o Playwright MCP (`.mcp.json`, `scripts/playwright-mcp.mjs`) abre o site num navegador real para navegar, clicar e tirar print. Toda mudança de tela é conferida em 1366px e 390px antes de publicar, sem rolagem lateral. O desenho mora no Figma, no arquivo **CidadeIA — Site** (https://www.figma.com/design/zyjDgsybWQbxG0GXJNV17k): as cores do tema noite como variáveis (`cor/…`), os componentes (Logo, Botão/primário, Cartão de área com as seis ilustrações, Mapa do Brasil) e a página inicial em 1440 e 390. Mudança de tela começa ali, com esses componentes, e o código segue o desenho; o print do Playwright confere se ficaram iguais. A conta do Figma é do plano Starter: leituras pelo conector (print, estrutura) são limitadas a 20 por mês, então confira primeiro pelo Playwright e gaste no máximo um `get_screenshot` por desenho (com `enableBase64Response: true` e `maxDimension` por volta de 1200; o link que ele devolve não abre daqui).

## Armadilhas já conhecidas (não repita)

Cada uma já custou uma tentativa perdida.

- **Conferir o site local:** `bash scripts/conferir-local.sh`. Liga o banco local (Postgres na porta 54329, tabelas por `drizzle-kit push`; a pasta `drizzle/` tem migrações antigas de SQLite e não serve), monta, sobe, espera responder e falha se a home carregar mais de uma folha de estilo. Não espere servidor com `sleep` nem procure "Error" no registro para decidir se subiu: o script já faz isso direito.
- **Folha de estilo no limite:** passando de ~131 KB, o Turbopack separa as fontes num segundo arquivo bloqueante e a home abre mais devagar. Nem `cssChunking: "graph"` nem `turbopackChunking.maxMergeChunkSize` evitam (testado). Regra de uma tela só vai para o CSS da própria tela (como `app/dashboard/painel.css`), e CSS morto sai antes de entrar coisa nova.
- **Print da página inteira:** seções com `tela-adiada` (content-visibility) saem pretas num `fullPage` sem rolar antes. Role a página até o fim primeiro, ou force `content-visibility: visible` só no print. Preto no print não é preto no site.
- **Figma pelo `use_figma`:** não existe `screenshot()` lá dentro, e `exportAsync` estoura o limite de 48 KB da resposta. Enviar imagem com `upload_assets` também não funciona daqui: a rede bloqueia `mcp.figma.com` no shell. Desenhe com os componentes e as variáveis do arquivo.
- **Produção:** `/api/onde-estou` responde 403 a qualquer coisa que não seja a própria página (é de propósito). Para conferir produção, use a Vercel (deploy e registros de execução); `web_fetch_vercel_url` só funciona se o conector da Vercel tiver acesso ao time do projeto.
- **Artifact:** `edits` não vai junto com `files` na mesma publicação; edite o arquivo e publique de novo.
- **Lighthouse local:** no modo padrão (simulado), o LCP da home sai em ~4 s e é falso. Do localhost o JavaScript chega na hora e roda antes do primeiro desenho; a simulação então conta o texto do topo como dependente de todo o JS. Com `--throttling-method=devtools` (rede e CPU lentas de verdade) o mesmo texto aparece em ~2 s, igual ao primeiro desenho. Para comparar versões, rode as duas do mesmo jeito, três vezes cada, e olhe a faixa, não uma rodada.
- **Playwright pelo terminal:** escreva o script num arquivo fora do repositório e rode com `node arquivo.cjs`. Com `node -e` dentro do repositório, o `require("playwright")` pega a versão do projeto, que não tem navegador instalado aqui.
- **Medir travada:** `medir.cjs`-style com CPU 4x mais lenta e `?leve=0`, e desligar uma peça por vez com CSS injetado; para saber o que a linha principal faz, grave um trace (`browser.startTracing`) e some o tempo próprio por evento. Em novembro de 2026 isso achou: canvas grande recopiado a cada pintura, animação de `box-shadow` infinita e camada de 9.000 px com seis degradês.
- **Parar processo:** nunca `pkill -f "<trecho do comando>"` dentro do mesmo comando de shell: o padrão casa com o próprio shell que está rodando e ele se mata (saída 144). Pare pelo PID guardado, como faz `scripts/conferir-local.sh parar`.
- **Conferência que espera falha:** quando o certo é dar erro (porta livre depois de parar, 403 de propósito), escreva o teste para sair 0 e dizer o resultado (`curl … || echo "porta livre"`). Senão o comando aparece como falha sem ter falhado nada.
