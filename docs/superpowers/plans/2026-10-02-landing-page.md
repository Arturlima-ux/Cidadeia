# Landing page — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A home passa a abrir com a consequência ("O Tribunal de Contas já está
contando") e a provar no município de quem está lendo, com dado que a própria
prefeitura declarou ao Tesouro, em streaming.

**Architecture:** Três fatos, cada um num `<Suspense>` próprio dentro da home,
alimentados por uma biblioteca pura que monta o fato a partir do que
`buscarRgfMaisRecente` e `montarRaioX` já devolvem. A seleção de município
navega para `/?m=<codigoIbge>`. A projeção e as ações de contenção ficam atrás
de um cadastro institucional, reusando o caminho de lead que já existe.

**Tech Stack:** Next.js 16.3.3 (Turbopack), React Server Components com
`connection()` + `<Suspense>`, Drizzle/Postgres, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-02-landing-page-design.md`

## Global Constraints

- Escopo é só `/`. `/solucoes`, `/raio-x`, `/como-contratar` e `/proposta` não mudam.
- A expressão **"tempo real" é proibida** em qualquer texto da home.
- Todo número exibido traz **carimbo duplo**: o período que o dado mede e quando o sistema consultou, **sem hora**.
- O limite da despesa com pessoal é **o declarado pela prefeitura no RGF Anexo 01**. A página não calcula limite. O limite de alerta é da **LRF, art. 59, § 1º, IV** — nunca atribuído ao Tribunal de Contas.
- A ressalva de saúde/educação é **literal**, de `raio-x-texto.ts`: "Os percentuais da receita são indício, não cálculo de mínimo constitucional: a base legal do mínimo (15% em saúde, 25% em educação) é a receita de impostos e transferências, não a receita total."
- Nenhum número de ações fixo. É o que as regras produzirem.
- Cor só por token de `docs/design-system.md`. `tests/design-system.test.ts` trava.
- Regras de voz: no máximo **três travessões retóricos** na home inteira; proibida a construção "Não é X. É Y."; proibidas as palavras "completo", "poderoso", "revolucionário", "tudo em um", e "inteligente" como adjetivo do produto.
- A suíte roda com `npx vitest run` (o config já fixa `maxWorkers: 2`). Build: `NODE_OPTIONS="--max-old-space-size=1280 --max-semi-space-size=16" npx next build`.

## Review Focus

1. **Município sem nenhum RGF publicado** — o herói mostra o achado, com os períodos procurados, e não um erro. Coberto na Task 2 e na Task 4.
2. **RGF publicado em branco** (estrutura presente, valores ausentes) — tem que se distinguir de "não publicado": é omissão de conteúdo, não de entrega. Coberto na Task 2.
3. **Limite declarado ausente** — hoje `extrairRgf` devolve `limiteMaximo ?? 0`, e um limite de R$ 0 na tela afirmaria que o município estourou tudo. Coberto na Task 1.
4. **`?m=` com código inválido, inexistente ou lixo** — não pode responder 500 nem consultar o Tesouro. Coberto na Task 4.
5. **Tesouro lento ou fora do ar** — cada fato falha sozinho; os outros dois e a página inteira continuam. Coberto na Task 3.

---

### Task 1: Os limites declarados saem do RGF

Hoje `CONTAS` já mapeia `LimitePrudencialDespesaComPessoalTotal` e
`LimiteDeAlertaDespesaComPessoalTotal`, mas `extrairRgf` não os lê e
`ImportacaoRgf` não os carrega. E `limiteMaximo` cai para `0` quando ausente.

**Files:**
- Modify: `src/lib/siconfi-rgf.ts` (`ImportacaoRgf`, `extrairRgf`)
- Modify: `src/app/dashboard/pessoal/actions.ts:201-202` (único consumidor de `limiteMaximo`)
- Test: `tests/siconfi-rgf.test.ts`

**Interfaces:**
- Produces: `ImportacaoRgf` passa a ter `limiteMaximo: number | null`, `limitePrudencial: number | null`, `limiteAlerta: number | null`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
it("lê os três limites declarados", () => {
  const r = extrairRgf(linhasDeExemplo, periodo);
  expect(r.ok && r.dados.limiteAlerta).toBeCloseTo(48.6 / 100 * RCL, 0);
  expect(r.ok && r.dados.limitePrudencial).toBeCloseTo(51.3 / 100 * RCL, 0);
});

it("limite ausente vira null, nunca zero", () => {
  // Zero na tela afirmaria que o município estourou tudo.
  const semLimites = linhasDeExemplo.filter((l) => !String(l.cod_conta).startsWith("Limite"));
  const r = extrairRgf(semLimites, periodo);
  expect(r.ok && r.dados.limiteMaximo).toBeNull();
  expect(r.ok && r.dados.limiteAlerta).toBeNull();
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `npx vitest run tests/siconfi-rgf.test.ts`
Esperado: FAIL — `limiteAlerta` não existe no tipo.

- [ ] **Step 3: Implementar**

Em `extrairRgf`, ler `CONTAS.limitePrudencial` e `CONTAS.limiteAlerta` com o
mesmo helper `valor()`, e devolver os três limites sem o `?? 0`. Ajustar o
guarda em `pessoal/actions.ts:201` para `dados.limiteMaximo !== null && dados.limiteMaximo > 0`.

- [ ] **Step 4: Rodar a suíte inteira**

Run: `npx vitest run` · Esperado: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/siconfi-rgf.ts src/app/dashboard/pessoal/actions.ts tests/siconfi-rgf.test.ts
git commit -m "RGF: os limites declarados pela prefeitura saem do anexo, e ausente é null"
```

