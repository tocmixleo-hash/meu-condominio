// Screenshot da tela de LOGIN de produção — confirma ausência do botão Administrador.
import { chromium } from "playwright-core";

const EXEC = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const browser = await chromium.launch({ executablePath: EXEC, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://parque-california.vercel.app", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: "/tmp/render/login-producao.png" });

// Checagem textual: nenhum atalho "Administrador" nem acessos rápidos na produção.
const texto = await page.evaluate(() => document.body.innerText);
console.log('Contém "Administrador" no login?', texto.includes("Administrador"));
console.log('Contém "Acesso rápido"?', texto.includes("Acesso rápido"));
console.log('Contém "Entrar na plataforma"?', texto.includes("Entrar na plataforma"));
console.log('Contém seletor de condomínio ("Selecionar")?', texto.includes("Selecionar"));
await browser.close();
