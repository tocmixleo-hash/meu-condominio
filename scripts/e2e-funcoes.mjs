// Verificação E2E no site ao vivo: login sem botão admin + tela Funções.
import { chromium } from "playwright-core";

const EXEC = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const BASE = process.env.BASE ?? "https://parque-california.vercel.app";
let aprovados = 0, falhados = 0;
function verificar(nome, cond) {
  if (cond) { aprovados++; console.log(`  ✓ ${nome}`); }
  else { falhados++; console.error(`  ✗ ${nome}`); }
}

const browser = await chromium.launch({ executablePath: EXEC, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 1. Login: botão do administrador não pode existir
await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(2000);
const btnAdmin = await page.locator("text=Administrador da Plataforma").count();
verificar("botão 'Administrador da Plataforma' removido do login", btnAdmin === 0);
await page.screenshot({ path: "/tmp/render/e2e-login-sem-admin.png" });

// 2. Login digitado (como o dono fará)
await page.fill('input[type="email"]', "admin@meucondominio.com");
await page.fill('input[type="password"]', "admin123");
await page.click('button:has-text("Entrar")');
await page.waitForTimeout(3500);
const shell = await page.locator("aside").count();
verificar("login do administrador entra no painel", shell > 0);

// 3. Menu Funções existe e a tela renderiza
const itemFuncoes = await page.locator("aside button:has-text('Funções')").count();
verificar("menu 'Funções' presente para o administrador", itemFuncoes > 0);
await page.locator("aside button:has-text('Funções')").first().click();
await page.waitForTimeout(2000);
await page.screenshot({ path: "/tmp/render/e2e-funcoes-vazia.png" });

// 4. Criar função pelo diálogo
await page.click('button:has-text("Nova função")');
await page.waitForTimeout(800);
await page.fill('input[placeholder*="Nome da função"]', "Zeladoria");
await page.fill('input[placeholder*="Descrição"]', "Equipe de zeladoria do condomínio");
await page.locator('label:has-text("Encomendas") input').check();
await page.locator('label:has-text("Autorizações") input').check();
await page.screenshot({ path: "/tmp/render/e2e-funcoes-dialogo.png" });
await page.click('button:has-text("Salvar")');
await page.waitForTimeout(2000);
const criada = await page.locator("text=Zeladoria").count();
verificar("função 'Zeladoria' criada e listada", criada > 0);
await page.screenshot({ path: "/tmp/render/e2e-funcoes-criada.png" });

// 5. Moradores: seção de equipe + cadastro com função
await page.locator("aside button:has-text('Moradores')").first().click();
await page.waitForTimeout(2000);
const secaoEquipe = await page.locator("text=Equipe com função personalizada").count();
verificar("tela Moradores mostra seção de equipe", secaoEquipe > 0);
await page.click('button:has-text("Cadastrar pessoa")');
await page.waitForTimeout(800);
const opcaoEquipe = await page.locator('select[aria-label="Tipo de cadastro"] option:has-text("Zeladoria")').count();
verificar("função aparece no cadastro de equipe", opcaoEquipe > 0);
await page.screenshot({ path: "/tmp/render/e2e-moradores-equipe.png" });
await page.click('button:has-text("Cancelar")');

console.log(`\nE2E: ${aprovados} aprovados, ${falhados} falhados`);
await browser.close();
process.exit(falhados === 0 ? 0 : 1);
