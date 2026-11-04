/**
 * Migração INCREMENTAL e IDEMPOTENTE para o Turso de produção:
 * - Cria as tabelas novas (Ocorrencia, Manutencao, RegraReserva,
 *   RedefinicaoSenha, TentativaLogin) se ainda não existirem;
 * - Adiciona a coluna Autorizacao.codigo (QR de entrada) se faltar;
 * - NUNCA altera ou remove dados existentes.
 *
 * Uso: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... bun scripts/migrar-turso-fase2.mjs
 */
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("Defina TURSO_DATABASE_URL (e TURSO_AUTH_TOKEN para o Turso remoto).");
  process.exit(1);
}
const db = createClient({
  url,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});
const rows = async (q, a = []) => (await db.execute({ sql: q, args: a })).rows;

const TABELAS = {
  Ocorrencia: `CREATE TABLE IF NOT EXISTS "Ocorrencia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'OUTROS',
    "prioridade" TEXT NOT NULL DEFAULT 'NORMAL',
    "local" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "abertaPorId" TEXT NOT NULL,
    "resolucao" TEXT,
    "resolvidaEm" DATETIME,
    "atualizadaEm" DATETIME NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ocorrencia_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ocorrencia_abertaPorId_fkey" FOREIGN KEY ("abertaPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  Manutencao: `CREATE TABLE IF NOT EXISTS "Manutencao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "periodicidade" TEXT NOT NULL DEFAULT 'SEMESTRAL',
    "proximaData" TEXT NOT NULL,
    "ultimaData" TEXT,
    "responsavel" TEXT,
    "ativo" INTEGER NOT NULL DEFAULT 1,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Manutencao_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  RegraReserva: `CREATE TABLE IF NOT EXISTS "RegraReserva" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "espaco" TEXT NOT NULL,
    "antecedenciaMaxDias" INTEGER NOT NULL DEFAULT 60,
    "limiteMensalUnidade" INTEGER NOT NULL DEFAULT 2,
    "regrasTexto" TEXT,
    "ativo" INTEGER NOT NULL DEFAULT 1,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegraReserva_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  )`,
  RedefinicaoSenha: `CREATE TABLE IF NOT EXISTS "RedefinicaoSenha" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" DATETIME NOT NULL,
    "usadaEm" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RedefinicaoSenha_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  TentativaLogin: `CREATE TABLE IF NOT EXISTS "TentativaLogin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chave" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
};

const INDICES = [
  `CREATE UNIQUE INDEX IF NOT EXISTS "Ocorrencia_condominioId_status_criadoEm_idx" ON "Ocorrencia"("condominioId", "status", "criadoEm")`,
  `CREATE INDEX IF NOT EXISTS "Manutencao_condominioId_proximaData_idx" ON "Manutencao"("condominioId", "proximaData")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "RegraReserva_condominioId_espaco_key" ON "RegraReserva"("condominioId", "espaco")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "RedefinicaoSenha_tokenHash_key" ON "RedefinicaoSenha"("tokenHash")`,
  `CREATE INDEX IF NOT EXISTS "RedefinicaoSenha_usuarioId_idx" ON "RedefinicaoSenha"("usuarioId")`,
  `CREATE INDEX IF NOT EXISTS "TentativaLogin_chave_criadoEm_idx" ON "TentativaLogin"("chave", "criadoEm")`,
  // QR de entrada: um código por condomínio (NULL não entra no índice único)
  `CREATE UNIQUE INDEX IF NOT EXISTS "Autorizacao_condominioId_codigo_key" ON "Autorizacao"("condominioId", "codigo")`,
];

async function main() {
  for (const [nome, ddl] of Object.entries(TABELAS)) {
    await db.execute(ddl);
    console.log(`  ✓ tabela ${nome} garantida`);
  }
  // Coluna Autorizacao.codigo (idempotente)
  const cols = await rows(`PRAGMA table_info("Autorizacao")`);
  if (!cols.some((c) => c.name === "codigo")) {
    await db.execute(`ALTER TABLE "Autorizacao" ADD COLUMN "codigo" TEXT`);
    console.log("  ✓ coluna Autorizacao.codigo adicionada");
  } else {
    console.log("  • coluna Autorizacao.codigo já existia");
  }
  for (const ix of INDICES) await db.execute(ix);
  console.log(`  ✓ ${INDICES.length} índices garantidos`);

  const tabelas = await rows(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'",
  );
  const nomes = tabelas.map((r) => r.name);
  const faltando = Object.keys(TABELAS).filter((t) => !nomes.includes(t));
  if (faltando.length) {
    console.error("FALHOU — tabelas ausentes:", faltando.join(", "));
    process.exit(1);
  }
  console.log(`\nMigração concluída: ${nomes.length} tabelas no banco.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
