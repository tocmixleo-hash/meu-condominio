/**
 * BACKUP do banco de produção (Turso): exporta TODAS as tabelas para um
 * arquivo JSON em backups/ com timestamp. Seguro para rodar a qualquer
 * momento (somente leitura) e não altera nada no banco.
 *
 * Uso:
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... bun scripts/backup-turso.mjs
 *   # ou para o banco demo local:
 *   bun scripts/backup-turso.mjs                    (sem TURSO_DATABASE_URL)
 *
 * Recomendação: agende diariamente (cron do seu computador, GitHub Actions
 * ou qualquer CI) e guarde ao menos 30 dias de histórico fora do servidor.
 */
import { createClient } from "@libsql/client";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const url = process.env.TURSO_DATABASE_URL ?? "file:db/custom.db";
const db = createClient({
  url,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});

const dir = join(process.cwd(), "backups");
mkdirSync(dir, { recursive: true });
const quando = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const destino = join(dir, `backup-${url.startsWith("file:") ? "demo" : "producao"}-${quando}.json`);

const tabelas = (
  await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name",
  )
).rows.map((r) => r.name);

const dump = { geradoEm: new Date().toISOString(), origem: url.replace(/\/\/.*@/, "//***@"), tabelas: {} };
for (const t of tabelas) {
  const r = await db.execute({ sql: `SELECT * FROM "${t}"`, args: [] });
  dump.tabelas[t] = r.rows;
  console.log(`  ${t}: ${r.rows.length} linha(s)`);
}

writeFileSync(destino, JSON.stringify(dump, null, 1));
console.log(`\nBackup completo: ${destino} (${tabelas.length} tabelas).`);
