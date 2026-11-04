// Screenshot do shell autenticado (modo demonstração) — diagnóstico visual.
import { chromium } from "playwright-core";

const EXEC = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const BASE = process.env.BASE ?? "https://parque-california.vercel.app";
const EMAIL = process.argv[2] ?? "admin@meucondominio.com";
const SENHA = process.argv[3] ?? "admin123";
const ARQ = process.argv[4] ?? "/tmp/render/shell.png";

const browser = await chromium.launch({ executablePath: EXEC, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(1200);

// Seletor de condomínio: garante California selecionado (default já vem).
await page.fill('input[type="email"], input[placeholder*="email" i]', EMAIL);
await page.fill('input[type="password"]', SENHA);
await page.click('button:has-text("Entrar")');
await page.waitForTimeout(3500);

await page.screenshot({ path: ARQ });
console.log("screenshot salvo:", ARQ, "| url:", page.url());
await browser.close();
