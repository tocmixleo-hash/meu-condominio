import { db } from "@/lib/db";

// ── Garantia idempotente da tabela de campanhas ───────────────────
// O modelo Campanha entrou no schema DEPOIS da última migração aplicada
// ao banco de produção (Turso). Sem uma garantia em runtime, a consulta
// falha com "tabela não existe" (API 500) e o painel esconde as campanhas
// em silêncio. Esta rotina aplica o mesmo DDL emitido pelo `prisma db push`
// quando a tabela ou o índice faltam:
// • idempotente (CREATE … IF NOT EXISTS) — seguro no SQLite local e no Turso;
// • roda no máximo uma vez por instância (promessa memoizada);
// • em falha transiente, libera a memoização para tentar no próximo acesso.

let garantia: Promise<void> | null = null;

const DDL_CAMPANHA = [
  `CREATE TABLE IF NOT EXISTS "Campanha" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominioId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria" TEXT NOT NULL DEFAULT 'CONVIVENCIA',
    "emoji" TEXT NOT NULL DEFAULT '📣',
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "inicioEm" DATETIME,
    "fimEm" DATETIME,
    "autorId" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Campanha_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Campanha_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "Campanha_condominioId_ativa_ordem_idx"
     ON "Campanha"("condominioId", "ativa", "ordem")`,
];

export function garantirTabelaCampanha(): Promise<void> {
  garantia ??= (async () => {
    try {
      for (const comando of DDL_CAMPANHA) {
        await db.$executeRawUnsafe(comando);
      }
    } catch (erro) {
      garantia = null; // falha transiente: tenta de novo na próxima requisição
      throw erro;
    }
  })();
  return garantia;
}
