import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
for (const [nome, url, espera] of [["inicio", "/?para=morador", 3000], ["boa-esperanca", "/?para=morador&m=3201001", 30000], ["teresina", "/?para=morador&m=2211001", 30000]]) {
  const p = await ctx.newPage();
  await p.goto("https://cidadeia.vercel.app" + url, { waitUntil: "load", timeout: 90000 });
  await p.waitForTimeout(espera);
  await p.screenshot({ path: `capturas/${nome}.png`, fullPage: true });
  await p.close();
}
await b.close();
