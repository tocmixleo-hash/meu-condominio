import { db } from "@/lib/db";
import { DDL_POR_TABELA } from "@/lib/garantia-schema-ddl";

// ── Guardião de schema (idempotente) ──────────────────────────────
// Confronta as tabelas existentes no banco com o DDL gerado do
// schema.prisma e cria as que faltarem (ex.: módulo novo publicado
// antes da migração manual do Turso — a causa do 500 das campanhas).
// • Idempotente: só cria o que NÃO existe; seguro em SQLite e Turso.
// • Memoizado: uma verificação por instância; em falha transiente,
//   libera a memoização para tentar no próximo acesso.
// Nota: o guardião cobre tabelas/índices ausentes — não altera tabelas
// antigas com colunas faltantes (para isso servem os scripts migrar-turso-*).

let garantia: Promise<void> | null = null;

export function garantirSchema(): Promise<void> {
  garantia ??= (async () => {
    const linhas = (await db.$queryRawUnsafe<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
    )) as { name: string }[];
    const existentes = new Set((linhas ?? []).map((l) => l.name));
    const faltantes = Object.keys(DDL_POR_TABELA).filter((t) => !existentes.has(t));

    for (const tabela of faltantes) {
      for (const comando of DDL_POR_TABELA[tabela]) {
        await db.$executeRawUnsafe(comando);
      }
    }
    if (faltantes.length) {
      console.log(`[schema] tabelas criadas agora: ${faltantes.join(", ")}`);
    }
  })();
  return garantia.catch((erro) => {
    garantia = null; // falha transiente: tenta de novo na próxima requisição
    throw erro;
  });
}
