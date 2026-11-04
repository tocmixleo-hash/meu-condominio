// Verificação do tutorial em PRODUÇÃO (mobile 390×844): o cartão deve
// conter todos os botões dentro dos seus limites.
// Uso: bun scripts/verificar-tour-producao.mjs [base]
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "https://parque-california.vercel.app";
const DIR = "/tmp/render";

const browser = await chromium.launch({
  executablePath: "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome",
  args: ["--no-sandbox"],
});

function medir() {
  const dlg = document.querySelector('[role="dialog"][aria-label="Tutorial do portal"]');
  if (!dlg) return { falha: "sem diálogo" };
  const cartao = dlg.querySelector("div.bg-white");
  const cr = cartao.getBoundingClientRect();
  const botoes = [...cartao.querySelectorAll("button")].map((b) => {
    const r = b.getBoundingClientRect();
    return { txt: b.textContent.trim().slice(0, 10), right: +r.right.toFixed(1), w: +r.width.toFixed(1),
             estoura: r.right > cr.right + 0.5 };
  });
  return { cardW: +cr.width.toFixed(1), cardR: +cr.right.toFixed(1), vw: window.innerWidth, botoes };
}

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForSelector("text=Que tipo de usuário é você?", { timeout: 30000 });
console.log("produção: tela de tipo OK");
await page.click('button:has-text("Morador")');
await page.click('button:has-text("Maria — Morador")');
await page.waitForSelector("text=Bem-vindo(a), Maria!", { timeout: 30000 });
await page.waitForTimeout(900);

for (let p = 1; p <= 2; p++) {
  const m = await page.evaluate(medir);
  if (m.falha) { console.log(`passo ${p}: ${m.falha}`); break; }
  console.log(`passo ${p}: cartão ${m.cardW}px [→${m.cardR}] viewport ${m.vw}px`);
  for (const b of m.botoes) console.log(`  "${b.txt}" w=${b.w} →${b.right}${b.estoura ? "  ⚠️ ESTOURA" : ""}`);
  await page.screenshot({ path: `${DIR}/prod-cel-p${p}.png` });
  const prox = page.locator('button:has-text("Próximo")');
  if ((await prox.count()) > 0) { await prox.click(); await page.waitForTimeout(900); }
}
await page.screenshot({ path: `${DIR}/prod-cel-fim.png` });
console.log("verificação concluída (tutorial encerrado via Próximo/Pular)");
await ctx.close();
await browser.close();
