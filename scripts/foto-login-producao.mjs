// Screenshots da tela de login em produção — desktop e mobile.
import { chromium } from "playwright-core";

const BASE = process.env.BASE || "https://parque-california.vercel.app";
const CHROME = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const OUT = "/tmp/render";
import { mkdirSync } from "fs";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });

// Desktop
const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await d.goto(BASE, { waitUntil: "networkidle" });
await d.waitForTimeout(1200);
await d.screenshot({ path: `${OUT}/login-desktop-etapa1.png` });

// Mobile
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await m.goto(BASE, { waitUntil: "networkidle" });
await m.waitForTimeout(1200);
await m.screenshot({ path: `${OUT}/login-mobile-etapa1.png` });
await m.screenshot({ path: `${OUT}/login-mobile-etapa1-full.png`, fullPage: true });

// Etapa 2 (mobile): escolhe Morador
await m.click('button:has-text("Morador")');
await m.waitForTimeout(800);
await m.screenshot({ path: `${OUT}/login-mobile-etapa2.png`, fullPage: true });

await browser.close();
console.log("ok");
