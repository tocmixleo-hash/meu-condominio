// Screenshot da tela de login LOCAL — seletor com os dois parques + acessos rápidos.
import { chromium } from "playwright-core";

const EXEC = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const BASE = process.env.BASE ?? "http://localhost:3000";
const ARQ = process.argv[2] ?? "/tmp/render/login-novo.png";

const browser = await chromium.launch({ executablePath: EXEC, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: ARQ });

const texto = await page.evaluate(() => document.body.innerText);
console.log('Seletor mostra "Parque California"?', texto.includes("Parque California"));
console.log('Seletor mostra "Parque Florida"?', texto.includes("Parque Florida"));
console.log('Contém "Acesso rápido"?', texto.includes("Acesso rápido"));
console.log('Contém botão "Administrador"?', texto.includes("Administrador"));

// Seleciona Florida e confere troca de identidade + acessos rápidos dela
await page.click('button:has-text("Parque Florida")');
await page.waitForTimeout(800);
const textoFl = await page.evaluate(() => document.body.innerText);
console.log("Após clicar Florida — Helena visível?", textoFl.includes("Helena — Morador (A-101)"));
await page.screenshot({ path: ARQ.replace(".png", "-florida.png") });
console.log("screenshots:", ARQ, "|", ARQ.replace(".png", "-florida.png"));
await browser.close();
