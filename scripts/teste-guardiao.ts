/**
 * Teste do guardião de schema: aponta para um banco de teste com tabelas
 * removidas e verifica que garantirSchema() recria exatamente as faltantes.
 * Uso: DATABASE_URL=file:/tmp/test-guard.db bun scripts/teste-guardiao.ts
 */
import { garantirSchema } from "../src/lib/garantia-schema";
import { createClient } from "@libsql/client";

const db = createClient({ url: process.env.DATABASE_URL ?? "file:/tmp/test-guard.db" });
const tabelas = async () =>
  (
    await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
  ).rows.map((r) => String(r.name));

const antes = await tabelas();
console.log(`antes: ${antes.length} tabelas (Campanha presente? ${antes.includes("Campanha")}, Auditoria? ${antes.includes("Auditoria")})`);

await garantirSchema();
const depois = await tabelas();
console.log(`depois: ${depois.length} tabelas (Campanha? ${depois.includes("Campanha")}, Auditoria? ${depois.includes("Auditoria")})`);

// idempotência: segunda chamada não deve criar/recriar nada
await garantirSchema();
const deNovo = await tabelas();
console.log(`idempotente: ${deNovo.length === depois.length && deNovo.every((t) => depois.includes(t)) ? "OK" : "FALHOU"}`);

const criadas = depois.filter((t) => !antes.includes(t));
console.log(`recriadas: ${criadas.sort().join(", ")}`);
