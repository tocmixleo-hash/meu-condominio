/**
 * Testa o módulo "Perguntas frequentes" no portal do morador:
 * menu, busca, filtro por categoria, acordeão e contato — em
 * desktop (1440×900) e celular (390×844). Salva capturas em /tmp/render.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const CHROME = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
mkdirSync("/tmp/render", { recursive: true });

const navegador = await chromium.launch({ executablePath: CHROME, headless: true });

async function testar(disp) {
  const ctx = await navegador.newContext({
    viewport: disp === "mobile" ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    hasTouch: disp === "mobile",
    isMobile: disp === "mobile",
  });
  const pg = await ctx.newPage();
  await pg.goto(BASE, { waitUntil: "networkidle" });

  // Seleciona tipo Morador e entra pelo acesso rápido (Maria)
  await pg.waitForSelector("text=Que tipo de usuário é você?", { timeout: 30000 });
  await pg.click('button:has-text("Morador")');
  await pg.waitForTimeout(400);
  // Fecha o tutorial se aparecer
  await pg.keyboard.press("Escape").catch(() => {});
  await pg.waitForTimeout(300);
  await pg.click('button:has-text("Maria — Morador (A-101)")');
  // Espera o painel (ou o tutorial) aparecer
  await pg
    .waitForSelector("text=Bom dia, Maria, Boa tarde, Maria, Boa noite, Maria", { timeout: 30000 })
    .catch(() => {});
  await pg.waitForTimeout(800);
  // O tutorial pode abrir após o login — fecha antes de navegar
  if ((await pg.locator("text=Passo 1 de").count()) > 0) {
    await pg.getByRole("button", { name: "Pular" }).click().catch(() => {});
  }
  await pg.waitForTimeout(600);
  await pg.screenshot({ path: `/tmp/render/faq-${disp}-0-logado.png` });

  // No celular abre o menu (hambúrguer); no desktop a barra lateral já está visível
  const botaoMenu = pg.locator('[data-tour="botao-menu"]');
  if (await botaoMenu.first().isVisible().catch(() => false)) await botaoMenu.first().click();
  await pg.waitForTimeout(400);
  await pg.screenshot({ path: `/tmp/render/faq-${disp}-1-menu.png` });
  await pg.getByRole("button", { name: /perguntas frequentes/i }).first().click();
  await pg.waitForTimeout(600);

  await pg.screenshot({ path: `/tmp/render/faq-${disp}-2-inicio.png`, fullPage: false });
  await pg.screenshot({ path: `/tmp/render/faq-${disp}-2b-inicio-full.png`, fullPage: true });

  // Abre a primeira pergunta (piscina)
  await pg.getByRole("button", { name: /horário de funcionamento da piscina/i }).click();
  await pg.waitForTimeout(300);

  // Busca "papelão" → deve achar respostas em mudanças/lixo
  await pg.getByLabel(/buscar nas perguntas/i).fill("papelão");
  await pg.waitForTimeout(400);
  await pg.screenshot({ path: `/tmp/render/faq-${disp}-3-busca.png`, fullPage: false });

  // Limpa busca e filtra categoria Lixo
  await pg.getByRole("button", { name: /limpar busca/i }).click();
  await pg.getByRole("button", { name: /lixo e reciclagem/i }).click();
  await pg.waitForTimeout(400);
  await pg.screenshot({ path: `/tmp/render/faq-${disp}-4-categoria.png`, fullPage: false });
  const contagem = await pg.locator("text=Lixo e reciclagem ·").count();

  // Busca sem resultado
  await pg.getByRole("button", { name: /^todas$/i }).click();
  await pg.getByLabel(/buscar nas perguntas/i).fill("zzzzinexistente");
  await pg.waitForTimeout(400);
  const vazio = await pg.locator("text=Nenhuma pergunta encontrada").count();
  await pg.screenshot({ path: `/tmp/render/faq-${disp}-5-vazio.png` });

  // Rolagem até o rodapé "Não encontrou sua dúvida?"
  await pg.getByLabel(/buscar nas perguntas/i).fill("");
  await pg.waitForTimeout(300);
  const rodape = await pg.locator("text=Não encontrou sua dúvida?").count();

  console.log(
    `${disp}: filtro lixo=${contagem > 0} · vazio=${vazio > 0} · rodapé=${rodape > 0}`,
  );
  await ctx.close();
}

await testar("desktop");
await testar("mobile");
await navegador.close();
console.log("OK");
