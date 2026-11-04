// Screenshots em larguras de viewport de preview de chat (estreitas).
import { chromium } from "playwright-core";

const EXEC = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const BASE = process.env.BASE ?? "https://parque-california.vercel.app";

const browser = await chromium.launch({ executablePath: EXEC, args: ["--no-sandbox"] });

async function capturar({ largura, altura, arq, logar = false }) {
  const ctx = await browser.newContext({ viewport: { width: largura, height: altura } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1500);
  if (logar) {
    await page.fill('input[type="email"], input[placeholder*="email" i]', "admin@meucondominio.com");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button:has-text("Entrar")');
    await page.waitForTimeout(3000);
  }
  await page.screenshot({ path: arq });
  console.log("ok:", arq, `(${largura}x${altura}${logar ? ", logado" : ""})`);
  await ctx.close();
}

await capturar({ largura: 800, altura: 900, arq: "/tmp/render/preview-800-login.png" });
await capturar({ largura: 800, altura: 900, arq: "/tmp/render/preview-800-shell.png", logar: true });
await capturar({ largura: 390, altura: 844, arq: "/tmp/render/mobile-390-login.png" });
await capturar({ largura: 390, altura: 844, arq: "/tmp/render/mobile-390-shell.png", logar: true });
await browser.close();
