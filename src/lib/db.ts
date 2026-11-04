import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from '@prisma/client'

// No Vercel o filesystem é efêmero: copia o banco de demonstração (já semeado)
// do bundle para /tmp no primeiro acesso da instância.
function prepararBancoDemo() {
  const url = process.env.DATABASE_URL ?? "";
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

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.VERCEL ? [] : ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
