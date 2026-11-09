// Teste E2E dos problemas de mobile no módulo RESERVAS (Vercel):
// 1. Regras de reserva visíveis (a seção "Regras dos espaços" não pode sumir);
// 2. Modal "Nova reserva" sem corte no topo em 390×844 — foto e campos
//    acessíveis, corpo rolável, sem auto-zoom do iOS (fonte 16px).
// Rode com: bash scripts/rodar-testes.sh scripts/teste-reservas-mobile.mjs
import { chromium } from "playwright-core";

const CHROME = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const BASE = process.env.BASE ?? "http://localhost:3000";

const erros = [];
let passos = 0;
function registrar(nome, ok, detalhe = "") {
  passos++;
  console.log(`${ok ? "✅" : "❌"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  if (!ok) erros.push(nome);
}

async function novoNavegador(viewport, toque = false) {
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const contexto = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: toque });
  const pagina = await contexto.newPage();
  pagina.on("console", (m) => {
    if (m.type() === "error") {
      const t = m.text();
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
  } catch {}
}

async function entrarMorador(pagina) {
  await pagina.goto(BASE, { waitUntil: "networkidle" });
  await pagina.waitForSelector("text=Que tipo de usuário é você?", { timeout: 15000 });
  await pagina.click('button:has-text("Morador")');
  await pagina.waitForSelector('button:has-text("Maria — Morador (A-101)")', { timeout: 8000 });
  await pagina.click('button:has-text("Maria — Morador (A-101)")');
  await pagina.waitForSelector("text=/Bom dia|Boa tarde|Boa noite/", { timeout: 15000 });
  await pularTour(pagina);
  await pagina.waitForTimeout(600);
}

// ── Mobile 390×844 ───────────────────────────────────────────
const { browser, pagina } = await novoNavegador({ width: 390, height: 844 }, true);
await entrarMorador(pagina);

// Abre Reservas pelo drawer (menu de 4 ícones + Menu) — escopo no drawer visível
await pagina.click('[data-tour="botao-menu"]');
await pagina.waitForTimeout(400);
await pagina.click('aside.animar-deslizar-direita button:has-text("Reservas")');
await pagina.waitForTimeout(900);

// 1. Regras visíveis
const secaoRegras = pagina.locator('text="Regras dos espaços"');
const regrasVisiveis = await secaoRegras.isVisible().catch(() => false);
registrar("seção Regras dos espaços visível", regrasVisiveis);
const linhasRegra = await pagina.locator("text=/dia\\(s\\) de antecedência/").count();
registrar("regras listadas (4 espaços)", linhasRegra >= 4, `${linhasRegra} linha(s)`);
await pagina.screenshot({ path: "/tmp/render/reservas-mobile-01-lista.png", fullPage: false });

// 2. Abre o modal de nova reserva (cartão do salão de festas)
await pagina.locator('button:has-text("Reservar")').first().click();
await pagina.waitForSelector("text=A reserva fica pendente até a aprovação", { timeout: 6000 });
await pagina.waitForTimeout(500);

const modalOk = await pagina.evaluate(() => {
  const el = document.querySelector("div.fixed div.relative.flex.flex-col");
  return !!el && el.className.includes("max-h-[88dvh]") && !!el.querySelector(".overflow-y-auto");
});
registrar("modal com altura limitada e corpo rolável", modalOk);

// 3. Foto do espaço (topo do modal) visível dentro do viewport
const foto = pagina.locator("div.fixed div.relative.h-28 img").first();
const caixaFoto = await foto.boundingBox().catch(() => null);
const fotoNoViewport = !!caixaFoto && caixaFoto.y >= 0 && caixaFoto.y + caixaFoto.height <= 844;
registrar("foto do espaço (topo) visível, sem corte", fotoNoViewport, JSON.stringify(caixaFoto));

// 4. Fonte dos campos = 16px (impede auto-zoom do iOS que cortava o topo)
const fonteData = await pagina
  .locator('div.fixed input[type="date"]')
  .evaluate((el) => getComputedStyle(el).fontSize);
const fonteSelect = await pagina
  .locator("div.fixed select")
  .first()
  .evaluate((el) => getComputedStyle(el).fontSize);
registrar(
  "campos com 16px no mobile (sem auto-zoom iOS)",
  fonteData === "16px" && fonteSelect === "16px",
  `date=${fonteData} select=${fonteSelect}`,
);

// 5. Todos os campos do formulário alcançáveis (rolagem interna)
const campos = await pagina.locator("div.fixed select, div.fixed input, div.fixed textarea").all();
let todosAcessiveis = campos.length >= 4;
for (const campo of campos) {
  await campo.scrollIntoViewIfNeeded().catch(() => {
    todosAcessiveis = false;
  });
  const cx = await campo.boundingBox().catch(() => null);
  if (!cx || cx.y < 0 || cx.y > 844) todosAcessiveis = false;
}
registrar("todos os campos alcançáveis no modal", todosAcessiveis, `${campos.length} campo(s)`);
await pagina.screenshot({ path: "/tmp/render/reservas-mobile-02-modal.png" });

// 6. Focar o campo de data: o topo do modal continua em posição (rolável)
await pagina.locator('div.fixed input[type="date"]').click();
await pagina.waitForTimeout(400);
await pagina.keyboard.press("Escape").catch(() => {});
const fotoDepois = await foto.boundingBox().catch(() => null);
const topoOk = !!fotoDepois && fotoDepois.y >= -2;
registrar("topo do modal permanece alcançável após focar campo", topoOk, JSON.stringify(fotoDepois));
await pagina.screenshot({ path: "/tmp/render/reservas-mobile-03-modal-focado.png" });

await browser.close();

// ── Desktop 1280×800: regressão visual do modal ─────────────
const { browser: b2, pagina: p2 } = await novoNavegador({ width: 1280, height: 800 });
await entrarMorador(p2);
await p2.click('aside button:has-text("Reservas")');
await p2.waitForTimeout(900);
const regrasDesktop = await p2.locator('text="Regras dos espaços"').isVisible().catch(() => false);
registrar("desktop: regras visíveis também", regrasDesktop);
await p2.locator('button:has-text("Reservar")').first().click();
await p2.waitForSelector("text=A reserva fica pendente até a aprovação", { timeout: 6000 });
await p2.waitForTimeout(400);
const fotoDesktop = await p2.locator("div.fixed div.relative.h-28 img").first().boundingBox().catch(() => null);
registrar("desktop: modal intacto (foto no topo)", !!fotoDesktop && fotoDesktop.y >= 0);
await p2.screenshot({ path: "/tmp/render/reservas-desktop-modal.png" });
await b2.close();

console.log(`\n${passos - erros.length}/${passos} verificações OK`);
if (erros.length) {
  console.error("FALHAS:", erros);
  process.exit(1);
}
