# Design system do CidadeIA

Este documento descreve o sistema que **já está no código**, em
`src/app/globals.css`. Ele não propõe nada: se houver divergência entre o que
está aqui e o que o CSS faz, o CSS está certo e este arquivo está desatualizado.

Para quem chega agora: a regra prática cabe em uma frase — **nunca escreva uma
cor em hexadecimal numa tela.** Use um token. As exceções estão listadas no fim,
são poucas, e todas têm o mesmo motivo técnico.

---

## 1. A regra, e por que ela existe

O produto tem dois temas. Uma cor escrita em hexadecimal não troca de tema:
funciona num e some ou grita no outro. Pior, ela diverge — três telas pintando
"urgente" com três vermelhos parecidos fazem o prefeito perguntar se os três
significam a mesma coisa.

Isso não é hipótese. Em outubro de 2026 o repositório tinha **67 cores em
hexadecimal no código**, e entre elas:

- a rosca de alertas usava um vermelho, e o cartão de alerta logo abaixo dela
  usava outro, para a mesma prioridade;
- o selo de variação do painel inventava um verde, um vermelho e um cinza que
  não existiam em nenhum outro lugar;
- a tela de histórico pintava seis gráficos com seis hexadecimais avulsos que
  não acompanhavam o modo escuro.

Depois da limpeza sobraram 53, **todas** em geração de PDF, e-mail, imagem de
compartilhamento ou superfície de cor fixa — lugares onde variável CSS
genuinamente não resolve. Ver a seção 8.

O teste `tests/design-system.test.ts` trava isso: ele varre o código (ignorando
comentários) e falha se aparecer hexadecimal fora da lista de exceções.

---

## 2. Cor

### Superfícies e tinta

| Token | Para quê |
|---|---|
| `--background` | fundo da página |
| `--superficie` | faixa alternada de seção, trilho de campo |
| `--card` | fundo de cartão — é a superfície contra a qual as paletas são validadas |
| `--foreground` | tinta principal |
| `--muted` | tinta secundária: legenda, eixo, texto de apoio |
| `--border` | divisor e contorno |
| `--sutil` | fundo quase invisível para trilho e pílula. Existe porque `bg-black/5` funciona no claro e some no escuro |

### Marca

`--brand` é ação e link. `--brand-dark` é a versão de pressão/hover.
`--brand-tint` é o fundo pálido da marca. `--brand-profundo` é o fundo das
faixas escuras e da barra utilitária.

`--brand-legivel` existe por um motivo específico: é a cor de marca que **lê
sobre `--brand-tint` nos dois temas**. `--brand-dark` servia para isso e
continua certo no claro, mas no escuro vira azul médio sobre fundo escuro, com
contraste abaixo do mínimo. Quando a regra for legibilidade e não profundidade,
use `--brand-legivel`.

`--accent` é o verde institucional, usado para confirmação e destaque positivo
fora da escala de status.

### Status — reservado

| Token | Significado |
|---|---|
| `--urgente` (+ `-tint`, `-borda`) | exige ação agora |
| `--medio` (+ `-tint`, `-borda`) | atenção, ainda dá tempo |
| `--info` (+ `-tint`, `-borda`) | em ordem, ou informativo |

`--danger` e `--warning` são apelidos de `--urgente` e `--medio`.

**Estes três são reservados.** Nunca use um deles como "a cor da quarta série"
de um gráfico: um gráfico cuja quarta linha é vermelha vira um alarme falso.

**E nunca use cor de status sozinha.** O validador mostrou por quê: no tema
claro, `--medio` contra `--urgente` dá **ΔE 2,0 para deuteranopia** — para
cerca de 8% dos homens, âmbar e vermelho são o mesmo ponto. Com visão normal as
duas se distinguem bem, então o defeito é invisível para quem escreve a tela.
Toda cor de status anda acompanhada de ícone ou rótulo. `src/components/
MarcadorSituacao.tsx` tem o registro completo dessas medições.

### Séries de gráfico

`--serie-1` a `--serie-6`. Ordem **fixa**: a série 1 é sempre a série 1.

> A cor segue a entidade, nunca a posição no ranking. Um filtro que muda a
> quantidade de linhas não pode repintar as que sobraram.

Uma sétima série não ganha uma cor nova: ela vira "Outros", ou o gráfico vira
pequenos múltiplos.

| Slot | Claro | Escuro |
|---|---|---|
| 1 | `#1a5fd0` | `#4d8ae8` |
| 2 | `#b5451a` | `#d4663a` |
| 3 | `#02855f` | `#13a87c` |
| 4 | `#7a3fb5` | `#9f6ad6` |
| 5 | `#a8820f` | `#a8871f` |
| 6 | `#b02a6b` | `#d1649c` |

### Tinta sobre preenchimento forte

`--sobre-forte` (branco) e `--sobre-acento` (verde quase preto). Não trocam com
o tema, porque o preenchimento embaixo delas não clareia: botão de marca é azul
forte nos dois temas. Os tokens existem para o `#fff` solto parar de ser
decidido de novo a cada tela.

---

## 3. Validar é computar, não olhar

A separação de cores sob daltonismo **não se avalia no olho**. Existe um
validador, e ele roda:

```
node scripts/validate_palette.js "<hex,hex,...>" --mode light  --surface "#ffffff"
node scripts/validate_palette.js "<hex,hex,...>" --mode dark   --surface "#14161b"
```

(do skill `dataviz`; as superfícies são `--card` de cada tema).

Ele checa cinco coisas: faixa de luminosidade, piso de croma, separação sob
daltonismo, piso de visão normal e contraste contra a superfície.

