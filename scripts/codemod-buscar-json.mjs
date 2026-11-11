/**
 * Codemod one-shot: troca o padrão silencioso de fetch do portal pelo
 * helper buscarJSON (com log de erro). Padrão coberto — declaração inteira:
 *
 *   fetch(URL)
 *     .then(async (r) => (r.ok ? r.json() : null))
 *     .then(CONSUMIDOR)          // inclusive multilinha
 *     .catch(() => null);
 *
 * vira:
 *
 *   buscarJSON(URL)
 *     .then(CONSUMIDOR);
 *
 * Casos fora do padrão (ex.: .catch(() => setLista([])) em auditoria.tsx)
 * são deixados para edição manual. Adiciona o import se faltar.
 * Uso: bun scripts/codemod-buscar-json.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "src/components/portal";
const PADRAO =
  /fetch\((.+)\)\n(\s*)\.then\(async \(r\) => \(r\.ok \? r\.json\(\) : null\)\)\n\s*\.then\(([\s\S]*?)\)\n\s*\.catch\(\(\) => null\);/g;

let total = 0;
for (const arquivo of readdirSync(dir).filter((f) => f.endsWith(".tsx"))) {
  const caminho = join(dir, arquivo);
  let conteudo = readFileSync(caminho, "utf8");
  const antes = conteudo;

  conteudo = conteudo.replace(PADRAO, (_m, url, indent, consumidor) => {
    total += 1;
    return `buscarJSON(${url})\n${indent}.then(${consumidor})`;
  });

  if (conteudo !== antes && !conteudo.includes('from "@/lib/buscar-json"')) {
    // insere o import após a última linha de import existente
    const linhas = conteudo.split("\n");
    let ultima = 0;
    linhas.forEach((l, i) => {
      if (/^import[\s{]/.test(l) || /^import .+ from/.test(l)) ultima = i;
    });
    linhas.splice(ultima + 1, 0, 'import { buscarJSON } from "@/lib/buscar-json";');
    conteudo = linhas.join("\n");
  }

  if (conteudo !== antes) {
    writeFileSync(caminho, conteudo);
    console.log(`✓ ${arquivo}`);
  }
}
console.log(`Total de fetches convertidos: ${total}`);
