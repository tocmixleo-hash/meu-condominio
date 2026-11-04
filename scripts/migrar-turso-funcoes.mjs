/**
 * Migração INCREMENTAL e idempotente: tabela Funcao + coluna funcaoId no
 * vínculo (UsuarioCondominio). Não altera nem apaga nenhum dado existente.
 *
 * Uso: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... bun scripts/migrar-turso-funcoes.mjs
 */
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("Defina TURSO_DATABASE_URL (e TURSO_AUTH_TOKEN para o Turso remoto).");
  process.exit(1);
}
const cliente = createClient({
  url,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});

// 1. Tabela Funcao
await cliente.executeMultiple(`
  CREATE TABLE IF NOT EXISTS "Funcao" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "condominioId" TEXT NOT NULL,
      "nome" TEXT NOT NULL,
      "descricao" TEXT,
      "permissoes" TEXT NOT NULL DEFAULT '[]',
      "ativo" BOOLEAN NOT NULL DEFAULT true,
      "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  );
`);
console.log("✓ Tabela Funcao garantida");

// 2. Índices da Funcao
await cliente.executeMultiple(`
  CREATE UNIQUE INDEX IF NOT EXISTS "Funcao_condominioId_nome_key" ON "Funcao"("condominioId","nome");
  CREATE INDEX IF NOT EXISTS "Funcao_condominioId_idx" ON "Funcao"("condominioId");
`);
console.log("✓ Índices da Funcao garantidos");

// 3. Coluna funcaoId no vínculo (só adiciona se não existir)
const colunas = await cliente.execute("PRAGMA table_info(UsuarioCondominio)");
const temFuncaoId = colunas.rows.some((c) => c.name === "funcaoId");
if (!temFuncaoId) {
  await cliente.executeMultiple(`ALTER TABLE "UsuarioCondominio" ADD COLUMN "funcaoId" TEXT;`);
  console.log("✓ Coluna UsuarioCondominio.funcaoId adicionada");
} else {
  console.log("✓ Coluna UsuarioCondominio.funcaoId já existia");
}

// 4. Índice do vínculo por função (sem FK na coluna adicionada — integridade
//    garantida pela aplicação, padrão aceito para ALTER em SQLite)
await cliente.executeMultiple(`
  CREATE INDEX IF NOT EXISTS "UsuarioCondominio_funcaoId_idx" ON "UsuarioCondominio"("funcaoId");
`);
console.log("✓ Índice UsuarioCondominio.funcaoId garantido");

// Verificação
const tabelas = await cliente.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('Funcao','UsuarioCondominio')",
);
const cols = await cliente.execute("PRAGMA table_info(UsuarioCondominio)");
const tem = cols.rows.some((c) => c.name === "funcaoId");
console.log(`Verificação final: tabelas=${tabelas.rows.map((r) => r.name).join(",")} | funcaoId=${tem ? "OK" : "FALTA"}`);
if (tabelas.rows.length === 2 && tem) {
  console.log("Migração concluída — nenhum dado foi alterado.");
} else {
  console.error("MIGRAÇÃO INCOMPLETA");
  process.exit(1);
}