**Medições registradas em 02/10/2026**, para a paleta de séries acima:

| | Claro | Escuro |
|---|---|---|
| Pior par adjacente, daltonismo | ΔE 8,5 (deutan) · 15,0 (tritan) | ΔE 8,5 (deutan) · 7,0 (tritan) |
| Pior par adjacente, visão normal | ΔE 24,1 | ΔE 20,9 |
| Contraste contra a superfície | todos ≥ 3:1 | todos ≥ 3:1 |

Alguns pares caem na faixa 6–8, que é legal **somente com codificação
secundária**. Daí a regra: **todo gráfico com duas ou mais séries precisa de
legenda ou rótulo direto.** Cor nunca é o único portador de identidade.

Duas armadilhas que o validador já pegou aqui:

- **A faixa de luminosidade do escuro é mais estreita e mais baixa** que a do
  claro (L 0.48–0.67 contra 0.43–0.77). Clarear automaticamente a paleta do
  claro joga metade dela para fora da faixa. Os passos do escuro são
  **escolhidos**, não derivados.
- **Seis séries não passam no teste de todos os pares.** Nem as oito da
  referência do próprio skill. O padrão operante é o de pares *adjacentes*,
  garantido pela ordem fixa; quando muitas séries aparecem juntas, o certo é
  cortar ou facetar, não inventar um sétimo tom.

---

## 4. Tipografia

- `--font-titulo` / `font-serif` — títulos e números de destaque.
- `--font-corpo` / `font-sans` — texto corrido e interface.

Número que o leitor vai comparar entre linhas usa `.tabular-nums`. Sem isso as
colunas dançam e o olho não consegue alinhar valores.

---

## 5. Movimento

| Token | O que é |
|---|---|
| `--saida` | `cubic-bezier(0.16, 1, 0.3, 1)` — expo-out. Começa rápido, desacelera muito no fim. Curva de entrada de elemento |
| `--rapido` | `cubic-bezier(0.32, 0.72, 0, 1)` — curva curta para micro-interação: hover, foco, pressão |
| `--t-micro` | `150ms` — micro-interação |
| `--t-entrada` | `520ms` — entrada de elemento |

Todo movimento respeita `prefers-reduced-motion`. O bloco no fim de
`globals.css` desliga `.entra-cena`, `.barra-leitura`, `.halo`, `.borda-viva`,
`.inclinavel` e `.magnetico` quando o sistema pede movimento reduzido — e
componentes com animação em JavaScript checam a mesma preferência.

---

## 6. Classes utilitárias

| Classe | O que faz |
|---|---|
| `.arco-card`, `.arco-card-sm`, `.arco-badge`, `.arco-topo` | a família de raios de canto do produto |
| `.card-interactive` | cartão que responde ao ponteiro |
| `.shadow-elevated` | elevação com resposta no hover |
| `.elevar` | sobe levemente no hover, afunda no clique |
| `.link-traco` | link cujo traço cresce da esquerda no hover e no foco |
| `.vidro` | fundo translúcido com desfoque |
| `.revelar`, `.entra-cena` | entrada ao rolar |
| `.parallax`, `.parallax-sutil/-medio/-forte` | profundidade na rolagem |
| `.inclinavel`, `.inclinavel-amplo`, `.magnetico`, `.halo`, `.borda-viva` | reações ao ponteiro |
| `.barra-leitura` | progresso de leitura |
| `.rolagem-discreta` | barra de rolagem fina |
| `.pular-para-conteudo` | link de salto para o conteúdo |
| `.imprimir-limpo` | ajustes para impressão |

Elevação: `--shadow-sm`, `--shadow-md`, `--shadow-lg`.

---

## 7. Acessibilidade

- **Foco sempre visível.** `:focus-visible` em link, botão, campo, select,
  textarea e `summary` desenha `outline: 2px solid var(--brand)` com
  `outline-offset: 2px`. Sobre fundo escuro o contorno é branco.
- **Cor nunca sozinha.** Status anda com ícone ou rótulo; série anda com
  legenda ou rótulo direto.
- **Modo escuro é escolhido, não invertido.** Cada token tem o seu passo
  próprio no tema noite, medido contra a superfície escura.

---

## 8. As exceções, e por que são exceções

Nestes lugares a cor **precisa** ser literal, porque quem renderiza não resolve
variável CSS:

| Onde | Por quê |
|---|---|
| `src/lib/relatorios/*` | PDF. O renderizador não tem CSS do documento |
| `src/app/api/kit/[documento]/route.ts` | documento gerado |
| `src/lib/og-imagem.tsx` | imagem de compartilhamento, renderizada fora do navegador |
| `src/lib/pedido-proposta.ts`, `src/app/raio-x/lead-actions.ts`, `src/lib/cobranca-servidor.ts`, `src/lib/rotina-comercial.ts`, `src/app/_atendimento/actions.ts`, `src/instrumentation.ts` | HTML de e-mail. Cliente de e-mail não suporta variável CSS |
| `src/app/global-error.tsx` | substitui o layout raiz; a folha de estilo pode não ter carregado |
| `src/components/site/SiteFooter.tsx` | a marca sobre o rodapé, que é escuro nos dois temas |
| `src/components/FaixaDemo.tsx` | o selo de demonstração é âmbar fixo de propósito: ele precisa destoar do tema, não acompanhá-lo |
| `src/components/site/PainelDemonstracao.tsx` | três pontinhos que **desenham** uma janela. É ilustração, não dado nem estado |

A lista vive também em `tests/design-system.test.ts`. Acrescentar um arquivo a
ela é uma decisão deliberada — escreva o motivo no teste, não só o caminho.