---

### Task 2: Os três fatos, puros

**Files:**
- Create: `src/lib/fatos-do-municipio.ts`
- Test: `tests/fatos-do-municipio.test.ts`

**Interfaces:**
- Consumes: `ImportacaoRgf` (Task 1), `RaioX` e `ResultadoRaioX` de `@/lib/raio-x`.
- Produces:

```ts
export type Carimbo = { periodo: string; consultadoEm: string };
export type Fato = {
  chave: "pessoal" | "aplicacao" | "relatorios";
  titulo: string;
  /** O número, já formatado, ou null quando não há dado. */
  valor: string | null;
  /** A leitura em uma frase. Null quando não há dado. */
  leitura: string | null;
  /** O que impede a leitura, quando valor é null. É achado, não erro. */
  ausencia: string | null;
  fundamento: string;
  fonte: string;
  carimbo: Carimbo | null;
  ressalva: string | null;
};

export function fatoDoPessoal(rgf: ResultadoRgf, consultadoEm: string): Fato;
export function fatoDaAplicacao(raioX: ResultadoRaioX, consultadoEm: string): Fato;
export function fatoDosRelatorios(raioX: ResultadoRaioX, consultadoEm: string): Fato;
export function rotuloDoPeriodoRgf(p: PeriodoRgf): string; // "RGF do 2º quadrimestre de 2026"
```

- [ ] **Step 1: Escrever os testes que falham**

