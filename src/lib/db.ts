import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { garantirSchema } from "@/lib/garantia-schema";

// ── Modo duplo de banco de dados ──────────────────────────────────
//
// 1. Turso (libSQL) em produção: quando TURSO_DATABASE_URL está definida,
//    o client usa o driver adapter libSQL apontando para o banco remoto
//    (persistente, compartilhado entre instâncias da Vercel).
// 2. Arquivo SQLite (desenvolvimento / demonstração): comportamento
//    anterior preservado — no Vercel sem Turso, o banco de demonstração
//    (já semeado) é copiado do bundle para /tmp no primeiro acesso.

function clienteLibSQL() {
  return new PrismaLibSQL({
    url: process.env.TURSO_DATABASE_URL as string,
    ...(process.env.TURSO_AUTH_TOKEN
      ? { authToken: process.env.TURSO_AUTH_TOKEN as string }
      : {}),
  });
}

// Fallback de demonstração: copia db/custom.db para /tmp (Vercel efêmero).
function prepararBancoDemo() {
  const url = process.env.DATABASE_URL ?? "";
  if (process.env.TURSO_DATABASE_URL) return; // Turso ativo — nada a copiar
  if (!process.env.VERCEL || !url.startsWith("file:/tmp/")) return;
  const destino = url.slice("file:".length);
  if (fs.existsSync(destino)) return;
  const origem = path.join(process.cwd(), "db", "custom.db");
  if (!fs.existsSync(origem)) return;
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(origem, destino);
}
prepararBancoDemo();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const base =
  globalForPrisma.prisma ??
  (process.env.TURSO_DATABASE_URL
    ? new PrismaClient({ adapter: clienteLibSQL(), log: process.env.VERCEL ? [] : ['query'] })
    : new PrismaClient({ log: process.env.VERCEL ? [] : ['query'] }))

// Client cru, SEM o guardião — usado pelo próprio guardião (garantia-schema)
// para inspecionar e corrigir o schema sem se recursar.
export const dbBase: PrismaClient = base;

// Client público: toda consulta espera o guardião de schema primeiro
// (memoizado — depois da primeira verificação é apenas uma promise
// resolvida). Assim qualquer módulo/coluna nova (ex.: Cadastros) cria o
// que falta no banco remoto antes da primeira consulta que o usaria, em
// qualquer rota — o guardião antes vivia só nas rotas de campanhas e as
// demais APIs ficavam 500 quando o schema do Turso ficava para trás.
export const db = base.$extends({
  query: {
    $allOperations({ args, query }) {
      return (garantirSchema() as Promise<void>).then(() => query(args as never));
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = base
