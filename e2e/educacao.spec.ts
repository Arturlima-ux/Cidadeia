import { test, expect } from "@playwright/test";

// ── AS OITO TELAS NOVAS ──
//
// As 778 provas unitárias cobrem as REGRAS — a conta dos 200 dias, a dos
// 30%, a frequência, o texto do ofício. Nenhuma delas abre uma página.
// Um botão quebrado, um import errado ou uma coluna que o banco não tem
// passaria verde na suíte e só apareceria quando alguém clicasse.
//
// Estes testes rodam contra a demo publicada, que tem dado de propósito
// em cada regra: escola abaixo dos 200 dias, leite zerado, aluno há 28
// dias fora sem Conselho Tutelar, IDEB abaixo da meta. Só leitura.

const TELAS = [
  { caminho: "/dashboard/secretarias/educacao", titulo: /Secretaria da Educação/ },
  { caminho: "/dashboard/secretarias/educacao/merenda", titulo: /agricultura familiar/ },
  { caminho: "/dashboard/secretarias/educacao/reposicao", titulo: /Pedido da merenda/ },
  { caminho: "/dashboard/secretarias/educacao/busca-ativa", titulo: /Busca ativa escolar/ },
  { caminho: "/dashboard/secretarias/educacao/resultado", titulo: /Dinheiro e resultado/ },
];

test.describe("módulo Educação", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("as cinco telas da secretaria abrem e mostram o próprio título", async ({ page }) => {
    for (const { caminho, titulo } of TELAS) {
      await page.goto(caminho);
      await expect(page.getByRole("heading", { name: titulo }).first(), `${caminho} não abriu`).toBeVisible();
    }
  });

  test("a ficha da escola abre pela lista e traz a leitura automática", async ({ page }) => {
    await page.goto("/dashboard/secretarias/educacao");
    // A lista é ordenada pela leitura: a primeira ficha é a que mais precisa.
    await page.getByRole("link", { name: /ficha →/ }).first().click();
    await expect(page).toHaveURL(/\/educacao\/escolas\//);
    await expect(page.getByText("Leitura automática")).toBeVisible();
    // As quatro fases têm de aparecer na mesma ficha.
    await expect(page.getByRole("heading", { name: /Busca ativa/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Merenda na cozinha/ })).toBeVisible();
    await expect(page.getByText(/dia\(s\) de aula perdidos este ano/)).toBeVisible();
  });

  test("o ofício ao Conselho Tutelar sai montado, com a base legal", async ({ page }) => {
    await page.goto("/dashboard/secretarias/educacao/busca-ativa");
    await page.getByRole("link", { name: /gerar o ofício/ }).first().click();
    await expect(page).toHaveURL(/\/busca-ativa\/.+\/oficio$/);
    const folha = page.locator("pre");
    await expect(folha).toContainText("art. 56, inciso II, da Lei nº 8.069/1990");
    await expect(folha).toContainText("Ao Conselho Tutelar");
    // O ofício só lista etapa com data registrada: a comunicação ao
    // Conselho ainda não foi feita neste caso, então não pode constar.
    await expect(folha).not.toContainText("Comunicação ao Conselho Tutelar, em");
  });

  test("os 30% da agricultura familiar aparecem com percentual e projeção", async ({ page }) => {
    await page.goto("/dashboard/secretarias/educacao/merenda");
    // O intro da página também cita "30% do repasse do PNAE": o número
    // grande é o último, e é ele que a tela existe para mostrar.
    await expect(page.getByText(/% do repasse do PNAE/).last()).toBeVisible();
    await expect(page.getByText(/No ritmo de compra deste ano/)).toBeVisible();
  });

  test("o pedido da merenda oferece o CSV e marca o que cabe na agricultura familiar", async ({ page }) => {
    await page.goto("/dashboard/secretarias/educacao/reposicao");
    await expect(page.getByRole("link", { name: /Baixar CSV/ })).toBeVisible();
    await expect(page.getByText(/cabem na agricultura familiar/).first()).toBeVisible();
  });

  test("dinheiro e resultado converte a matrícula em reais e liga a nota ao dia a dia", async ({ page }) => {
    await page.goto("/dashboard/secretarias/educacao/resultado");
    await expect(page.getByText("Matrícula que vira repasse")).toBeVisible();
    await expect(page.getByText(/conta do FUNDEB/).first()).toBeVisible();
    // O cruzamento é o que nenhum painel de IDEB faz.
    await expect(page.getByText(/nada disso é pedagógico/).first()).toBeVisible();
  });

  test("nenhuma das telas novas rola de lado no celular", async ({ page, isMobile }) => {
    test.skip(!isMobile, "só no celular");
    for (const { caminho } of TELAS) {
      await page.goto(caminho);
      const { w, sw } = await page.evaluate(() => ({
        w: document.documentElement.clientWidth,
        sw: document.documentElement.scrollWidth,
      }));
      expect(sw, `${caminho} rola de lado`).toBeLessThanOrEqual(w + 2);
    }
  });
});

test.describe("o Raio-X leva às soluções", () => {
  test("a página do município fecha com os módulos e o botão de Soluções", async ({ page }) => {
    await page.goto("/raio-x/pi/jerumenha");
    await expect(page.getByRole("heading", { name: /Do diagnóstico para a mesa/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ver as soluções por dentro/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Montar proposta para/ })).toBeVisible();
  });

  test("o menu abre pelo Raio-X, e Soluções não disputa o topo", async ({ page, isMobile }) => {
    test.skip(isMobile, "o menu do celular é outro componente");
    await page.goto("/");
    const menu = page.locator("header nav").first();
    await expect(menu.getByRole("link", { name: /Ver Raio-X do meu município/ })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Soluções" })).toHaveCount(0);
  });
});
