/**
 * Valida a barra inferior de navegação no celular + acesso do morador a
 * Documentos (regimento): navegação pelos 4 primeiros destinos, botão
 * Menu abrindo o drawer completo, módulo Documentos somente-leitura e
 * FAQ não coberto pela barra. Também confere o desktop inalterado.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const CHROME = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
mkdirSync("/tmp/render", { recursive: true });

const navegador = await chromium.launch({ executablePath: CHROME, headless: true });
const resultados = [];
function checar(nome, ok, extra = "") {
  resultados.push(`${ok ? "✓" : "✗"} ${nome}${extra ? ` — ${extra}` : ""}`);
}

// ── Celular ──────────────────────────────────────────────────────
{
  const ctx = await navegador.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const pg = await ctx.newPage();
  await pg.goto(BASE, { waitUntil: "networkidle" });
  await pg.waitForSelector("text=Que tipo de usuário é você?", { timeout: 30000 });
  await pg.click('button:has-text("Morador")');
  await pg.waitForTimeout(400);
  await pg.click('button:has-text("Maria — Morador (A-101)")');
  await pg.waitForTimeout(1800);
  if ((await pg.locator("text=Passo 1 de").count()) > 0)
    await pg.getByRole("button", { name: "Pular" }).click().catch(() => {});
  await pg.waitForTimeout(500);

  // Barra inferior existe, está visível e tem 5 botões (4 destinos + Menu)
  const barra = pg.locator('nav[aria-label="Navegação principal"]');
  const visivel = await barra.isVisible().catch(() => false);
  checar("barra inferior visível no celular", visivel);
  const rotulos = await barra.locator("button span").allTextContents();
  checar(
    "destinos da barra",
    visivel && (await barra.locator("button").count()) === 5,
    rotulos.join(", "),
  );

  // Screenshot do Início com a barra
  await pg.screenshot({ path: "/tmp/render/barra-1-inicio.png" });

  // Toca em Reservas na barra → módulo troca
  await barra.getByRole("button", { name: /reservas/i }).click();
  await pg.waitForTimeout(700);
  const reservasVisivel = (await pg.locator("text=Nova reserva").count()) > 0;
  checar("toque em Reservas troca o módulo", reservasVisivel);
  await pg.screenshot({ path: "/tmp/render/barra-2-reservas.png" });

  // Botão Menu da barra abre o drawer com Documentos e Perguntas frequentes
  await barra.getByRole("button", { name: /abrir menu completo/i }).click();
  await pg.waitForTimeout(500);
  const docNoDrawer =
    (await pg.locator('[data-tour="menu"] button:has-text("Documentos")').last().count()) > 0;
  const faqNoDrawer =
    (await pg.locator('[data-tour="menu"] button:has-text("Perguntas frequentes")').last().count()) > 0;
  checar("drawer tem Documentos", docNoDrawer);
  checar("drawer tem Perguntas frequentes", faqNoDrawer);
  await pg.screenshot({ path: "/tmp/render/barra-3-drawer.png" });

  // Entra em Documentos pelo drawer — módulo somente-leitura para morador
  await pg.locator('[data-tour="menu"] button:has-text("Documentos")').last().click();
  await pg.waitForTimeout(800);
  const semEnviar = (await pg.locator('button:has-text("Enviar documento")').count()) === 0;
  const listaDoc = (await pg.locator("text=Regimento interno").count()) > 0;
  checar("Documentos sem botão Enviar (leitura)", semEnviar);
  checar("regimento interno listado", listaDoc);
  await pg.screenshot({ path: "/tmp/render/barra-4-documentos.png" });

  // FAQ: rodapé não fica escondido atrás da barra inferior
  await barra.getByRole("button", { name: /abrir menu completo/i }).click();
  await pg.waitForTimeout(400);
  await pg.locator('[data-tour="menu"] button:has-text("Perguntas frequentes")').last().click();
  await pg.waitForTimeout(600);
  await pg.evaluate(() => {
    const el = [...document.querySelectorAll("p")].find((p) =>
      p.textContent?.includes("Não encontrou sua dúvida?"),
    );
    el?.scrollIntoView({ block: "center" });
  });
  await pg.waitForTimeout(400);
  const rodapeBox = await pg
    .locator("text=Não encontrou sua dúvida?")
    .first()
    .boundingBox();
  const alturaBarra = (await barra.boundingBox())?.y ?? 0;
  checar(
    "rodapé do FAQ visível acima da barra",
    !!rodapeBox && rodapeBox.y + rodapeBox.height <= alturaBarra + 4,
    `rodapé fim=${rodapeBox ? Math.round(rodapeBox.y + rodapeBox.height) : "?"} topo barra=${Math.round(alturaBarra)}`,
  );
  await pg.screenshot({ path: "/tmp/render/barra-5-faq-rodape.png" });

  // Tour: alvo botao-menu aponta para a barra inferior
  await pg.evaluate(() => {
    const el = document.querySelector('[data-tour="botao-menu"]');
    const r = el?.getBoundingClientRect();
    return r ? { ok: r.width > 0 && r.height > 0, y: r.y, tela: innerHeight } : null;
  });
  const alvoTour = await pg.evaluate(() => {
    const el = document.querySelector('[data-tour="botao-menu"]');
    const r = el?.getBoundingClientRect();
    return r ? { ok: r.width > 0 && r.height > 0, y: Math.round(r.y), tela: innerHeight } : null;
  });
  checar(
    "tutorial mira o botão Menu da barra inferior",
    !!alvoTour && alvoTour.ok && alvoTour.y > alvoTour.tela * 0.7,
    JSON.stringify(alvoTour),
  );
  await ctx.close();
}

// ── Desktop: sidebar intacta, sem barra inferior ─────────────────
{
  const ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 } });
  const pg = await ctx.newPage();
  await pg.goto(BASE, { waitUntil: "networkidle" });
  await pg.waitForSelector("text=Que tipo de usuário é você?", { timeout: 30000 });
  await pg.click('button:has-text("Morador")');
  await pg.waitForTimeout(400);
  await pg.click('button:has-text("Maria — Morador (A-101)")');
  await pg.waitForTimeout(1800);
  if ((await pg.locator("text=Passo 1 de").count()) > 0)
    await pg.getByRole("button", { name: "Pular" }).click().catch(() => {});
  await pg.waitForTimeout(500);
  const barraEscondida = !(await pg
    .locator('nav[aria-label="Navegação principal"]')
    .isVisible()
    .catch(() => false));
  checar("desktop sem barra inferior", barraEscondida);
  const docNaSidebar =
    (await pg.locator('[data-tour="menu"] button:has-text("Documentos")').count()) > 0;
  checar("desktop: Documentos na sidebar", docNaSidebar);
  await ctx.close();
}

await navegador.close();
console.log(resultados.join("\n"));
console.log(resultados.every((r) => r.startsWith("✓")) ? "TUDO OK" : "FALHAS ENCONTRADAS");
