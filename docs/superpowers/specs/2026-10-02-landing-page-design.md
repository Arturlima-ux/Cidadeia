# Landing page — tese, texto e presença

Data: 02/10/2026 · Escopo: `/` (a home). Não inclui `/solucoes`, `/raio-x`,
`/como-contratar` nem `/proposta`, que continuam como estão.

---

## 1. O problema

O fundador: *"o comercial está fraco, ainda possui traços de IA"*.

Lendo a página como um visitante lê, os traços são concretos e todos de
**cadência**, não de conteúdo:

1. **Travessão em quase todo parágrafo.** É o tique mais reconhecível de texto
   de modelo em português.
2. **Tudo em três.** "enxergar, analisar e agir"; "Sem cadastro · sem
   formulário · dado que já é público".
3. **A construção "Não é X. É Y.", repetida** em seções diferentes.
4. **Nada é silencioso.** Toda seção argumenta na mesma intensidade. Páginas
   como as da Apple e da Stripe funcionam porque a maior parte é quieta e UMA
   coisa grita. Esta grita o tempo todo, e por isso cansa antes de convencer.
5. **O herói pede cinco coisas de uma vez**: título abstrato, parágrafo de três
   linhas, contador, dois botões e uma linha de ressalva.

O conteúdo não é o problema. Há frases boas e autorais lá dentro — *"Quem vê a
cadeira vazia é a diretora, não o secretário"*. O problema é que elas estão
afogadas em argumento uniforme.

---

## 2. A tese

**Ancoragem de consequência (A) + demonstração local (B).**

> **"O Tribunal de Contas já está contando."**

A consequência dá a aposta em uma linha. A prova é o município de quem está
lendo, calculado ali, com dado que a própria prefeitura declarou.

Rejeitadas:

- **Só consequência (A).** Vender por medo cansa, e o secretário que não decide
  se sente fora da conversa. O medo dito uma vez, com número verificável
  embaixo, fica; repetido, vira ruído.
- **Só produto (B).** Quem chega sem saber o que é o CidadeIA vê uma ferramenta
  pública grátis, resolve a dúvida e vai embora satisfeito.
- **Plataforma (C) — "a prefeitura inteira, uma base só".** É a página de hoje,
  e é o que todo ERP municipal também diz.

### A restrição que governa tudo

Não há carteira de clientes para exibir. Confiança sem prova social se constrói
de um jeito só: **precisão obsessiva e limite declarado.** Toda vez que a página
tentar soar maior do que é, vai soar como IA — é a mesma doença.

---

## 3. Os seis benchmarks, traduzidos em decisão

| Benchmark | O que se pega | O que vira na página |
|---|---|---|
| Pagani | obsessão por detalhe | todo número carrega o artigo que o cria, a fonte e o período. A página diz o que **não** sabe |
| Apple | simplicidade, produto no centro | o herói é o produto funcionando, não ilustração. Uma afirmação, uma prova, um gesto |
| Palantir | dado + governo | a página calcula o município de quem lê, antes de pedir qualquer coisa |
| Stripe | B2B sofisticado | respeita a inteligência do leitor. O artigo de lei é o equivalente ao trecho de código |
| NVIDIA | tecnologia de ponta | contido. "A conta é regra, não IA" impressiona mais um procurador do que prometer inteligência artificial |
| SpaceX | escala e ambição | 5.570 municípios já calculáveis. Escala que o produto sustenta |

**Proibido** (decisão do fundador): fibra de carbono, dourado, relógios,
carros, qualquer textura "de luxo". A filosofia, não a estética.

---

## 4. O herói

### 4.1 Estrutura

```
O Tribunal de Contas já está contando.

[ selecione seu município ]

(ao selecionar, três fatos aparecem em streaming)
```

Headline sem adjetivo e sem alarde. Uma linha de subtítulo que diz o que a
ferramenta faz, **sem a palavra "tempo real"** (ver 4.4).

### 4.2 Os três fatos — abertos, sem cadastro

**Fato 1 — Despesa com pessoal, confrontada com o limite que a própria
prefeitura declarou.**

Fonte: RGF Anexo 01 no SICONFI, via `buscarRgfMaisRecente` (já existe). O anexo
publica, lado a lado:

- `DespesaComPessoalTotal`
- `ReceitaCorrenteLiquidaLimiteLegal`
- `LimiteDeAlertaDespesaComPessoalTotal`
- `LimitePrudencialDespesaComPessoalTotal`
- `LimiteMaximoDespesaComPessoalTotal`

**A página não calcula limite nenhum.** Ela espelha a despesa declarada contra
o limite declarado, ambos pelo próprio município, no mesmo documento. Não há
discussão possível sobre "a conta do CidadeIA estar errada".

