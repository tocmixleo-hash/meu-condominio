// Diagnóstico visual via cookie de sessão obtido pela API (determinístico).
import { chromium } from "playwright-core";

const EXEC = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const BASE = process.env.BASE ?? "https://parque-california.vercel.app";
const FLORIDA_ID = process.env.FLORIDA_ID ?? "";

async function cookieLogin(email, senha, condominioId) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(condominioId ? { email, senha, condominioId } : { email, senha }),
  });
  const bruto = res.headers.get("set-cookie") ?? "";
  console.log(`login ${email}: status=${res.status}`);
  if (!res.ok) throw new Error(await res.text());
  return bruto.split(";")[0];
}

async function trocar(cookie, condominioId) {
  const res = await fetch(`${BASE}/api/auth/trocar-condominio`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ condominioId }),
  });
  const bruto = res.headers.get("set-cookie") ?? "";
  console.log(`troca para ${condominioId}: status=${res.status}`);
  if (!res.ok) throw new Error(await res.text());
  return bruto.split(";")[0];
}

async function capturar(cookie, arq, acaoExtra) {
  const browser = await chromium.launch({ executablePath: EXEC, args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const url = new URL(BASE);
  const nomeCookie = cookie.split("=")[0];
  const valorCookie = cookie.slice(nomeCookie.length + 1);
  await ctx.addCookies([{ name: nomeCookie, value: valorCookie, domain: url.hostname, path: "/" }]);
  const page = await ctx.newPage();
  const erros = [];
  page.on("console", (m) => { if (m.type() === "error") erros.push(m.text().slice(0, 180)); });
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2500);
  if (acaoExtra) await acaoExtra(page);
  await page.screenshot({ path: arq });
  // cor computada da sidebar
  const corSidebar = await page.evaluate(() => {
    const aside = document.querySelector("aside");
    if (!aside) return null;
    const cs = getComputedStyle(aside);
    return { bg: cs.backgroundColor, varCorSidebar: getComputedStyle(document.documentElement).getPropertyValue("--cor-sidebar") || getComputedStyle(aside).getPropertyValue("--cor-sidebar") };
  });
  const corRaiz = await page.evaluate(() => {
    const alvo = document.querySelector("[style*='--cor-sidebar']");
    if (!alvo) return "nenhum elemento com --cor-sidebar inline";
    return alvo.getAttribute("style").slice(0, 300);
  });
  console.log(`screenshot: ${arq} | aside:`, corSidebar);
  console.log(`  estilo raiz: ${corRaiz}`);
  if (erros.length) console.log("  erros de console:", erros.slice(0, 4));
  await browser.close();
}

// 1) Síndico do Florida — login direto no vínculo do Florida
const cookieFl = await cookieLogin("sindico@parqueflorida.com.br", "admin123", FLORIDA_ID);
await capturar(cookieFl, "/tmp/render/diag-florida.png");

// 2) Admin da plataforma — login e troca para o Florida
const cookieAdm = await cookieLogin("admin@meucondominio.com", "admin123");
const cookieAdmFl = await trocar(cookieAdm, FLORIDA_ID);
await capturar(cookieAdmFl, "/tmp/render/diag-admin-florida.png");
