import { defineConfig, devices } from "@playwright/test";

// ── TESTES DE TELA ──
//
// Abrem o navegador de verdade contra o site publicado (ou contra
// E2E_BASE) e percorrem os fluxos que já quebraram sem ninguém ver: topo,
// proposta, cadastro pré-preenchido, Raio-X, demo, portal, celular,
// acessibilidade. Só leitura — nenhum teste grava no banco.
//
// Rodar: npm run e2e (depois de cada publicação).

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 1,
  workers: 2,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE ?? "https://cidadeia.vercel.app",
    locale: "pt-BR",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Pixel 5 usa o Chromium já instalado; iPhone exigiria o WebKit.
    { name: "celular", use: { ...devices["Pixel 5"] } },
  ],
});