O limite de alerta é da **LRF, art. 59, § 1º, IV** — nunca atribuir ao Tribunal
de Contas.

**Fato 2 — Aplicação em saúde e educação.**

Fonte: RREO via `montarRaioX` (já existe). Vem com a ressalva que o produto já
usa, **literal, sem reescrever** (`raio-x-texto.ts`):

> "Os percentuais da receita são indício, não cálculo de mínimo constitucional:
> a base legal do mínimo (15% em saúde, 25% em educação) é a receita de
> impostos e transferências, não a receita total."

Duas verdades sobre o mesmo número em dois lugares do produto é como uma delas
fica errada.

**Fato 3 — Relatórios obrigatórios que não constam publicados.**

Fonte: `rreoFaltando` do Raio-X (já existe). Substitui o "Alertas vigentes do
TCE" que o rascunho pedia.

**Por que a substituição é obrigatória:** são 33 Tribunais de Contas no país,
nenhum com feed público unificado que o produto consuma. Aquela métrica seria
fabricada, e é a primeira que um assessor checa. A omissão de relatório, não:
é fato auditável na fonte oficial, com penalidade objetiva — suspensão de
transferências voluntárias, **LRF art. 51, § 2º** — e o visitante confere no
site do Tesouro em um clique.

### 4.3 A trava de conversão

| | Conteúdo | Por quê |
|---|---|---|
| **Aberto** — sem cadastro | os três fatos acima, com fonte, período e base legal | é dado público. Cobrar por ele seria consulta pública capada, e o cético vai embora achando que escondemos o número |
| **Fechado** — cadastro institucional | projeção de fechamento do exercício e as ações de contenção | é trabalho do software, não dado dele. Cobrar por isso é justo |

**O número de ações é o que as regras produzirem** para aquele município. Se
forem duas, aparecem duas; se forem sete, sete. Número redondo em material
comercial é número de marketing, e o produto inteiro foi construído para não
ter nenhum.

O lado fechado reusa o que já existe: `avaliarDespesaPessoal`,
`avaliarReconducao`, `VEDACOES_PRUDENCIAL`, `SANCOES_PRAZO_ESGOTADO`
(`despesa-pessoal.ts`) e `projetarTravessia` / `antecipacaoDoPessoal`
(`antecipacao.ts`).

> **Dependência comercial bloqueante.** O envio automático do relatório para o
> e-mail oficial da prefeitura **não funciona hoje**: o remetente gratuito da
> Resend devolve 403 para qualquer destinatário que não seja o dono da conta, e
> isso só se resolve com domínio próprio. O cadastro captura o lead e notifica a
> equipe (que já funciona, é o mesmo caminho de `/proposta`); a entrega
> automática ao solicitante entra quando o domínio existir. O spec não finge o
> contrário, e a tela não promete envio que não acontece.

### 4.4 Temporalidade — carimbo duplo

Duas datas diferentes, as duas obrigatórias ao lado de cada número:

1. **O período que o dado mede** — "RGF do 2º quadrimestre de 2026, declarado
   pela prefeitura ao Tesouro".
2. **Quando o sistema consultou** — `consultadoEm`, sem hora.

**A expressão "tempo real" está proibida na página.** O SICONFI publica por
bimestre e por quadrimestre; o dado chega com meses de atraso. Dizer "tempo
real" para um contador, um procurador ou um secretário de finanças é perder a
sala no primeiro parágrafo.

Mostrar só a data de consulta, com hora, sugere atualização horária que não
existe — por isso o carimbo é duplo e sem hora.

### 4.5 Limite declarado, na própria interface

Nota de escopo visível, não em rodapé:

> "O CidadeIA não substitui o parecer da contabilidade interna nem a assessoria
> jurídica do município. A plataforma processa dado público oficial para
> apontar desvio de rota antes que ele vire apontamento formal."

### 4.6 Streaming — requisito técnico

Buscar o RGF faz **até 8 chamadas sequenciais** ao Tesouro
(`buscarRgfMaisRecente`, `tentativas = 8`). O herói não pode bloquear nisso.

**Mecanismo: o mesmo do Raio-X, não SSE.** O rascunho pedia Server-Sent Events;
o Raio-X não usa SSE — usa `<Suspense>` com `await connection()` dentro do
componente que busca, e o Next transmite o HTML conforme cada parte resolve.
Está no ar desde a correção desta semana (commit `117d9f8`), levou 2–5 s de
tela branca para 0,6 s de conteúdo, e não exige rota nova nem código de
cliente. Introduzir SSE aqui seria um segundo mecanismo para o mesmo problema.

