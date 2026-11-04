// Diagnóstico: o tutorial aparece no primeiro acesso para cada perfil em produção?
// Contextos limpos (cookies zerados), sem concluir o tour — nenhuma flag é gravada.
// Uso: bun scripts/diagnosticar-tour-perfis.mjs [base]
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "https://parque-california.vercel.app";
const EXEC = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const browser = await chromium.launch({ executablePath: EXEC, args: ["--no-sandbox"] });

async function testa(rotulo, passosLogin) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await passosLogin(page);
  // aguarda o dashboard carregar e o efeito do tour disparar
  const abriu = await page
    .waitForSelector('[role="dialog"][aria-label="Tutorial do portal"]', { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  const titulo = abriu ? await page.locator('[role="dialog"] h3').textContent() : "—";
  console.log(`${rotulo}: tour ${abriu ? "ABRIU" : "não abriu"}${abriu ? ` ("${titulo?.trim()}")` : ""}`);
  await page.screenshot({ path: `/tmp/render/diag-${rotulo.replace(/[^\w-]/g, "")}.png` });
  await ctx.close(); // fecha sem concluir → nenhuma flag é alterada
}

const selecionarTipo = (t) => async (page) => {
  await page.waitForSelector("text=Que tipo de usuário é você?", { timeout: 20000 });
  await page.click(`button:has-text("${t}")`);
};

// 1. Morador — acesso rápido (Maria)
await testa("morador-rapido", async (page) => {
  await selecionarTipo("Morador")(page);
  await page.click('button:has-text("Maria — Morador")');
  await page.waitForSelector("text=Boa noite, Maria", { timeout: 30000 }).catch(() => {});
});

// 2. Síndico — acesso rápido (Carlos)
await testa("sindico-rapido", async (page) => {
  await selecionarTipo("Síndico ou administração")(page);
  await page.click('button:has-text("Carlos — Síndico")');
  await page.waitForSelector("text=Boa noite, Carlos", { timeout: 30000 }).catch(() => {});
});

// 3. Portaria — acesso rápido (Jorge)
await testa("portaria-rapido", async (page) => {
  await selecionarTipo("Portaria")(page);
  await page.click('button:has-text("Jorge — Portaria")');
  await page.waitForSelector("text=Boa noite, Jorge", { timeout: 30000 }).catch(() => {});
});

// 4. Morador — login manual pelo formulário (maria@email.com)
await testa("morador-manual", async (page) => {
  await selecionarTipo("Morador")(page);
  await page.fill('input[type="email"]', "maria@email.com");
  await page.fill('input[type="password"]', "123456");
  await page.click('button:has-text("Entrar")');
  await page.waitForSelector("text=Boa noite, Maria", { timeout: 30000 }).catch(() => {});
});

// 5. Admin da plataforma — manual (admin@meucondominio.com)
await testa("admin-manual", async (page) => {
  await selecionarTipo("Administrador da plataforma")(page);
  await page.fill('input[type="email"]', "admin@meucondominio.com");
  await page.fill('input[type="password"]', "admin123");
  await page.click('button:has-text("Entrar")');
  await page.waitForSelector("text=Administrador", { timeout: 30000 }).catch(() => {});
});

await browser.close();
console.log("diagnóstico concluído (nenhuma flag alterada)");
