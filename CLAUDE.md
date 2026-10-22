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

Ver o que construiu: o Playwright MCP (`.mcp.json`, `scripts/playwright-mcp.mjs`) abre o site num navegador real para navegar, clicar e tirar print. Toda mudança de tela é conferida em 1366px e 390px antes de publicar, sem rolagem lateral. Quando o conector do Figma estiver ligado, o desenho pode partir dele e o resultado ser comparado com o print.