```ts
describe("o fato da despesa com pessoal", () => {
  it("confronta despesa declarada com limite declarado, sem calcular limite", () => {
    const f = fatoDoPessoal(rgfOk({ despesaTotal: 52, rclAjustada: 100, limiteAlerta: 48.6 }), HOJE);
    expect(f.valor).toContain("52,00%");
    expect(f.leitura).toContain("a própria prefeitura declarou");
  });

  it("limite ausente não vira zero nem percentual", () => {
    const f = fatoDoPessoal(rgfOk({ limiteAlerta: null, limitePrudencial: null, limiteMaximo: null }), HOJE);
    expect(f.leitura).not.toMatch(/R\$ ?0|0,00%/);
  });

  it("sem RGF publicado é ausência, não erro", () => {
    const f = fatoDoPessoal({ ok: false, erro: "..." }, HOJE);
    expect(f.valor).toBeNull();
    expect(f.ausencia).toBeTruthy();
  });

  it("RGF em branco se distingue de RGF não publicado", () => {
    expect(fatoDoPessoal(rgfEmBranco(), HOJE).ausencia).not.toBe(
      fatoDoPessoal(rgfNaoPublicado(), HOJE).ausencia
    );
  });

  it("o fundamento é da LRF, nunca do Tribunal de Contas", () => {
    const f = fatoDoPessoal(rgfOk(), HOJE);
    expect(f.fundamento).toContain("59");
    expect(f.fundamento).not.toMatch(/Tribunal de Contas/);
  });
});

describe("o fato da aplicação em saúde e educação", () => {
  it("traz a ressalva literal do produto", () => {
    expect(fatoDaAplicacao(raioXOk(), HOJE).ressalva).toBe(RESSALVA_MINIMOS);
  });
});

describe("o fato dos relatórios", () => {
  it("nomeia os bimestres que não constam e cita o art. 51, § 2º", () => {
    const f = fatoDosRelatorios(raioXOk({ rreoFaltando: [3, 4] }), HOJE);
    expect(f.leitura).toContain("3º");
    expect(f.fundamento).toMatch(/51/);
  });

  it("nada faltando não vira elogio vazio", () => {
    expect(fatoDosRelatorios(raioXOk({ rreoFaltando: [] }), HOJE).valor).toBeTruthy();
  });
});

describe("o carimbo é duplo e sem hora", () => {
  it("traz o período medido e a data de consulta", () => {
    const c = fatoDoPessoal(rgfOk(), HOJE).carimbo!;
    expect(c.periodo).toMatch(/quadrimestre|semestre/);
    expect(c.consultadoEm).not.toMatch(/\d{2}:\d{2}/);
  });
});

describe("a página não diz tempo real", () => {
  it("nenhum texto gerado contém a expressão", () => {
    for (const f of [fatoDoPessoal(rgfOk(), HOJE), fatoDaAplicacao(raioXOk(), HOJE), fatoDosRelatorios(raioXOk(), HOJE)]) {
      expect(JSON.stringify(f)).not.toMatch(/tempo real/i);
    }
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `npx vitest run tests/fatos-do-municipio.test.ts` · Esperado: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `src/lib/fatos-do-municipio.ts`**

Exportar `RESSALVA_MINIMOS` importando o texto de `raio-x-texto.ts` em vez de
copiá-lo; se lá ele não estiver exportado, exportar lá e importar aqui. Duas
cópias é como uma delas fica errada.

- [ ] **Step 4: Rodar e confirmar que passam** · Run: `npx vitest run tests/fatos-do-municipio.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/fatos-do-municipio.ts tests/fatos-do-municipio.test.ts src/lib/raio-x-texto.ts
git commit -m "Os três fatos do município, com fonte, carimbo duplo e base legal"
```

---

### Task 3: O herói busca e transmite

**Files:**
- Create: `src/components/site/FatoDoMunicipio.tsx` (apresentação de um `Fato`)
- Create: `src/components/site/EsqueletoFato.tsx`
- Create: `src/app/_heroi/CarregaPessoal.tsx`, `CarregaAplicacao.tsx`, `CarregaRelatorios.tsx` (componentes de servidor, um por fato)
- Modify: `src/app/page.tsx` (bloco do herói)

**Interfaces:**
- Consumes: `fatoDoPessoal` / `fatoDaAplicacao` / `fatoDosRelatorios` (Task 2).
- Produces: cada `Carrega*` recebe `{ codigoIbge: string; municipio: string; uf: string }` e devolve `<FatoDoMunicipio fato={...} />`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// tests/fatos-do-municipio.test.ts — cada fato falha sozinho
it("falha de rede num fato não derruba os outros", () => {
  // Carrega* captura a exceção e devolve o Fato com `ausencia` preenchida.
  expect(fatoDoPessoal({ ok: false, erro: "timeout" }, HOJE).ausencia).toBeTruthy();
});
```

- [ ] **Step 2: Rodar** · Run: `npx vitest run tests/fatos-do-municipio.test.ts`

- [ ] **Step 3: Implementar**

Cada `Carrega*` começa com `await connection()` e envolve a busca em
`try/catch`, devolvendo o `Fato` com `ausencia` em caso de exceção — mesmo
padrão de `src/app/raio-x/[uf]/[slug]/DadosDoTesouro.tsx`. Em `page.tsx`, os
três ficam em `<Suspense>` **separados**, com `EsqueletoFato` como fallback,
para que o mais lento não segure os outros dois.

- [ ] **Step 4: Verificar no servidor de produção**

```bash
NODE_OPTIONS="--max-old-space-size=1280 --max-semi-space-size=16" npx next build
npx next start -p 3150
curl -s -o /dev/null -w "%{http_code} %{time_starttransfer}\n" "http://localhost:3150/?m=2211001"
```
Esperado: `200` com `time_starttransfer` abaixo de 1 s, e o HTML já contendo a
headline antes dos três fatos.

- [ ] **Step 5: Commit**

```bash
git add src/components/site/FatoDoMunicipio.tsx src/components/site/EsqueletoFato.tsx src/app/_heroi src/app/page.tsx
git commit -m "Herói: os três fatos chegam em streaming, cada um por conta própria"
```

---

### Task 4: A seleção do município

**Files:**
- Create: `src/components/site/SeletorMunicipio.tsx` (`"use client"`)
- Modify: `src/app/page.tsx` (ler `searchParams.m`)
- Test: `tests/fatos-do-municipio.test.ts` (resolução do parâmetro)

