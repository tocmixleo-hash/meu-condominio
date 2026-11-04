// Investigação: botão de confirmação maior que a janela do tutorial?
// Mede os retângulos reais do cartão e dos botões em cada passo, desktop e mobile.
// Uso: bun scripts/investigar-tour-mobile.mjs [base]
import { chromium } from "playwright-core";
import { PrismaClient } from "@prisma/client";

const EXEC = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const BASE = process.argv[2] ?? "http://localhost:3000";
const DIR = "/tmp/render";
const prisma = new PrismaClient();

const browser = await chromium.launch({ executablePath: EXEC, args: ["--no-sandbox"] });

async function resetarTour() {
  const u = await prisma.usuario.findFirst({ where: { email: "sindico@parquecalifornia.com.br" } });
  await prisma.usuario.update({ where: { id: u.id }, data: { tutorialVisto: false } });
}

function medirNoNavegador() {
  const dlg = document.querySelector('[role="dialog"][aria-label="Tutorial do portal"]');
  if (!dlg) return { falha: "sem diálogo", dialogs: document.querySelectorAll("[role=dialog]").length };
  const cartao = dlg.querySelector("div.bg-white");
  if (!cartao) return { falha: "sem cartão", dialogs: 1 };
  const cr = cartao.getBoundingClientRect();
  const botoes = [...cartao.querySelectorAll("button")].map((b) => {
    const r = b.getBoundingClientRect();
    return {
      txt: b.textContent.trim().slice(0, 10) || "(ícone)",
      left: +r.left.toFixed(1), right: +r.right.toFixed(1),
      w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      estoura: r.right > cr.right + 0.5 || r.left < cr.left - 0.5,
    };
  });
  return { cardL: +cr.left.toFixed(1), cardR: +cr.right.toFixed(1), cardW: +cr.width.toFixed(1), vw: window.innerWidth, botoes };
}

async function medirViewport(largura, altura, prefixo) {
  await resetarTour();
  const ctx = await browser.newContext({ viewport: { width: largura, height: altura } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector("text=Que tipo de usuário é você?", { timeout: 15000 });
  await page.click('button:has-text("Síndico ou administração")'); // filtra acesso rápido
  await page.waitForSelector('button:has-text("Carlos — Síndico")', { timeout: 10000 });
  await page.click('button:has-text("Carlos — Síndico")');
  await page.waitForSelector("text=Bem-vindo(a), Carlos!", { timeout: 20000 });
  await page.waitForTimeout(900);

  let passo = 0;
  for (;;) {
    const m = await page.evaluate(medirNoNavegador);
    if (m.falha) { console.log(`${prefixo} passo ${passo + 1}: ${m.falha} (dialogs=${m.dialogs})`); break; }
    const rotulo = (await page.locator('[role="dialog"] h3').textContent())?.trim() ?? "?";
    console.log(`\n${prefixo} passo ${passo + 1} — "${rotulo}" (viewport ${m.vw}px, cartão ${m.cardW}px [${m.cardL}→${m.cardR}])`);
    for (const b of m.botoes) {
      const flag = b.estoura ? "  ⚠️ ESTOURA O CARTÃO" : "";
      console.log(`   botão "${b.txt}" w=${b.w} h=${b.h} [${b.left}→${b.right}]${flag}`);
    }
    await page.screenshot({ path: `${DIR}/tourinv-${prefixo}-p${passo + 1}.png` });
    const concluir = page.locator('button:has-text("Concluir")');
    if ((await concluir.count()) > 0) {
      await concluir.click();
      await page.waitForTimeout(800);
      const sobrou = await page.locator('[role="dialog"][aria-label="Tutorial do portal"]').count();
      console.log(`${prefixo}: Concluir clicado — diálogo removido? ${sobrou === 0 ? "sim" : "NÃO"}`);
      await page.screenshot({ path: `${DIR}/tourinv-${prefixo}-fim.png` });
      break;
    }
    await page.click('button:has-text("Próximo")');
    await page.waitForTimeout(850);
    passo++;
  }
  await ctx.close();
}

console.log("───────── CELULAR 390×844 ─────────");
await medirViewport(390, 844, "cel");
console.log("\n───────── DESKTOP 1440×900 ─────────");
await medirViewport(1440, 900, "desk");

await browser.close();
await prisma.$disconnect();
console.log("\nScreenshots em", DIR);
