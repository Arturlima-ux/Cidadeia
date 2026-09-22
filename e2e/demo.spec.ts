import { test, expect } from "@playwright/test";

// A demo é o fluxo que mais enganou: sessão de sete dias, "Ir para o
// painel" caindo em Vila Nova, 404 na mesa. Tudo isso fica travado aqui.
test.describe("demonstração", () => {
  test("entra, mostra a faixa, sai para /demo/fim e o topo volta a ser de visitante", async ({ page }) => {
    await page.goto("/demo");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("DEMONSTRAÇÃO").first()).toBeVisible();
    await expect(page.getByText(/Vila Nova/).first()).toBeVisible();

    // com a demo aberta, o site público NÃO trata como cliente
    await page.goto("/");
    const cabecalho = page.locator("header").first();
    await expect(cabecalho.getByRole("link", { name: /Receber proposta/ })).toBeVisible();
    await expect(cabecalho.getByRole("link", { name: /Ir para o painel/ })).toHaveCount(0);

    // a mesa da equipe não existe para a demo: manda ao login
    await page.goto("/admin/pedidos");
    await expect(page).toHaveURL(/\/login/);

    // sair leva à página de fim, com os dois caminhos
    await page.goto("/sessao-encerrada?demo=1");
    await expect(page).toHaveURL(/\/demo\/fim$/);
    await expect(page.getByRole("link", { name: /Montar proposta/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Abrir o Raio-X/ })).toBeVisible();
  });

  test("na demo, nenhuma tela do painel rola de lado no celular", async ({ page, isMobile }) => {
    test.skip(!isMobile, "só no celular");
    await page.goto("/demo");
    for (const tela of ["/dashboard", "/dashboard/alertas", "/dashboard/secretarias/obras", "/dashboard/atendimento", "/dashboard/auditoria"]) {
      await page.goto(tela);
      const { w, sw } = await page.evaluate(() => ({ w: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth }));
      expect(sw, `${tela} rola de lado`).toBeLessThanOrEqual(w + 2);
    }
  });
});
