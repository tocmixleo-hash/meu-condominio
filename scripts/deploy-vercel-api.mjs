/**
 * Deploy de PRODUÇÃO pela API da Vercel SEM GitHub e sem CLI:
 * envia os arquivos do repositório (git ls-files) inline em
 * POST /v13/deployments — útil quando o token do GitHub não está
 * disponível na sessão. O projeto já tem as variáveis de ambiente
 * (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, SEGREDO_SESSAO) na Vercel.
 *
 * Uso: VERCEL_TOKEN=... bun scripts/deploy-vercel-api.mjs
 *      (opcional: VERCEL_PROJECT_ID=prj_... VERCEL_TEAM_ID=team_...)
 */
import { execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const token = process.env.VERCEL_TOKEN;
if (!token) {
  console.error("Defina VERCEL_TOKEN.");
  process.exit(1);
}
const projectId = process.env.VERCEL_PROJECT_ID ?? "prj_oluYM8tV1mPcqRJ1nFDhw20gMgVT";
const teamQs = process.env.VERCEL_TEAM_ID ? `&teamId=${process.env.VERCEL_TEAM_ID}` : "";

const arquivos = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((f) => statSync(join(process.cwd(), f)).isFile());

console.log(`Enviando ${arquivos.length} arquivo(s)...`);
const files = arquivos.map((f) => ({
  file: f,
  data: readFileSync(join(process.cwd(), f), "base64"),
  encoding: "base64",
}));
const totalKB = Math.round(files.reduce((n, f) => n + (f.data.length * 3) / 4, 0) / 1024);
console.log(`Tamanho total: ~${totalKB} KB`);

const r = await fetch(`https://api.vercel.com/v13/deployments?skipAutoDetectionConfirmation=1${teamQs}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "meu-condominio",
    project: projectId,
    target: "production",
    files,
    projectSettings: { framework: "nextjs", buildCommand: null, devCommand: null, installCommand: null },
  }),
});
const criado = await r.json();
if (!r.ok) {
  console.error("Falha ao criar deployment:", JSON.stringify(criado).slice(0, 600));
  process.exit(1);
}
console.log(`Deployment criado: ${criado.id} (${criado.url})`);

const inicio = Date.now();
while (Date.now() - inicio < 10 * 60 * 1000) {
  await new Promise((r2) => setTimeout(r2, 10_000));
  const d = await (await fetch(`https://api.vercel.com/v13/deployments/${criado.id}${teamQs}`, {
    headers: { Authorization: `Bearer ${token}` },
  })).json();
  console.log(`  ${((Date.now() - inicio) / 1000).toFixed(0)}s → ${d.readyState}`);
  if (d.readyState === "READY") {
    console.log(`\nPRONTO: https://${d.url}  (produção: https://parque-california.vercel.app)`);
    process.exit(0);
  }
  if (["ERROR", "CANCELED"].includes(d.readyState)) {
    console.error("Deployment falhou:", JSON.stringify(d).slice(0, 1200));
    process.exit(1);
  }
}
console.error("Tempo esgotado aguardando o deployment.");
process.exit(1);
