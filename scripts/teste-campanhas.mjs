// Teste E2E do módulo CAMPANHAS em destaque:
// 1. Morador vê o banner rotativo no painel com as campanhas reais (pet + boas práticas);
// 2. Morador abre o detalhe "Saiba mais" da campanha;
// 3. Síndico cria uma campanha nova pelo módulo Comunicados;
// 4. A campanha criada aparece no banner do painel;
// 5. Síndico pausa a campanha → ela sai do destaque;
// 6. Síndico retoma e exclui a campanha de teste (auto-limpeza);
// 7. Morador NÃO vê botões de gestão (sem "Nova campanha").
// Rode com: bash scripts/rodar-testes.sh scripts/teste-campanhas.mjs
// (banco descartável — nunca toca db/custom.db)
import { chromium } from "playwright-core";

const CHROME = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const BASE = process.env.BASE ?? "http://localhost:3000";
const MODO = (process.env.MODO ?? "ambos").toLowerCase();

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
  const errosConsole = []; // erros DESTE navegador (não global)
  pagina.on("console", (m) => {
    if (m.type() === "error") {
      const t = m.text();
      if (t.includes("401") || t.includes("Unauthorized")) return;
      errosConsole.push(`console: ${t.slice(0, 140)}`);
    }
  });
  pagina.on("pageerror", (e) => errosConsole.push(`pageerror: ${String(e).slice(0, 140)}`));
  return { browser, pagina, errosConsole };
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

async function entrar(pagina, tipo, _etiqueta) {
  await pagina.goto(BASE, { waitUntil: "networkidle" });
  await pagina.waitForSelector("text=Que tipo de usuário é você?", { timeout: 15000 });
  // Demonstração: o clique no tipo já entra logado
  await pagina.click(`button:has-text("${tipo}")`);
  await pagina.waitForSelector("text=/Bom dia|Boa tarde|Boa noite/", { timeout: 15000 });
  await pularTour(pagina);
  await pagina.waitForTimeout(800);
}

// Rótulo do primeiro passo do login: "Síndico ou administração"
const ENTRAR_GESTAO = ["Síndico ou administração", "Carlos — Síndico (Gestão)"];

const NOME_TESTE = "Campanha de teste E2E — lixo seletivo";