**Interfaces:**
- Consumes: `municipioPorCodigo` de `@/lib/municipios`.
- Produces: `export function municipioDoParametro(m: string | undefined): Municipio | null`, em `src/lib/fatos-do-municipio.ts`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
it("código válido resolve o município", () => {
  expect(municipioDoParametro("2211001")?.uf).toBe("PI");
});

it("lixo não vira consulta ao Tesouro", () => {
  // Qualquer coisa que não seja um código conhecido devolve null, e a página
  // volta ao herói sem município — sem 500 e sem bater na API pública.
  for (const m of ["", "abc", "0", "99999999", "<script>", "2211001; DROP"]) {
    expect(municipioDoParametro(m)).toBeNull();
  }
});

it("parâmetro ausente é estado inicial, não erro", () => {
  expect(municipioDoParametro(undefined)).toBeNull();
});
```

- [ ] **Step 2: Rodar** · Esperado: FAIL — função não existe.

- [ ] **Step 3: Implementar**

`municipioDoParametro` valida contra `municipioPorCodigo` (lista local, sem
rede). O `SeletorMunicipio` é um `<form method="get">` com UF e município, que
navega para `/?m=<codigo>` — sem JavaScript obrigatório, porque a página
precisa funcionar antes de hidratar.

- [ ] **Step 4: Rodar a suíte** · Run: `npx vitest run`

- [ ] **Step 5: Commit**

```bash
git add src/components/site/SeletorMunicipio.tsx src/lib/fatos-do-municipio.ts src/app/page.tsx tests/fatos-do-municipio.test.ts
git commit -m "Seleção de município pela home, validada contra a lista local"
```

---

### Task 5: A série do RGF, para a projeção

**Files:**
- Modify: `src/lib/siconfi-rgf.ts` (nova função)
- Test: `tests/siconfi-rgf.test.ts`

**Interfaces:**
- Produces: `export async function buscarSerieRgf(codigoIbge: string, periodos?: number): Promise<ImportacaoRgf[]>` — do mais antigo para o mais novo, pulando período sem dado.

- [ ] **Step 1: Escrever o teste que falha**

```ts
it("devolve a série em ordem cronológica, pulando período vazio", async () => {
  const serie = await buscarSerieRgf("2211001", 6); // com fetch fingido
  expect(serie.map((s) => s.periodo.mesReferencia)).toEqual([...serie.map((s) => s.periodo.mesReferencia)].sort((a, b) => a - b));
});

it("não devolve período em branco", async () => {
  expect((await buscarSerieRgf("2211001", 6)).every((s) => s.despesaTotal > 0)).toBe(true);
});
```

- [ ] **Step 2: Rodar** · Esperado: FAIL.

- [ ] **Step 3: Implementar**

Reusar `periodosParaTentar` e `buscarPeriodo`, acumulando os que extraem com
sucesso em vez de parar no primeiro — é a diferença entre esta função e
`buscarRgfMaisRecente`.

- [ ] **Step 4: Rodar** · Run: `npx vitest run tests/siconfi-rgf.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/siconfi-rgf.ts tests/siconfi-rgf.test.ts
git commit -m "Série do RGF: vários períodos, para a trajetória ter base"
```

---

### Task 6: A trava — projeção e ações atrás do cadastro

**Files:**
- Create: `src/app/_heroi/projecao-actions.ts` (`"use server"`)
- Create: `src/components/site/PedirProjecao.tsx` (`"use client"`)
- Test: `tests/projecao-do-municipio.test.ts`
- Create: `src/lib/projecao-do-municipio.ts` (montagem pura)

**Interfaces:**
- Consumes: `buscarSerieRgf` (Task 5); `avaliarDespesaPessoal`, `avaliarReconducao`, `VEDACOES_PRUDENCIAL`, `SANCOES_PRAZO_ESGOTADO` de `@/lib/despesa-pessoal`; `antecipacaoDoPessoal` de `@/lib/antecipacao`; `registrarLeadRaioX` de `@/app/raio-x/lead-actions` como referência de contrato.
- Produces: `export function montarProjecao(serie: ImportacaoRgf[]): Projecao`, com `acoes: string[]` de tamanho variável; e `export async function solicitarProjecao(entrada: unknown): Promise<ResultadoLead>`.

- [ ] **Step 1: Escrever os testes que falham**

```ts
it("o número de ações é o que as regras produzem, nunca fixo", () => {
  const poucas = montarProjecao(serieConfortavel());
  const muitas = montarProjecao(serieAcimaDoTeto());
  expect(muitas.acoes.length).not.toBe(poucas.acoes.length);
});

