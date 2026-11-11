/**
 * Gera src/lib/garantia-schema-ddl.ts a partir do banco de referência
 * (db/custom.db, criado pelo `prisma db push`): mapa tabela → DDL completo
 * (CREATE TABLE + índices). O guardião em runtime cria as tabelas que
 * faltarem no banco de produção — fim da classe de incidente
 * "deploy novo + Turso antigo".
 *
 * Regenerar após mudar o schema.prisma:
 *   bun prisma db push  (local)  →  bun scripts/gerar-ddl-garantia.mjs
 */
import { createClient } from "@libsql/client";
import { writeFileSync } from "node:fs";

const db = createClient({ url: "file:db/custom.db" });
const r = await db.execute(
  "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY name",
);

const tabelas = []; // [nome, createTable]
const indices = {}; // nomeTabela → [createIndex]
const outros = [];

for (const row of r.rows) {
  const tipo = String(row.type);
  const nome = String(row.name);
  const tbl = String(row.tbl_name);
  const sql = String(row.sql);
  if (tipo === "table" && !nome.startsWith("_cf_")) {
    tabelas.push([nome, sql]);
  } else if (tipo === "index") {
    (indices[tbl] ??= []).push(sql);
  } else {
    outros.push(`${tipo} ${nome}`);
  }
}
tabelas.sort((a, b) => a[0].localeCompare(b[0]));

if (outros.length) console.warn(`⚠ Ignorado (views/triggers?): ${outros.join(", ")}`);

let saida = `// GERADO POR scripts/gerar-ddl-garantia.mjs — não editar à mão.
// Espelha o DDL do schema.prisma conforme emitido pelo \`prisma db push\`
// (referência: db/custom.db). O guardião (garantia-schema.ts) cria no banco
// de produção qualquer tabela/índice que esteja faltando.

export const DDL_POR_TABELA: Record<string, string[]> = {
`;

for (const [nome, create] of tabelas) {
  const blocos = [create, ...(indices[nome] ?? [])].map((s) => s.trim());
  saida += `  ${JSON.stringify(nome)}: [\n`;
  for (const b of blocos) {
    saida += `    \`\n${b}\`,\n`;
  }
  saida += `  ],\n`;
}
saida += `};\n`;

writeFileSync("src/lib/garantia-schema-ddl.ts", saida);
console.log(`✓ garantia-schema-ddl.ts gerado — ${tabelas.length} tabelas, ${Object.values(indices).flat().length} índices.`);
