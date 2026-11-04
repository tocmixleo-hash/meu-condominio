// Verificação visual do fluxo novo: pergunta de tipo no login + tutorial guiado.
// Uso: bun scripts/screenshot-tutorial.mjs [base] 
import { chromium } from "playwright-core";

const EXEC = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const BASE = process.argv[2] ?? "http://localhost:3000";
const DIR = "/tmp/render";

const browser = await chromium.launch({ executablePath: EXEC, args: ["--no-sandbox"] });

async function novoContexto(altura = 900, largura = 1440) {
  const contexto = await browser.newContext({ viewport: { width: largura, height: altura } });
  const page = await contexto.newPage();
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1000);
  return { contexto, page };
}

// ── 1. Etapa 1: pergunta o tipo de usuário ──────────────────────
{
  const { contexto, page } = await novoContexto();
  await page.waitForSelector("text=Que tipo de usuário é você?", { timeout: 15000 });
  await page.screenshot({ path: `${DIR}/tour-1-tipo.png` });
  console.log("1 OK: pergunta de tipo");

  // ── 2. Etapa 2: escolhe Morador → formulário ──────────────────
  await page.click('button:has-text("Morador")');
  await page.waitForSelector('button:has-text("Entrar")');
  await page.screenshot({ path: `${DIR}/tour-2-form-morador.png` });
  console.log("2 OK: formulário com tipo Morador");

  // ── 3. Tipo errado: credenciais de síndico com Morador marcado ─
  await page.fill('input[type="email"]', "sindico@parquecalifornia.com.br");
  await page.fill('input[type="password"]', "admin123");
  await page.click('button:has-text("Entrar")');
  await page.waitForSelector("text=Ajustamos a seleção", { timeout: 15000 });
  await page.screenshot({ path: `${DIR}/tour-3-tipo-ajustado.png` });
  console.log("3 OK: aviso de tipo ajustado (Síndico)");

  // ── 4. Entra pelo acesso rápido do síndico → tutorial abre ────
  await page.click('button:has-text("Carlos — Síndico")');
  await page.waitForSelector("text=Bem-vindo(a), Carlos!", { timeout: 20000 });
  await page.screenshot({ path: `${DIR}/tour-4-boas-vindas.png` });
  console.log("4 OK: tutorial abriu no primeiro acesso");

  // ── 5. Holofote nas ações rápidas ─────────────────────────────
  await page.click('button:has-text("Próximo")');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${DIR}/tour-5-holofote.png` });
  console.log("5 OK: holofote nas ações rápidas");

  // ── 6. Passos seguintes até o menu e conclui ──────────────────
  await page.click('button:has-text("Próximo")');
  await page.waitForTimeout(700);
  await page.click('button:has-text("Próximo")');
  await page.waitForTimeout(700);
  await page.click('button:has-text("Próximo")');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${DIR}/tour-6-menu.png` });
  console.log("6 OK: holofote no menu lateral");
  await page.click('button:has-text("Próximo")'); // → último passo ("Sua conta")
  await page.waitForTimeout(700);
  await page.click('button:has-text("Concluir")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${DIR}/tour-7-fim.png` });
  console.log("7 OK: tutorial concluído, portal livre");

  await contexto.close();
}

// ── 8. Celular: pergunta de tipo + tutorial com fallback do menu ─
{
  const { contexto, page } = await novoContexto(844, 390);
  await page.waitForSelector("text=Que tipo de usuário é você?", { timeout: 15000 });
  await page.screenshot({ path: `${DIR}/tour-8-celular-tipo.png` });
  await page.click('button:has-text("Morador")');
  await page.waitForSelector('button:has-text("Entrar")');
  await page.click('button:has-text("Maria — Morador")');
  await page.waitForSelector("text=Bem-vindo(a), Maria!", { timeout: 20000 });
  await page.click('button:has-text("Próximo")');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${DIR}/tour-9-celular-holofote.png` });
  console.log("8 OK: celular — tipo + holofote");
  await contexto.close();
}

await browser.close();
console.log("Screenshots salvos em", DIR);
