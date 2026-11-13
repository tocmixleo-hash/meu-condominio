/**
 * CODEMOD — Tema escuro: adiciona contrapartes `dark:` às cores fixas do
 * Tailwind usadas nos componentes (stone/red/green/emerald/amber + bg-white).
 *
 * Idempotente: cada regra só aplica se a contraparte dark: ainda não estiver
 * logo em seguida do token. Variantes com prefixo (hover:, focus:...) rodam
 * ANTES das simples, e as simples exigem que o token não venha após ':'.
 *
 * Uso: bun scripts/codemod-tema-escuro.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const RAIZES = ["src/components", "src/app"];

function arquivosTs(dir) {
  const saida = [];
  for (const nome of readdirSync(dir)) {
    if (nome === "node_modules" || nome.startsWith(".")) continue;
    const caminho = join(dir, nome);
    const st = statSync(caminho);
    if (st.isDirectory()) saida.push(...arquivosTs(caminho));
    else if (/\.tsx?$/.test(nome)) saida.push(caminho);
  }
  return saida;
}

// [regex, substituição] — ordem importa
const REGRAS = [
  // brancos de superfície
  [/(?<![:\w-])bg-white\/(\d+)\b(?!\s*dark:)/g, "bg-white/$1 dark:bg-stone-900/$1"],
  [/(?<![:\w-])bg-white\b(?!\/)(?!\s*dark:)/g, "bg-white dark:bg-stone-900"],
  // texto em pedra
  [/(?<![:\w-])text-stone-900\b(?!\s*dark:)/g, "text-stone-900 dark:text-stone-100"],
  [/(?<![:\w-])text-stone-800\b(?!\s*dark:)/g, "text-stone-800 dark:text-stone-100"],
  [/(?<![:\w-])text-stone-700\b(?!\s*dark:)/g, "text-stone-700 dark:text-stone-200"],
  [/(?<![:\w-])text-stone-600\b(?!\s*dark:)/g, "text-stone-600 dark:text-stone-400"],
  [/(?<![:\w-])text-stone-500\b(?!\s*dark:)/g, "text-stone-500 dark:text-stone-400"],
  [/(?<![:\w-])text-stone-400\b(?!\s*dark:)/g, "text-stone-400 dark:text-stone-500"],
  // bordas
  [/(?<![:\w-])border-stone-100\b(?!\s*dark:)/g, "border-stone-100 dark:border-stone-800"],
  [/(?<![:\w-])border-stone-200\b(?!\s*dark:)/g, "border-stone-200 dark:border-stone-800"],
  [/(?<![:\w-])border-stone-300\b(?!\s*dark:)/g, "border-stone-300 dark:border-stone-700"],
  [/(?<![:\w-])border-stone-400\b(?!\s*dark:)/g, "border-stone-400 dark:border-stone-600"],
  // preenchimentos suaves
  [/(?<![:\w-])bg-stone-50\/(\d+)\b(?!\s*dark:)/g, "bg-stone-50/$1 dark:bg-stone-900/$1"],
  [/(?<![:\w-])bg-stone-50\b(?!\/)(?!\s*dark:)/g, "bg-stone-50 dark:bg-stone-900/50"],
  [/(?<![:\w-])bg-stone-100\/(\d+)\b(?!\s*dark:)/g, "bg-stone-100/$1 dark:bg-stone-800/$1"],
  [/(?<![:\w-])bg-stone-100\b(?!\/)(?!\s*dark:)/g, "bg-stone-100 dark:bg-stone-800"],
  [/(?<![:\w-])bg-stone-200\b(?!\/)(?!\s*dark:)/g, "bg-stone-200 dark:bg-stone-700"],
  // anéis
  [/(?<![:\w-])ring-stone-400\/(\d+)\b(?!\s*dark:)/g, "ring-stone-400/$1 dark:ring-stone-500/$1"],
  [/(?<![:\w-])ring-stone-400\b(?!\/)(?!\s*dark:)/g, "ring-stone-400 dark:ring-stone-500"],
  // semânticas: vermelho (erro), verde (sucesso), âmbar (atenção)
  [/(?<![:\w-])hover:bg-red-50\b(?!\s*dark:)/g, "hover:bg-red-50 dark:hover:bg-red-950/40"],
  [/(?<![:\w-])bg-red-50\b(?!\s*dark:)/g, "bg-red-50 dark:bg-red-950/40"],
  [/(?<![:\w-])hover:text-red-700\b(?!\s*dark:)/g, "hover:text-red-700 dark:hover:text-red-300"],
  [/(?<![:\w-])text-red-700\b(?!\s*dark:)/g, "text-red-700 dark:text-red-300"],
  [/(?<![:\w-])text-red-600\b(?!\s*dark:)/g, "text-red-600 dark:text-red-400"],
  [/(?<![:\w-])bg-green-50\b(?!\s*dark:)/g, "bg-green-50 dark:bg-green-950/40"],
  [/(?<![:\w-])text-green-700\b(?!\s*dark:)/g, "text-green-700 dark:text-green-300"],
  [/(?<![:\w-])text-green-600\b(?!\s*dark:)/g, "text-green-600 dark:text-green-400"],
  [/(?<![:\w-])bg-emerald-50\b(?!\s*dark:)/g, "bg-emerald-50 dark:bg-emerald-950/40"],
  [/(?<![:\w-])text-emerald-800\b(?!\s*dark:)/g, "text-emerald-800 dark:text-emerald-300"],
  [/(?<![:\w-])text-emerald-700\b(?!\s*dark:)/g, "text-emerald-700 dark:text-emerald-300"],
  [/(?<![:\w-])bg-amber-50\b(?!\s*dark:)/g, "bg-amber-50 dark:bg-amber-950/40"],
  [/(?<![:\w-])text-amber-800\b(?!\s*dark:)/g, "text-amber-800 dark:text-amber-300"],
  [/(?<![:\w-])text-amber-700\b(?!\s*dark:)/g, "text-amber-700 dark:text-amber-300"],
  [/(?<![:\w-])bg-blue-50\b(?!\s*dark:)/g, "bg-blue-50 dark:bg-blue-950/40"],
  [/(?<![:\w-])text-blue-700\b(?!\s*dark:)/g, "text-blue-700 dark:text-blue-300"],
  [/(?<![:\w-])bg-sky-50\b(?!\s*dark:)/g, "bg-sky-50 dark:bg-sky-950/40"],
  [/(?<![:\w-])text-sky-700\b(?!\s*dark:)/g, "text-sky-700 dark:text-sky-300"],
];

let total = 0;
for (const raiz of RAIZES) {
  for (const arquivo of arquivosTs(raiz)) {
    const original = readFileSync(arquivo, "utf8");
    let atual = original;
    for (const [re, sub] of REGRAS) atual = atual.replace(re, sub);
    if (atual !== original) {
      writeFileSync(arquivo, atual);
      const n = original.length && atual.split("dark:").length - original.split("dark:").length;
      total += n;
      console.log(`${arquivo}: +${n} dark:`);
    }
  }
}
console.log(`\nTotal de variantes dark: adicionadas: ${total}`);
