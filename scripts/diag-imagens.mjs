// Verifica o estado real de cada <img> na página de login.
import { chromium } from "playwright-core";

const EXEC = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const BASE = process.env.BASE ?? "https://parque-california.vercel.app";

const browser = await chromium.launch({ executablePath: EXEC, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const falhas = [];
page.on("requestfailed", (r) => falhas.push(`FALHA ${r.url()} :: ${r.failure()?.errorText}`));
page.on("response", (r) => { if (r.status() >= 400) falhas.push(`HTTP ${r.status()} ${r.url()}`); });

await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(2500);

const imgs = await page.evaluate(() =>
  [...document.querySelectorAll("img")].map((i) => ({
    src: i.getAttribute("src"),
    carregada: i.complete && i.naturalWidth > 0,
    natural: `${i.naturalWidth}x${i.naturalHeight}`,
  })),
);
console.log("IMAGENS:");
for (const i of imgs) console.log(`  ${i.carregada ? "✓" : "✗ QUEBRADA"} ${i.src} (${i.natural})`);
console.log(falhas.length ? "REDE:\n  " + falhas.join("\n  ") : "sem falhas de rede");
await browser.close();
