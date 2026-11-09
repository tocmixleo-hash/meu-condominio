// Screenshot do módulo Identidade visual (admin) — desktop e mobile —
// foco na nova seção "Fotos dos espaços comuns".
import { chromium } from "playwright-core";

const EXEC = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const BASE = "http://localhost:3000";

async function abrir(largura, altura, caminho, prefixo) {
  const navegador = await chromium.launch({ executablePath: EXEC, args: ["--no-sandbox"] });
  const pagina = await navegador.newPage({ viewport: { width: largura, height: altura } });
  await pagina.goto(BASE, { waitUntil: "networkidle" });

  await pagina.click('button:has-text("Administrador da plataforma")');
  await pagina.waitForSelector('input[type="email"]', { timeout: 8000 });
  await pagina.fill('input[type="email"]', "admin@meucondominio.com");
  await pagina.fill('input[type="password"]', "admin123");
  await pagina.click('button[type="submit"]');
  try {
    await pagina.waitForSelector("text=/Boa (dia|tarde|noite)/", { timeout: 30000 });
  } catch {
    await pagina.screenshot({ path: `/tmp/render/${prefixo}-admin-falha-login.png` });
    throw new Error("Login não chegou ao dashboard — ver screenshot admin-falha-login");
  }
  await pagina.waitForTimeout(1200);
  await pagina.screenshot({ path: `/tmp/render/${prefixo}-admin-entrada.png` });

  // Pula o tutorial se aparecer
  const tour = pagina.locator("text=/Passo 1 de/");
  if ((await tour.count()) > 0) {
    for (let i = 0; i < 12; i++) {
      const avancar = pagina.locator('button:has-text("Avançar"), button:has-text("Concluir"), button:has-text("Pular")');
      if ((await avancar.count()) === 0) break;
      await avancar.first().click().catch(() => {});
      await pagina.waitForTimeout(250);
      if ((await pagina.locator("text=/Passo 1 de/").count()) === 0) break;
    }
    await pagina.waitForTimeout(500);
  }

  // Abre o menu (mobile usa botão inferior; desktop já tem sidebar)
  if (largura < 768) {
    try {
      await pagina.click('[data-tour="botao-menu"]', { timeout: 10000 });
    } catch {
      await pagina.screenshot({ path: `/tmp/render/${prefixo}-erro-menu.png` });
      throw new Error("botão de menu não encontrado");
    }
    await pagina.waitForTimeout(800);
  }
  // Clique via DOM: evita ambiguidade entre o item do menu e atalhos do fundo
  const clicou = await pagina.evaluate(() => {
    const el = [...document.querySelectorAll("button, a, [role='button']")].find((e) =>
      (e.textContent ?? "").trim().startsWith("Identidade visual"),
    );
    if (!el) return false;
    el.click();
    return true;
  });
  if (!clicou) {
    await pagina.screenshot({ path: `/tmp/render/${prefixo}-erro-identidade.png` });
    throw new Error("item Identidade visual não encontrado");
  }
  try {
    await pagina.waitForSelector('text=Fotos dos espaços comuns', { timeout: 15000 });
  } catch {
    await pagina.screenshot({ path: `/tmp/render/${prefixo}-erro-secao.png` });
    throw new Error("seção Fotos dos espaços comuns não apareceu");
  }
  await pagina.waitForTimeout(1500);
  await pagina.screenshot({ path: `/tmp/render/${prefixo}-identidade.png`, fullPage: false });
  // Rolagem até a seção nova
  await pagina.evaluate(() => {
    const el = [...document.querySelectorAll("h2")].find((h) => h.textContent.includes("Fotos dos espaços"));
    el?.scrollIntoView({ block: "center" });
  });
  await pagina.waitForTimeout(600);
  await pagina.screenshot({ path: `/tmp/render/${prefixo}-identidade-fotos.png` });
  await navegador.close();
  console.log(`✅ ${prefixo} capturado`);
}

await abrir(1280, 800, BASE, "desktop");
await abrir(390, 844, BASE, "mobile");
console.log("🎉 SCREENSHOTS DO ADMIN OK");
