// Teste E2E do NOVO login:
// 1. Barra superior com a marca à esquerda e Entrar / Fazer cadastro à direita;
// 2. Cartão de tipos SEM campos de e-mail/senha (login mora no botão do topo);
// 3. Painel esquerdo com os benefícios da plataforma em área com rolagem;
// 4. Login por e-mail/senha pelo botão "Entrar" do topo funciona de ponta a ponta;
// 5. "Fazer cadastro" explica o cadastro pela administração;
// 6. Após o login, o painel esquerdo mostra a marca Meu Condomínio e o
//    condomínio fica no seletor logo abaixo;
// 7. Mobile 390×844: barra superior alcançável e fluxo completo.
// Rode com: bash scripts/rodar-testes.sh scripts/teste-login-novo.mjs
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
  const errosConsole = [];
  pagina.on("console", (m) => {
    if (m.type() === "error") {
      const t = m.text();
      if (t.includes("401") || t.includes("Unauthorized")) return;
      errosConsole.push(`console: ${t.slice(0, 140)}`);
    }
  });
  pagina.on("pageerror", (e) => errosConsole.push(`pageerror: ${String(e).slice(0, 140)}`));
  return { browser, contexto, pagina, errosConsole };
}

async function pularTour(pagina) {
  try {
    await pagina.waitForSelector("text=Passo 1 de", { timeout: 4000 });
    await pagina.click("button:has-text('Pular')");
    await pagina.waitForTimeout(400);
  } catch {
    // tour não apareceu
  }
}

// ── Desktop ──────────────────────────────────────────────────────
{
  const { browser, pagina, errosConsole } = await novoNavegador({ width: 1440, height: 900 });
  await pagina.goto(BASE, { waitUntil: "networkidle" });

  // 1. Barra superior: marca à esquerda, botões à direita
  const marca = pagina.locator('header img[alt="Meu Condomínio"]');
  registrar("barra superior mostra a marca Meu Condomínio", await marca.isVisible());
  const botaoEntrar = pagina.locator('header button:has-text("Entrar")');
  const botaoCadastro = pagina.locator('header button:has-text("Fazer cadastro")');
  registrar("botões Entrar e Fazer cadastro no topo", await botaoEntrar.isVisible() && await botaoCadastro.isVisible());
  const caixaCadastro = await botaoCadastro.boundingBox();
  registrar(
    "botões no canto superior direito",
    !!caixaCadastro && caixaCadastro.y < 100 && caixaCadastro.x > 720,
    caixaCadastro ? JSON.stringify({ x: Math.round(caixaCadastro.x), y: Math.round(caixaCadastro.y) }) : "sem caixa",
  );

  // 2. Cartão de tipos sem campos de login
  await pagina.waitForSelector("text=Que tipo de usuário é você?", { timeout: 15000 });
  const temEmail = await pagina.locator("#email").count();
  const temSenha = await pagina.locator("#senha").count();
  registrar("tipos de usuário sem campos de e-mail/senha", temEmail === 0 && temSenha === 0, `email=${temEmail} senha=${temSenha}`);

  // 3. Benefícios com rolagem no painel esquerdo
  const rotulo = pagina.locator("text=Benefícios da plataforma");
  registrar("painel esquerdo destaca os benefícios", await rotulo.isVisible());
  const area = pagina.locator("div.rolagem-fina.max-h-\\[290px\\]");
  const medida = await area.evaluate((el) => ({ rola: el.scrollHeight > el.clientHeight + 10, itens: el.children.length }));
  registrar(
    "benefícios em área rolável com mais conteúdo",
    medida.rola && medida.itens >= 8,
    `${medida.itens} itens, rola=${medida.rola}`,
  );

  await pagina.screenshot({ path: "/tmp/render/login-novo-01-desktop.png" });

  // 4. Escolher Morador → chips de demonstração (sem formulário)
  await pagina.click('button:has-text("Morador")');
  await pagina.waitForSelector('button:has-text("Maria — Morador (A-101)")', { timeout: 8000 });
  const aindaSemForm = (await pagina.locator("#email").count()) === 0;
  registrar("tipo escolhido mostra acessos rápidos, sem pedir senha", aindaSemForm);
  await pagina.screenshot({ path: "/tmp/render/login-novo-02-tipos.png" });

  // 5. Botão Entrar do topo abre o formulário e loga de ponta a ponta
  await botaoEntrar.click();
  await pagina.waitForSelector("#email", { timeout: 5000 });
  registrar("botão Entrar do topo abre e-mail/senha", true);
  await pagina.screenshot({ path: "/tmp/render/login-novo-03-entrar.png" });

  await pagina.fill("#email", "maria@email.com");
  await pagina.fill("#senha", "123456");
  await pagina.click('form button[type="submit"]');
  await pagina.waitForSelector("text=/Bom dia|Boa tarde|Boa noite/", { timeout: 15000 });
  await pularTour(pagina);
  await pagina.waitForTimeout(600);
  registrar("login por e-mail/senha pelo topo funciona", true);

  // 6. Painel esquerdo pós-login: marca da plataforma, condomínio no seletor
  const marcaPainel = pagina.locator('aside img[alt="Meu Condomínio"]').first();
  registrar("painel esquerdo mostra a marca Meu Condomínio", await marcaPainel.isVisible());
  const seletor = pagina.locator('aside [data-tour="seletor-condominio"]');
  const textoSeletor = (await seletor.innerText()).replace(/\s+/g, " ").trim();
  registrar(
    "condomínio identificado no seletor abaixo da marca",
    textoSeletor.includes("Parque California"),
    textoSeletor.slice(0, 60),
  );
  await pagina.screenshot({ path: "/tmp/render/login-novo-04-painel.png" });

  registrar("desktop sem erros de console", errosConsole.length === 0, errosConsole.join(" | ").slice(0, 140));
  await browser.close();
}

