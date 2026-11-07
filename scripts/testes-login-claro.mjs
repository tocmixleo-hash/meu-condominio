// Validação do login após correção dos seletores escuros.
// 1. Desktop e mobile em modo claro — capturas de etapa 1 e 2.
// 2. Mobile com force-dark emulado (Chrome Android escuro) — a página
//    deve continuar clara por causa de color-scheme: light.
// 3. Mobile logado (Maria) — barra inferior com ícones consistentes.
import { chromium } from "playwright-core";
import { mkdirSync } from "fs";

const BASE = process.env.BASE || "http://localhost:3000";
const CHROME = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const OUT = "/tmp/render";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const falhas = [];

// ── 1. Desktop claro ──────────────────────────────────────────────
const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await d.goto(BASE, { waitUntil: "networkidle" });
await d.waitForTimeout(800);
await d.screenshot({ path: `${OUT}/fix-login-desktop.png` });

// Passa o mouse sobre um botão de tipo para conferir o hover claro
await d.hover('button:has-text("Portaria")');
await d.waitForTimeout(300);
await d.screenshot({ path: `${OUT}/fix-login-desktop-hover.png` });

// Etapa 2 (desktop)
await d.click('button:has-text("Morador")');
await d.waitForTimeout(500);
await d.screenshot({ path: `${OUT}/fix-login-desktop-etapa2.png` });
const fundoHover = await d.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Maria"));
  return b ? getComputedStyle(b).backgroundColor : null;
});
console.log("pill acesso rápido (desktop) bg:", fundoHover);

// ── 2. Mobile claro ───────────────────────────────────────────────
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await m.goto(BASE, { waitUntil: "networkidle" });
await m.waitForTimeout(800);
await m.screenshot({ path: `${OUT}/fix-login-mobile.png`, fullPage: true });

// Nomes dos condomínios truncados? (grid agora em 1 coluna no mobile)
const truncados = await m.evaluate(() => {
  const spans = [...document.querySelectorAll("button span")].filter(
    (s) => s.className.includes("truncate") && s.textContent.includes("Parque"),
  );
  return spans.map((s) => ({
    texto: s.textContent,
    overflow: s.scrollWidth > s.clientWidth + 1,
  }));
});
console.log("seletor condomínio mobile:", JSON.stringify(truncados));
if (truncados.some((t) => t.overflow)) falhas.push("nome de condomínio truncado no mobile");

// Etapa 2 mobile
await m.tap('button:has-text("Morador")');
await m.waitForTimeout(600);
const bgTipo = await m.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Entrar na plataforma"));
  return b ? getComputedStyle(document.querySelector(".rounded-2xl.bg-white")).backgroundColor : null;
});
console.log("cartão acesso (mobile) bg:", bgTipo);
await m.screenshot({ path: `${OUT}/fix-login-mobile-etapa2.png`, fullPage: true });

// ── 3. Mobile force-dark (Chrome Android em modo escuro) ─────────
const fd = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  colorScheme: "dark",
});
await fd.goto(BASE, { waitUntil: "networkidle" });
await fd.waitForTimeout(800);
const meta = await fd.evaluate(() => document.querySelector('meta[name="color-scheme"]')?.content ?? "AUSENTE");
console.log("meta color-scheme:", meta);
await fd.screenshot({ path: `${OUT}/fix-login-mobile-forcedark.png`, fullPage: true });

// ── 4. Mobile logado — barra inferior ─────────────────────────────
const f = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await f.goto(BASE, { waitUntil: "networkidle" });
await f.waitForTimeout(500);
await f.click('button:has-text("Morador")');
await f.waitForTimeout(400);
await f.click('button:has-text("Maria — Morador (A-101)")');
await f.waitForTimeout(1500);
// pula tutorial se aparecer
if (await f.locator('text=Passo 1 de').isVisible().catch(() => false)) {
  await f.click('button:has-text("Pular")');
  await f.waitForTimeout(500);
}
// ícones da barra inferior: nomes + ícones visíveis
const barra = await f.evaluate(() => {
  const nav = document.querySelector('nav[aria-label="Navegação principal"]');
  if (!nav) return null;
  return [...nav.querySelectorAll("button")].map((b) => ({
    rotulo: b.textContent.trim(),
    svg: !!b.querySelector("svg"),
    cor: getComputedStyle(b.querySelector("svg")).color,
  }));
});
console.log("barra inferior:", JSON.stringify(barra, null, 1));
if (!barra || barra.length !== 5) falhas.push("barra inferior deveria ter 5 botões");
if (barra && barra.some((b) => !b.svg)) falhas.push("botão da barra sem ícone");
await f.screenshot({ path: `${OUT}/fix-portal-mobile-barra.png` });

// FAQ visível na barra inferior? Abre menu completo e captura
await f.click('nav[aria-label="Navegação principal"] button:has-text("Menu")');
await f.waitForTimeout(500);
await f.screenshot({ path: `${OUT}/fix-portal-mobile-drawer.png` });

await browser.close();
console.log(falhas.length ? "FALHAS: " + falhas.join("; ") : "TUDO OK");
process.exit(falhas.length ? 1 : 0);