async function testeDesktop() {
  const { browser, pagina } = await novoNavegador({ width: 1280, height: 800 });

  // ── 1. Morador: banner no painel ─────────────────────────────
  await entrar(pagina, "Morador", "Maria — Morador (A-101)");
  const banner = pagina.locator('[data-tour="campanhas"]');
  await banner.waitFor({ state: "visible", timeout: 8000 });
  registrar("banner de campanhas visível no painel do morador", true);

  // Gira o carrossel até a campanha do pet (a ordem pode variar)
  let petVisivel = false;
  for (let i = 0; i < 5 && !petVisivel; i++) {
    petVisivel = (await banner.getByText("Recolha as fezes do seu pet").count()) > 0;
    if (!petVisivel) {
      await pagina.click('button[aria-label="Próxima campanha"]');
      await pagina.waitForTimeout(500);
    }
  }
  registrar("campanha real do pet em destaque", petVisivel);
  await pagina.screenshot({ path: "/tmp/render/campanhas-01-dashboard-morador.png" });

  const rotulos = await banner.locator("p").first().textContent();
  registrar("etiqueta CAMPANHA + categoria", /Campanha · Pet/i.test(rotulos ?? ""), rotulos ?? "");

  // ── 2. Detalhe "Saiba mais" ─────────────────────────────────
  await banner.getByRole("button", { name: /Campanha:/ }).first().click();
  const dialogo = pagina.locator("text=Boas práticas com o seu pet no condomínio").first();
  await dialogo.waitFor({ state: "visible", timeout: 5000 });
  registrar("detalhe da campanha abre com as boas práticas", true);
  await pagina.screenshot({ path: "/tmp/render/campanhas-02-detalhe.png" });
  await pagina.click('button[aria-label="Fechar detalhes"]');
  await pagina.waitForTimeout(300);

  // ── 7a. Morador não tem botões de gestão ────────────────────
  await pagina.click('aside button:has-text("Comunicados")');
  await pagina.waitForSelector("text=Campanhas em destaque", { timeout: 6000 });
  const semBotao = (await pagina.locator('button:has-text("Nova campanha")').count()) === 0;
  const semAcoes = (await pagina.locator('button:has-text("Pausar")').count()) === 0;
  registrar("morador não vê botões de gestão de campanhas", semBotao && semAcoes);
  const listaMorador = await pagina
    .waitForSelector("text=Recolha as fezes do seu pet", { timeout: 6000 })
    .then(() => true)
    .catch(() => false);
  registrar("morador vê campanhas listadas no módulo", listaMorador);
  await pagina.click('aside button:has-text("Sair da conta")');
  await pagina.waitForTimeout(600);

  // ── 3. Síndico cria campanha ────────────────────────────────
  await entrar(pagina, ENTRAR_GESTAO[0], ENTRAR_GESTAO[1]);
  await pagina.click('aside button:has-text("Comunicados")');
  await pagina.waitForSelector("text=Campanhas em destaque", { timeout: 6000 });
  await pagina.click('button:has-text("Nova campanha")');
  await pagina.waitForSelector("text=Nova campanha em destaque", { timeout: 5000 });

  // Emblema ♻️ + campos
  await pagina.click('button[aria-label="Escolher emblema ♻️"]');
  await pagina.fill('input[placeholder*="Título da campanha"]', NOME_TESTE);
  await pagina.fill(
    'textarea[placeholder*="Mensagem curta"]',
    "Teste E2E: separe recicláveis e rejeite corretamente o resíduo comum.",
  );
  await pagina.fill(
    'textarea[placeholder*="Descrição complementar"]',
    "Campanha criada pelo teste automatizado — será excluída ao final.",
  );
  await pagina.selectOption("select", "SUSTENTABILIDADE");
  await pagina.click('button:has-text("Divulgar campanha")');
  await pagina.waitForSelector('text=Campanha de teste E2E — lixo seletivo', { timeout: 6000 });
  registrar("síndico cadastra campanha pelo módulo Comunicados", true);
  await pagina.screenshot({ path: "/tmp/render/campanhas-03-lista-gestao.png", fullPage: true });

  // ── 4. Campanha aparece no banner do painel ─────────────────
  await pagina.click('aside button:has-text("Início")');
  await banner.waitFor({ state: "visible", timeout: 8000 });
  let encontrada = false;
  for (let i = 0; i < 4 && !encontrada; i++) {
    encontrada = (await banner.getByText(NOME_TESTE).count()) > 0;
    if (!encontrada) {
      await pagina.click('button[aria-label="Próxima campanha"]');
      await pagina.waitForTimeout(500);
    }
  }
  registrar("campanha criada aparece no destaque do painel", encontrada);

  // ── 5. Pausar → sai do destaque ─────────────────────────────
  await pagina.click('aside button:has-text("Comunicados")');
  await pagina.waitForSelector("text=Campanhas em destaque", { timeout: 6000 });
  const linha = pagina.locator("div.py-4", { hasText: NOME_TESTE }).first();
  await linha.locator('button:has-text("Pausar")').click();
  await pagina.waitForTimeout(700);
  const pausada = (await linha.locator('text="Pausada"').count()) > 0;
  registrar("síndico pausa campanha (badge Pausada)", pausada);
  await pagina.click('aside button:has-text("Início")');
  await banner.waitFor({ state: "visible", timeout: 8000 });
  let someu = true;
  for (let i = 0; i < 4; i++) {
    if ((await banner.getByText(NOME_TESTE).count()) > 0) someu = false;
    await pagina.click('button[aria-label="Próxima campanha"]');
    await pagina.waitForTimeout(400);
  }
  registrar("campanha pausada sai do destaque", someu);

  // ── 6. Retomar e excluir (auto-limpeza) ─────────────────────
  await pagina.click('aside button:has-text("Comunicados")');
  await pagina.waitForSelector("text=Campanhas em destaque", { timeout: 6000 });
  await linha.locator('button:has-text("Retomar")').click();
  await pagina.waitForTimeout(700);
  const retomada = (await linha.locator('text="Ativa"').count()) > 0;
  registrar("síndico retoma campanha", retomada);
  await linha.locator('button:has-text("Excluir")').click();
  await linha.locator('button:has-text("Confirmar")').click();
  const excluida = await pagina
    .waitForSelector(`text=${NOME_TESTE}`, { state: "detached", timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  registrar("síndico exclui campanha de teste (auto-limpeza)", excluida);

  // Auditoria registrou as ações de campanha
  await pagina.click('aside button:has-text("Auditoria")');
  await pagina.waitForTimeout(900);
  const auditoria = (await pagina.locator("text=CAMPANHA_REMOVIDA").count()) > 0;
  registrar("auditoria registra ações de campanha", auditoria);

  await browser.close();
}

async function testeMobile() {
  const { browser, pagina, errosConsole } = await novoNavegador({ width: 390, height: 844 }, true);
  await entrar(pagina, "Morador", "Maria — Morador (A-101)");
  const banner = pagina.locator('[data-tour="campanhas"]');
  await banner.waitFor({ state: "visible", timeout: 8000 });
  const caixa = await banner.boundingBox();
  const cabe = caixa && caixa.x >= 0 && caixa.width <= 390 && caixa.height < 260;
  registrar("banner cabe no viewport móvel 390px", !!cabe, JSON.stringify(caixa));
  await pagina.screenshot({ path: "/tmp/render/campanhas-04-mobile.png" });

  // Swipe para a próxima campanha
  const y = caixa ? caixa.y + caixa.height / 2 : 300;
  await pagina.touchscreen.tap(195, y); // garante que tocou sem quebrar
  await pagina.waitForTimeout(400);
  const semErroMobile = errosConsole.length === 0;
  registrar("mobile sem erros de console", semErroMobile, errosConsole.join("; ").slice(0, 120));
  await browser.close();
}

if (MODO !== "mobile") await testeDesktop();
if (MODO !== "desktop") await testeMobile();

console.log(`\n${passos - erros.length}/${passos} verificações OK`);
if (erros.length) {
  console.error("FALHAS:", erros);
  process.exit(1);
}
