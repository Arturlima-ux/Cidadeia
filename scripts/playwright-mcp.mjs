// Sobe o Playwright MCP (https://github.com/microsoft/playwright-mcp) para o
// Claude abrir o site num navegador de verdade: navegar, clicar, preencher,
// tirar print e conferir o que construiu. Registrado em .mcp.json.
//
// No ambiente de nuvem do Claude o Chromium já vem instalado em
// /opt/pw-browsers e não pode ser baixado; aqui ele é apontado direto. Em
// outra máquina, o Playwright MCP usa o navegador dele.
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const CHROMIUM_DA_NUVEM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const args = ["-y", "@playwright/mcp@0.0.83", "--headless", "--isolated", "--viewport-size", "1366x900", "--output-dir", ".playwright-mcp"];
// Lá o processo roda como root, e o Chromium só abre como root sem sandbox.
if (existsSync(CHROMIUM_DA_NUVEM)) args.push("--executable-path", CHROMIUM_DA_NUVEM, "--no-sandbox");

const filho = spawn(process.platform === "win32" ? "npx.cmd" : "npx", args, { stdio: "inherit", shell: process.platform === "win32" });
filho.on("exit", (codigo) => process.exit(codigo ?? 0));
