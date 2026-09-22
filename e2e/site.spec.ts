import { test, expect } from "@playwright/test";

test.describe("site público", () => {
  test("home: topo com uma ação, navegação para Soluções", async ({ page, isMobile }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/CidadeIA/);
    await expect(page.locator("h1").first()).toBeVisible();
    // uma ação cheia no cabeçalho, e o painel nunca aparece para visitante
    const cabecalho = page.locator("header").first();
    await expect(cabecalho.getByRole("link", { name: /Receber proposta/ })).toBeVisible();
    await expect(cabecalho.getByRole("link", { name: /Ir para o painel/ })).toHaveCount(0);
    if (isMobile) {
      await page.getByRole("button", { name: /Abrir menu/ }).click();
      await page.getByRole("link", { name: "Soluções" }).first().click();
    } else {
      await cabecalho.getByRole("link", { name: "Soluções" }).click();
    }
    await expect(page).toHaveURL(/\/solucoes$/);
    await expect(page.locator("h1")).toHaveText(/Soluções/);
  });

  test("/precos redireciona para /solucoes", async ({ page }) => {
    await page.goto("/precos");
    await expect(page).toHaveURL(/\/solucoes$/);
  });

  test("Raio-X: estado lista municípios e a página do município abre com captura de lead", async ({ page }) => {
    await page.goto("/raio-x/pi");
    await expect(page.locator("h1")).toContainText("prefeituras do Piauí");
    // a lista completa vem sob demanda: buscar um município pequeno carrega a API
    await page.locator("#busca-municipio").fill("barro duro");
    await expect(page.getByRole("link", { name: "Barro Duro" })).toBeVisible();
    await page.locator("#busca-municipio").fill("");
    await page.getByRole("link", { name: "Teresina" }).first().click();
    await expect(page).toHaveURL(/\/raio-x\/pi\/teresina$/);
    await expect(page.locator("h1")).toContainText("Teresina");
    await expect(page.getByRole("heading", { name: /Receba este Raio-X por e-mail/ })).toBeVisible();
  });

  test("proposta: município pelo IBGE, sem preço na tela, validação sem gravar", async ({ page }) => {
    await page.goto("/proposta?ibge=2211001");
    await expect(page.getByText(/Teresina/).first()).toBeVisible();
    // nenhum valor em reais em página pública
    await expect(page.locator("main")).not.toContainText(/R\$\s?\d/);
    // e-mail inválido é barrado no navegador (required/type=email): nada vai ao servidor
    await page.locator("#nome").fill("Teste E2E");
    await page.locator("#email").fill("invalido");
    await page.locator("form button[type=submit]").first().click({ trial: false, noWaitAfter: true });
    const valido = await page.locator("#email").evaluate((el) => (el as HTMLInputElement).checkValidity());
    expect(valido).toBe(false);
  });

  test("cadastro: título, h1 e caminho normal sem pedido", async ({ page }) => {
    await page.goto("/cadastro?proposta=prop_nao_existe_000");
    await expect(page).toHaveTitle(/Criar a conta da prefeitura/);
    await expect(page.locator("h1")).toContainText("Criar a conta da prefeitura");
    await expect(page.getByText(/Leva menos de um minuto/)).toBeVisible();
  });

  test("acompanhar pedido: protocolo errado não vaza nada", async ({ page }) => {
    await page.goto("/proposta/acompanhar?protocolo=ZZZZZZZZ");
    await expect(page.locator("#protocolo")).toHaveValue("ZZZZZZZZ");
    await page.locator("#email").fill("ninguem@exemplo.com");
    await page.getByRole("button", { name: /Ver o andamento/ }).click();
    await expect(page.getByText(/Não encontramos pedido/)).toBeVisible();
  });

  test("acessibilidade: Tab revela 'Pular para o conteúdo' e leva ao main", async ({ page, isMobile }) => {
    test.skip(isMobile, "navegação por teclado é do desktop");
    await page.goto("/acessibilidade");
    await page.keyboard.press("Tab");
    const pular = page.getByRole("link", { name: "Pular para o conteúdo" });
    await expect(pular).toBeFocused();
    await pular.press("Enter");
    await expect(page).toHaveURL(/#conteudo$/);
    await expect(page.locator("main#conteudo")).toBeVisible();
  });

  test("portais: índice abre e portal inexistente dá 404", async ({ page }) => {
    await page.goto("/transparencia");
    await expect(page.locator("h1")).toBeVisible();
    const r = await page.goto("/transparencia/municipio-que-nao-existe-xx");
    expect(r?.status()).toBe(404);
  });
});
