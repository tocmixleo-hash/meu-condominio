import { db } from "@/lib/db";
import { DDL_POR_TABELA } from "@/lib/garantia-schema-ddl";

// ── Guardião de schema (idempotente) ──────────────────────────────
// Confronta as tabelas existentes no banco com o DDL gerado do
// schema.prisma e cria as que faltarem (ex.: módulo novo publicado
// antes da migração manual do Turso — a causa do 500 das campanhas).
// • Idempotente: só cria o que NÃO existe; seguro em SQLite e Turso.
// • Memoizado: uma verificação por instância; em falha transiente,
//   libera a memoização para tentar no próximo acesso.
// Nota: o guardião cobre tabelas/índices ausentes e colunas novas listadas
// em COLUNAS_NOVAS — não migra dados nem reestrutura colunas antigas (para
// isso servem os scripts migrar-turso-*).

let garantia: Promise<void> | null = null;

// Colunas acrescentadas ao schema DEPOIS de as tabelas já existirem no
// banco de produção: CREATE IF NOT EXISTS não adiciona colunas em tabelas
// antigas, então o guardião confronta o PRAGMA e aplica o ALTER que faltar.
const COLUNAS_NOVAS: [tabela: string, definicao: string][] = [
  ["Campanha", "destino TEXT"], // módulo do portal aberto ao clicar no banner
];

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

    for (const [tabela, definicao] of COLUNAS_NOVAS) {
      if (!existentes.has(tabela)) continue; // criada acima já com a coluna
      const infos = (await db.$queryRawUnsafe<{ name: string }[]>(
        `PRAGMA table_info("${tabela}")`,
      )) as { name: string }[];
      const nomeColuna = definicao.split(/\s+/)[0];
      if (infos.some((info) => info.name === nomeColuna)) continue;
      await db.$executeRawUnsafe(`ALTER TABLE "${tabela}" ADD COLUMN ${definicao}`);
      console.log(`[schema] coluna acrescentada: ${tabela}.${nomeColuna}`);
    }
  })();
  return garantia.catch((erro) => {
    garantia = null; // falha transiente: tenta de novo na próxima requisição
    throw erro;
  });
}
