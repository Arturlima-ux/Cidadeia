import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    // Os testes de tela (Playwright) moram em e2e/ e rodam com "npm run e2e".
    exclude: ["e2e/**", "node_modules/**"],
    // ── DOIS PROCESSOS, NÃO UM POR NÚCLEO ──
    //
    // Com o padrão, a suíte derruba workers por falta de memória nesta
    // máquina: aparecem "Worker exited unexpectedly" e a corrida termina com
    // zero testes FALHANDO e oito arquivos que simplesmente não rodaram. É o
    // pior tipo de falha — parece verde no resumo de quem só lê "0 failed", e
    // some na rodada seguinte.
    //
    // Dois processos custam cerca de trinta segundos a mais e fazem a suíte
    // inteira rodar de verdade.
    maxWorkers: 2,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
