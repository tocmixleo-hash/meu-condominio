// Simula o Chrome Android com "Force dark" ativo (sistema em modo escuro).
// Com color-scheme: light declarado, o Chromium não deve aplicar o
// algoritmo de escurecimento na página.
import { chromium } from "playwright-core";
import { mkdirSync } from "fs";

const BASE = process.env.BASE || "http://localhost:3000";
const CHROME = "/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome";
const OUT = "/tmp/render";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ["--no-sandbox", "--force-dark-mode", "--enable-features=WebContentsForceDark"],
});
const p = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  colorScheme: "dark",
});
await p.goto(BASE, { waitUntil: "networkidle" });
await p.waitForTimeout(800);

// Amostra a cor de fundo de um botão de tipo e do cartão branco
const cores = await p.evaluate(() => {
  const cartao = document.querySelector(".rounded-2xl.bg-white");
  const tipo = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Morador"));
  const cond = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Selecionado"));
  const bg = (el) => (el ? getComputedStyle(el).backgroundColor : null);
  return { cartao: bg(cartao), tipo: bg(tipo), condominio: bg(cond) };
});
console.log("force-dark:", JSON.stringify(cores));
await p.screenshot({ path: `${OUT}/fix-login-forcedark-flag.png`, fullPage: true });

const branco = (c) => c === "rgb(255, 255, 255)";
console.log(
  cores.cartao === "rgb(255, 255, 255)" && cores.tipo === "rgb(255, 255, 255)"
    ? "OK: UI permanece clara com force-dark ativo"
    : "ATENÇÃO: cores alteradas pelo force-dark",
);
await browser.close();
