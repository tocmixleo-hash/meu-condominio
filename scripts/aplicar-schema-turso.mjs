/**
 * Aplica o schema Prisma (SQLite/libSQL) no banco Turso de produção.
 *
 * Usa `prisma migrate diff --from-empty --to-schema-datamodel` para gerar o
 * SQL e executa via @libsql/client — funciona com qualquer URL libsql
 * (Turso remoto ou arquivo local para validação).
 *
 * Variáveis: TURSO_DATABASE_URL (obrigatória), TURSO_AUTH_TOKEN (Turso remoto).
 * Uso: bun scripts/aplicar-schema-turso.mjs
 */
import { execSync } from "node:child_process";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("Defina TURSO_DATABASE_URL (ex.: libsql://seu-banco-usuario.turso.io)");
  process.exit(1);
}
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log("Gerando SQL do schema a partir de prisma/schema.prisma...");
const sql = execSync(
  "bunx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script",
  { encoding: "utf8", cwd: process.cwd() },
);

const cliente = createClient({ url, ...(authToken ? { authToken } : {}) });

console.log(`Aplicando schema em ${url.replace(/\/\/.*@/, "//***@")} ...`);
await cliente.executeMultiple(sql);

// Verificação simples: as tabelas essenciais existem?
const tabelas = await cliente.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'",
);
const nomes = tabelas.rows.map((r) => r.name);
const essenciais = ["Condominio", "Usuario", "UsuarioCondominio", "CondominioFoto", "Comunicado", "Reserva", "Encomenda", "Autorizacao", "Documento", "Assembleia", "Notificacao", "Auditoria", "Unidade"];
const faltando = essenciais.filter((t) => !nomes.includes(t));
if (faltando.length > 0) {
  console.error("FALHOU — tabelas ausentes:", faltando.join(", "));
  process.exit(1);
}
console.log(`Schema aplicado e verificado: ${nomes.length} tabelas (essenciais OK).`);
process.exit(0);
