// Diagnóstico: (1) login direto no Florida; (2) admin troca p/ Florida pelo seletor.
import { chromium } from "playwright-core";

const EXEC = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const BASE = process.env.BASE ?? "https://parque-california.vercel.app";

const browser = await chromium.launch({ executablePath: EXEC, args: ["--no-sandbox"] });

const SENHA = process.env.SENHA ?? "admin123";

async function novo(email, senha, arq, trocar = false) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", (m) => {
    if (m.type() === "error") console.log(`  [console:${arq}]`, m.text().slice(0, 200));
  });
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1000);
  // seleciona Florida no seletor de login se pedido
  if (email.includes("florida")) {
    const card = page.locator("div", { hasText: "Parque Florida" }).locator("button, [role=button]").first();
    try { await card.click({ timeout: 3000 }); } catch { try { await page.click("text=Parque Florida", { timeout: 3000 }); } catch {} }
    await page.waitForTimeout(800);
  }
  await page.fill('input[type="email"], input[placeholder*="email" i]', email);
  await page.fill('input[type="password"]', senha);
  await page.click('button:has-text("Entrar")');
  await page.waitForTimeout(3500);
  if (trocar) {
    try {
      await page.click('button:has-text("Parque California")', { timeout: 4000 });
      await page.click('text=Parque Florida', { timeout: 4000 });
      await page.waitForTimeout(2500);
    } catch (e) { console.log(`  troca falhou em ${arq}: ${e.message.split("\n")[0]}`); }
  }
  await page.screenshot({ path: arq });
  console.log("screenshot:", arq, "| url:", page.url());
  await page.close();
}

await novo("sindico@parqueflorida.com.br", "admin123", "/tmp/render/shell-florida.png");
await novo("admin@meucondominio.com", "admin123", "/tmp/render/shell-troca.png", true);
await browser.close();