// ── Mobile 390×844 ───────────────────────────────────────────────
{
  const { browser, pagina, errosConsole } = await novoNavegador({ width: 390, height: 844 }, true);
  await pagina.goto(BASE, { waitUntil: "networkidle" });
  const botaoCadastro = pagina.locator('header button:has-text("Fazer cadastro")');
  const caixa = await botaoCadastro.boundingBox();
  registrar(
    "mobile: barra superior com cadastro alcançável",
    !!caixa && caixa.y < 90 && caixa.x + caixa.width <= 391,
    caixa ? JSON.stringify({ x: Math.round(caixa.x), y: Math.round(caixa.y), w: Math.round(caixa.width) }) : "sem caixa",
  );

  // Fazer cadastro: tela explicativa
  await botaoCadastro.click();
  registrar("mobile: tela de cadastro explica o fluxo", await pagina.locator("text=Cadastro aberto em breve").isVisible());
  await pagina.screenshot({ path: "/tmp/render/login-novo-05-mobile-cadastro.png" });

  // Fluxo completo: tipos → chip → portal
  await pagina.click('header button:has-text("Entrar")').catch(() => {});
  const voltarTipos = pagina.locator('button:has-text("Ver os tipos de usuário")');
  if (await voltarTipos.isVisible().catch(() => false)) await voltarTipos.click();
  await pagina.waitForSelector("text=Que tipo de usuário é você?", { timeout: 8000 });
  await pagina.click('button:has-text("Morador")');
  await pagina.waitForSelector('button:has-text("Maria — Morador (A-101)")', { timeout: 8000 });
  await pagina.click('button:has-text("Maria — Morador (A-101)")');
  await pagina.waitForSelector("text=/Bom dia|Boa tarde|Boa noite/", { timeout: 15000 });
  await pularTour(pagina);
  registrar("mobile: login completo pelo fluxo novo", true);
  await pagina.screenshot({ path: "/tmp/render/login-novo-06-mobile-painel.png" });

  registrar("mobile sem erros de console", errosConsole.length === 0, errosConsole.join(" | ").slice(0, 140));
  await browser.close();
}

console.log(`\n${passos - erros.length}/${passos} verificações OK`);
process.exit(erros.length ? 1 : 0);
