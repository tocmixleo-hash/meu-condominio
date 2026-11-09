// Testes visuais da evolução "construtora premium":
// login, dashboard, reservas com galeria de fotos, FAQ e navegação,
// em desktop (1280×800) e mobile (390×844). Gera capturas em /tmp/render.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const CHROME = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const BASE = process.env.BASE ?? "http://localhost:3000";
const MODO = (process.env.MODO ?? "ambos").toLowerCase(); // desktop | mobile | ambos
mkdirSync("/tmp/render", { recursive: true });

const erros = [];
let passos = 0;

function registrar(nome, ok, detalhe = "") {
  passos++;
  console.log(`${ok ? "✅" : "❌"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  if (!ok) erros.push(nome);
}

async function novoNavegador(viewport) {
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const contexto = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const pagina = await contexto.newPage();
  pagina.on("console", (m) => {
    if (m.type() === "error") {
      const t = m.text();
      // 401 de /api/auth/verificar é esperado: checagem de sessão antes do login
      if (t.includes("401") || t.includes("Unauthorized")) return;
      erros.push(`console: ${t.slice(0, 140)}`);
    }
  });
  pagina.on("pageerror", (e) => erros.push(`pageerror: ${String(e).slice(0, 140)}`));
  return { browser, pagina };
}

async function pularTour(pagina) {
  try {
    await pagina.waitForSelector("text=Passo 1 de", { timeout: 4000 });
    await pagina.click("button:has-text('Pular')");
    await pagina.waitForTimeout(400);
  } catch {
    // tour não apareceu — segue o baile
  }
}

async function entrar(pagina, tipoTexto, etiqueta) {
  await pagina.goto(BASE, { waitUntil: "networkidle" });
  await pagina.waitForSelector("text=Que tipo de usuário é você?", { timeout: 15000 });
  await pagina.click(`button:has-text("${tipoTexto}")`);
  await pagina.waitForSelector(`button:has-text("${etiqueta}")`, { timeout: 8000 });
  await pagina.click(`button:has-text("${etiqueta}")`);
  await pagina.waitForSelector("text=/Bom dia|Boa tarde|Boa noite/", { timeout: 15000 });
  await pularTour(pagina);
}

// ── Desktop ──────────────────────────────────────────────────
if (MODO !== "mobile") {
  const { browser, pagina } = await novoNavegador({ width: 1280, height: 800 });

  // 1. Login
  await pagina.goto(BASE, { waitUntil: "networkidle" });
  await pagina.waitForSelector("text=Que tipo de usuário é você?", { timeout: 15000 });
  await pagina.screenshot({ path: "/tmp/render/visual-01-login.png" });

  // Fontes carregadas? (next/font gera famílias com hash: __Manrope_xxx,
  // __Fraunces_xxx — conferimos o fontFamily computado, não o nome comercial)
  const fontes = await pagina.evaluate(() => ({
    display: getComputedStyle(document.querySelector("h1") || document.body).fontFamily,
    corpo: getComputedStyle(document.body).fontFamily,
  }));
  registrar(
    "fontes Fraunces+Manrope aplicadas",
    /Fraunces/i.test(fontes.display) && /Manrope/i.test(fontes.corpo),
    JSON.stringify(fontes),
  );

  // 2. Login morador
  await pagina.click('button:has-text("Morador")');
  await pagina.waitForSelector('button:has-text("Maria — Morador (A-101)")', { timeout: 8000 });
  await pagina.click('button:has-text("Maria — Morador (A-101)")');
  await pagina.waitForSelector("text=/Bom dia|Boa tarde|Boa noite/", { timeout: 15000 });
  await pularTour(pagina);
  await pagina.waitForTimeout(900);
  await pagina.screenshot({ path: "/tmp/render/visual-02-dashboard.png", fullPage: false });

  // 3. Reservas — galeria de espaços
  await pagina.click('aside button:has-text("Reservas")');
  await pagina.waitForSelector("text=Espaços do condomínio", { timeout: 10000 });
  await pagina.waitForTimeout(1200);
  await pagina.screenshot({ path: "/tmp/render/visual-03-reservas-galeria.png" });

  // Fotos realmente carregadas?
  const fotosOk = await pagina.evaluate(() =>
    Array.from(document.querySelectorAll("img[alt='Piscina'], img[alt='Salão de festas'], img[alt='Churrasqueira'], img[alt='Quadra']"))
      .map((i) => ({ alt: i.alt, ok: i.complete && i.naturalWidth > 0 }))
  );
  registrar("4 fotos de espaços carregadas", fotosOk.length >= 4 && fotosOk.every((f) => f.ok), JSON.stringify(fotosOk));

  // 4. Cartão Piscina → modal com foto
  await pagina.click('button:has(img[alt="Piscina"])');
  await pagina.waitForSelector("text=Nova reserva >> xpath=..", { timeout: 6000 }).catch(() => {});
  await pagina.waitForSelector("text=A reserva fica pendente até a aprovação", { timeout: 8000 });
  await pagina.waitForTimeout(700);
  await pagina.screenshot({ path: "/tmp/render/visual-04-modal-reserva.png" });
  await pagina.click('button:has-text("Cancelar")');

  // 5. Lista de reservas com miniaturas
  await pagina.waitForTimeout(400);
  await pagina.screenshot({ path: "/tmp/render/visual-05-reservas-lista.png" });

  // 6. FAQ
  await pagina.click('aside button:has-text("Perguntas frequentes")');
  await pagina.waitForSelector("text=Regras de convivência", { timeout: 10000 });
  await pagina.waitForTimeout(700);
  await pagina.screenshot({ path: "/tmp/render/visual-06-faq.png" });

  // 7. Encomendas (cartões em módulo padrão)
  await pagina.click('aside button:has-text("Encomendas")');
  await pagina.waitForTimeout(900);
  await pagina.screenshot({ path: "/tmp/render/visual-07-encomendas.png" });

  // 8. Gestão — reservas (regras + galeria com CTA diferente)
  await pagina.click('aside button:has-text("Sair da conta")');
  await pagina.waitForTimeout(600);
  await pagina.waitForSelector("text=Que tipo de usuário é você?", { timeout: 10000 });
  await pagina.click('button:has-text("Síndico ou administração")');
  await pagina.waitForSelector('button:has-text("Carlos — Síndico (Gestão)")', { timeout: 8000 });
  await pagina.click('button:has-text("Carlos — Síndico (Gestão)")');
  await pagina.waitForSelector("text=/Bom dia|Boa tarde|Boa noite/", { timeout: 15000 });
  await pularTour(pagina);
  await pagina.click('aside button:has-text("Reservas")');
  await pagina.waitForSelector("text=Espaços do condomínio", { timeout: 10000 });
  await pagina.waitForTimeout(900);
  await pagina.screenshot({ path: "/tmp/render/visual-08-reservas-gestao.png" });

  await browser.close();
}

// ── Mobile 390×844 ───────────────────────────────────────────
if (MODO !== "desktop") {
  const { browser, pagina } = await novoNavegador({ width: 390, height: 844 });

  await pagina.goto(BASE, { waitUntil: "networkidle" });
  await pagina.waitForSelector("text=Que tipo de usuário é você?", { timeout: 15000 });
  await pagina.screenshot({ path: "/tmp/render/visual-09-login-mobile.png" });

  await pagina.click('button:has-text("Morador")');
  await pagina.waitForSelector('button:has-text("Maria — Morador (A-101)")', { timeout: 8000 });
  await pagina.click('button:has-text("Maria — Morador (A-101)")');
  await pagina.waitForSelector("text=/Bom dia|Boa tarde|Boa noite/", { timeout: 15000 });
  await pularTour(pagina);
  await pagina.waitForTimeout(800);
  await pagina.screenshot({ path: "/tmp/render/visual-10-dashboard-mobile.png" });

  // Barra inferior: ícones consistentes (mesmos rótulos do menu)
  const barra = await pagina.evaluate(() => {
    const nav = document.querySelector("nav[aria-label='Navegação principal']");
    if (!nav) return null;
    return Array.from(nav.querySelectorAll("button")).map((b) => ({
      rotulo: b.textContent?.trim(),
      icone: !!b.querySelector("svg"),
    }));
  });
  registrar(
    "barra inferior com ícones e rótulos",
    !!barra && barra.length === 5 && barra.every((b) => b.icone && b.rotulo),
    JSON.stringify(barra),
  );

  // Reservas via menu (Reservas está na barra inferior)
  await pagina.click("nav[aria-label='Navegação principal'] button:has-text('Reservas')");
  await pagina.waitForSelector("text=Espaços do condomínio", { timeout: 10000 });
  await pagina.waitForTimeout(1100);
  await pagina.screenshot({ path: "/tmp/render/visual-11-reservas-mobile.png" });

  // Cartão Piscina → modal
  await pagina.click('button:has(img[alt="Piscina"])');
  await pagina.waitForSelector("text=A reserva fica pendente até a aprovação", { timeout: 8000 });
  await pagina.waitForTimeout(700);
  await pagina.screenshot({ path: "/tmp/render/visual-12-modal-mobile.png" });
  await pagina.click('button:has-text("Cancelar")');

  // Menu completo (drawer) — o X do drawer tem aria-label="Fechar"
  await pagina.click("[data-tour='botao-menu']");
  await pagina.waitForTimeout(600);
  await pagina.screenshot({ path: "/tmp/render/visual-13-menu-mobile.png" });
  await pagina.click("aside button[aria-label='Fechar']");
  await pagina.waitForTimeout(400);

  // FAQ mobile
  await pagina.click("[data-tour='botao-menu']");
  await pagina.waitForTimeout(500);
  await pagina.click("aside:not(.hidden) button:has-text('Perguntas frequentes')");
  await pagina.waitForSelector("text=Regras de convivência", { timeout: 10000 });
  await pagina.waitForTimeout(600);
  await pagina.screenshot({ path: "/tmp/render/visual-14-faq-mobile.png" });

  await browser.close();
}

console.log(`\n${erros.length === 0 ? "🎉 TUDO OK" : "⚠️ PROBLEMAS"} — ${passos} verificações, ${erros.length} problemas`);
erros.forEach((e) => console.log("   •", e));
process.exit(erros.length === 0 ? 0 : 1);
