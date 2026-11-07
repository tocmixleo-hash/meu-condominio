/**
 * Semeia os documentos oficiais (Regimento Interno e Convenção) nos dois
 * condomínios, apontando para os PDFs estáticos de /public/docs/ — que
 * viajam com o build e sobrevivem a deploys mesmo sem Vercel Blob.
 *
 * Uso:
 *   bun scripts/semear-documentos.mjs                  (banco demo local)
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... bun scripts/semear-documentos.mjs
 *
 * IDEMPOTENTE: atualiza os registros se já existirem.
 */
import { createClient } from "@libsql/client";
import { statSync } from "node:fs";
import { join } from "node:path";

const url = process.env.TURSO_DATABASE_URL ?? "file:db/custom.db";
const db = createClient({
  url,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});

const DOCUMENTOS = [
  {
    slug: "parque-california",
    titulo: "Regimento Interno",
    categoria: "REGIMENTO",
    arquivo: "regimento-interno-parque-california.pdf",
  },
  {
    slug: "parque-california",
    titulo: "Convenção Condominial",
    categoria: "CONVENCAO",
    arquivo: "convencao-condominial-parque-california.pdf",
  },
  {
    slug: "parque-florida",
    titulo: "Regimento Interno",
    categoria: "REGIMENTO",
    arquivo: "regimento-interno-parque-florida.pdf",
  },
  {
    slug: "parque-florida",
    titulo: "Convenção Condominial",
    categoria: "CONVENCAO",
    arquivo: "convencao-condominial-parque-florida.pdf",
  },
];

function cuid() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

const condominios = await db.execute("SELECT id, slug, nome FROM Condominio");

for (const doc of DOCUMENTOS) {
  const condo = condominios.rows.find((c) => (c.slug ?? "").includes(doc.slug.replace("parque-", "")));
  if (!condo) {
    console.error(`  ✗ condomínio ausente para ${doc.slug}`);
    continue;
  }
  const sindico = await db.execute({
    sql: "SELECT id FROM Usuario WHERE condominioId = ? AND perfil = 'SINDICO' LIMIT 1",
    args: [condo.id],
  });
  const enviadoPorId = sindico.rows[0]?.id;
  if (!enviadoPorId) {
    console.error(`  ✗ síndico ausente em ${condo.nome}`);
    continue;
  }
  const caminho = join(process.cwd(), "public", "docs", doc.arquivo);
  const tamanho = statSync(caminho).size;
  const urlRelativa = `/docs/${doc.arquivo}`;

  const existente = await db.execute({
    sql: "SELECT id FROM Documento WHERE condominioId = ? AND nomeArquivo = ?",
    args: [condo.id, doc.arquivo],
  });
  if (existente.rows.length > 0) {
    await db.execute({
      sql: "UPDATE Documento SET titulo = ?, categoria = ?, url = ?, tamanhoBytes = ? WHERE id = ?",
      args: [doc.titulo, doc.categoria, urlRelativa, tamanho, existente.rows[0].id],
    });
    console.log(`  ✓ atualizado: ${doc.titulo} — ${condo.nome}`);
  } else {
    await db.execute({
      sql: "INSERT INTO Documento (id, condominioId, titulo, categoria, nomeArquivo, url, tamanhoBytes, enviadoPorId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [cuid(), condo.id, doc.titulo, doc.categoria, doc.arquivo, urlRelativa, tamanho, enviadoPorId],
    });
    console.log(`  ✓ criado: ${doc.titulo} — ${condo.nome} (${Math.round(tamanho / 1024)} KB)`);
  }
}
console.log("Concluído.");