Consequência de rota: a seleção do município navega para `/?m=<codigoIbge>`,
que é compartilhável e renderiza no servidor com streaming. A home já é
dinâmica (`ƒ`), então não há perda de cache. Cada fato tem seu próprio
`<Suspense>` com esqueleto da forma certa — os três não esperam o mais lento.

---

## 5. Texto: as regras que matam o som de IA

Regras explícitas, porque "escreva melhor" não é instrução verificável.

1. **Travessão retórico: no máximo três na página inteira.** Onde hoje há
   travessão, ou vira ponto final, ou a oração sai.
2. **Proibida a lista de três** como recurso de ritmo. Duas ou quatro.
3. **Proibida a construção "Não é X. É Y."** Aparece hoje em duas seções.
4. **Uma afirmação por seção.** Se a seção precisa de duas, são duas seções ou
   uma delas sai.
5. **Todo número vem com fonte e período.** Sem exceção.
6. **A página diz o que não sabe.** Pelo menos um limite declarado por tela de
   argumento.
7. **Sem superlativo e sem adjetivo de marketing**: "completo", "poderoso",
   "revolucionário", "inteligente" (como adjetivo do produto), "tudo em um".
8. **Silêncio é parte do desenho.** A maior parte da página é quieta; uma coisa
   grita por tela.

### Travadas por teste

`tests/landing-voz.test.ts` lê o texto visível da home e falha em: contagem de
travessões acima do teto, qualquer construção da regra 3, qualquer palavra da
regra 7. Regra de estilo que não tem teste vira folclore em dois meses — foi o
que aconteceu com a cor (ver `docs/design-system.md`).

As regras 4, 6 e 8 são de julgamento e ficam documentadas, não testadas.

---

## 6. Presença visual

Herda `docs/design-system.md` inteiro. Nada de token novo.

- **Hierarquia por tamanho e silêncio, não por cor.** Hoje quase toda seção tem
  fundo alternado, borda e título em caixa alta. O resultado é que nenhuma
  pesa mais que a outra.
- **O produto é a imagem.** O painel real já aparece na home
  (`PainelDemonstracao`). Ele sobe, e a ilustração desce.
- **Números em `tabular-nums`**, sempre, como manda o design system.
- **Movimento**: só `--t-micro` e `--rapido` em micro-interação, e
  `--t-entrada`/`--saida` na entrada do herói. Nada mais se mexe. Página que se
  mexe inteira parece template.

---

## 7. Estrutura das seções

A ordem atual tem justificativa escrita em `page.tsx` e **é mantida**: o que é
→ o que faz → por que não a incumbente → quanto custa → dá para conferir → como
sai do papel → antes de assinar.

Muda:

1. **O herói**, inteiro (seção 4).
2. **"Quatro números, quatro links" encolhe.** Nenhum dos quatro valores
   (5.571 municípios, 13 exigências, 6 módulos, teto da dispensa) é calculado
   pelo herói, então não há repetição de número. O que repete é o **trabalho**
   da seção: ela existe para dizer "não peça fé, confira", e o herói passa a
   fazer isso com o município da própria pessoa, que é prova mais forte. A
   seção perde o peso de seção — vira uma linha de quatro links, perto do
   rodapé, para quem quer conferir o resto.
3. **Toda seção perde a segunda afirmação** (regra 4).

Não muda: as seções de módulos, comparação, preço, contratação e conformidade,
além do reaproveitamento de componentes. É reescrita de texto e hierarquia, não
de arquitetura.

---

## 8. O que pode dar errado

| Risco | Mitigação |
|---|---|
| Município sem RGF publicado no Tesouro | o herói diz isso, com o que foi procurado e em que períodos. É um achado, não um erro |
| As 8 chamadas estouram o tempo | streaming por fato; cada um tem esqueleto próprio e falha isolada |
| Abuso da API pública do Tesouro | o Raio-X já tem o caminho e o rate limit (`rate-limit.ts`); o herói usa o mesmo |
| A trava afastar o cético | o lado aberto é diagnóstico completo com fonte. Só a projeção e o plano ficam atrás do cadastro |
| O e-mail não chegar ao solicitante | declarado em 4.3. A tela não promete envio enquanto não houver domínio |

---

## 9. Como se verifica que funcionou

1. `tests/landing-voz.test.ts` passa.
2. `npm run typecheck` e `next build` limpos.
3. A home renderizada contra um município real (não a demo) mostra os três
   fatos com fonte, período e base legal, e nenhum número sem carimbo.
4. Um município sem RGF publicado mostra o achado, não um erro.
5. Medição de TTFB da home com `?m=` abaixo de 1 s, como no Raio-X.
