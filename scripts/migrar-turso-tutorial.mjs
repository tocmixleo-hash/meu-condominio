/**
 * Migração incremental: coluna Usuario.tutorialVisto (mini tutorial do
 * primeiro acesso). Idempotente — verifica PRAGMA antes do ALTER e não
 * altera nenhum dado existente (todos os usuários começam com false e
 * verão o tutorial uma única vez no próximo acesso).
 *
 * Variáveis: TURSO_DATABASE_URL (obrigatória), TURSO_AUTH_TOKEN (remoto).
 * Funciona também em arquivo local (file:./db/custom.db) para o demo.
 * Uso: bun scripts/migrar-turso-tutorial.mjs
 */
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("Defina TURSO_DATABASE_URL (libsql://… ou file:./db/custom.db)");
  process.exit(1);
}
const authToken = process.env.TURSO_AUTH_TOKEN;

const cliente = createClient({ url, ...(authToken ? { authToken } : {}) });
console.log(`Aplicando migração do tutorial em ${url.replace(/\/\/.*@/, "//***@")} …`);

const info = await cliente.execute('PRAGMA table_info("Usuario")');
const colunas = info.rows.map((r) => r.name);
if (colunas.includes("tutorialVisto")) {
  console.log("Coluna tutorialVisto já existe — nada a fazer.");
  process.exit(0);
}

await cliente.executeMultiple(
  'ALTER TABLE "Usuario" ADD COLUMN "tutorialVisto" BOOLEAN NOT NULL DEFAULT false;',
);

const verificacao = await cliente.execute('PRAGMA table_info("Usuario")');
const depois = verificacao.rows.map((r) => r.name);
if (!depois.includes("tutorialVisto")) {
  console.error("FALHOU — coluna não encontrada após o ALTER.");
  process.exit(1);
}
const total = await cliente.execute("SELECT COUNT(*) AS n FROM Usuario");
console.log(
  `OK — tutorialVisto adicionada a Usuario (${total.rows[0].n} usuários preservados, todos com tutorialVisto = false).`,
);
process.exit(0);