it("série curta demais não vira projeção inventada", () => {
  // antecipacao.ts recusa abaixo de 4 leituras; a projeção respeita a recusa.
  expect(montarProjecao(serieComTresPeriodos()).travessia).toBeNull();
});

it("a tela não promete envio enquanto o remetente for o gratuito", async () => {
  const r = await solicitarProjecao(entradaValida);
  expect(r.ok && r.enviadoParaVoce).toBe(false);
});
```

- [ ] **Step 2: Rodar** · Esperado: FAIL.

- [ ] **Step 3: Implementar**

`montarProjecao` é pura. `solicitarProjecao` grava o lead e avisa a equipe pelo
mesmo caminho de `registrarLeadRaioX`, devolvendo `enviadoParaVoce` para a tela
dizer "recebido — chega em até um dia útil" enquanto o remetente gratuito da
Resend recusar destinatário que não seja o dono da conta. **A tela não escreve
"enviado" quando `enviadoParaVoce` é `false`.**

- [ ] **Step 4: Rodar a suíte** · Run: `npx vitest run`

- [ ] **Step 5: Commit**

```bash
git add src/lib/projecao-do-municipio.ts src/app/_heroi/projecao-actions.ts src/components/site/PedirProjecao.tsx tests/projecao-do-municipio.test.ts
git commit -m "A projeção do exercício atrás do cadastro, e a tela sem promessa de envio"
```

---

### Task 7: A voz — regras travadas e texto reescrito

**Files:**
- Modify: `tests/promessas-da-home.test.ts` (o arquivo já existe e já varre o código da home)
- Modify: `src/app/page.tsx` e os componentes de `src/components/site/` que a home usa

**Interfaces:**
- Consumes: nada novo.

- [ ] **Step 1: Escrever os testes que falham**

```ts
describe("a home não soa como texto de máquina", () => {
  it("no máximo três travessões retóricos na página inteira", () => {
    expect(contarTravessoes(textoDaHome())).toBeLessThanOrEqual(3);
  });

  it("não usa a construção 'Não é X. É Y.'", () => {
    expect(textoDaHome()).not.toMatch(/Não é [^.]{3,60}\.\s*É /);
  });

  it("não usa palavra de marketing", () => {
    for (const p of ["completo", "poderoso", "revolucionário", "tudo em um"]) {
      expect(textoDaHome().toLowerCase()).not.toContain(p);
    }
  });

  it("não diz tempo real", () => {
    expect(textoDaHome()).not.toMatch(/tempo real/i);
  });

  it("o limite do produto está declarado na própria tela", () => {
    // Spec §4.5. Confiança sem carteira de clientes se constrói admitindo
    // limite; a nota fica visível, não em rodapé.
    expect(textoDaHome()).toMatch(/não substitui o parecer da contabilidade interna/i);
    expect(textoDaHome()).toMatch(/assessoria jurídica/i);
  });
});
```

`textoDaHome()` reusa o leitor de código-fonte que o arquivo já tem para as
promessas, sem comentários.

- [ ] **Step 2: Rodar e ver QUANTAS violações existem hoje**

Run: `npx vitest run tests/promessas-da-home.test.ts`
Esperado: FAIL, com a contagem atual de travessões. É a medida do trabalho.

- [ ] **Step 3: Reescrever o texto até os testes passarem**

Regras de julgamento que os testes não cobrem e que valem na reescrita: uma
afirmação por seção; pelo menos um limite declarado por tela de argumento;
silêncio entre blocos. A ordem das 11 seções **não muda**; "Quatro números,
quatro links" vira uma linha perto do rodapé.

- [ ] **Step 4: Rodar a suíte inteira e o build**

```bash
npx vitest run
NODE_OPTIONS="--max-old-space-size=1280 --max-semi-space-size=16" npx next build
```

- [ ] **Step 5: Commit**

```bash
git add tests/promessas-da-home.test.ts src/app/page.tsx src/components/site
git commit -m "A voz da home: regras travadas por teste, e o texto reescrito para passar"
```

---

## Verificação final

1. `npx vitest run` e `next build` limpos.
2. `curl "/?m=<ibge de município real>"` mostra os três fatos com fonte, período e base legal; nenhum número sem carimbo.
3. Um município sem RGF publicado mostra o achado, não um erro.
4. `/?m=lixo` responde 200 com o herói inicial.
5. TTFB da home com `?m=` abaixo de 1 s.
