/**
 * Semeia as REGRAS DE RESERVA dos espaços comuns (conteúdo institucional do
 * condomínio — não é dado de teste). Restaura as regras apagadas pela
 * limpeza de artefatos de teste e completa os espaços que nunca tiveram
 * regra cadastrada.
 *
 * IDEMPOTENTE por chave natural (condomínio + espaço). Nunca altera nem
 * apaga registros existentes — só insere o que falta.
 *
 * Uso: bun scripts/semear-regras-demo.mjs
 *      TURSO_... bun scripts/semear-regras-demo.mjs --producao
 */
import { createClient } from "@libsql/client";

const producao = process.argv.includes("--producao");
const url = producao ? process.env.TURSO_DATABASE_URL : "file:db/custom.db";
if (producao && !url) {
  console.error("Com --producao, defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.");
  process.exit(1);
}
const db = createClient({
  url,
  ...(producao && process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});

// Valores por espaço: [antecedenciaMaxDias, limiteMensalUnidade, regrasTexto]
// QUADRA reproduz exatamente a regra original do ambiente de demonstração.
const REGRAS = [
  [
    "SALAO_FESTAS",
    30,
    2,
    "Taxa de limpeza de R$ 120,00, paga na portaria antes do uso. Funciona das 10h às 23h — o evento deve terminar até esse horário. Retire o lixo, limpe as mesas e devolva os móveis à posição original.",
  ],
  [
    "CHURRASQUEIRA",
    30,
    2,
    "Horário das 10h às 22h. Leve seu próprio carvão e utensílios; limpe a grelha e a bancada após o uso e descarte o lixo nos coletores corretos.",
  ],
  ["QUADRA", 60, 2, null],
  [
    "PISCINA",
    15,
    2,
    "Uso das 8h às 21h, com traje de banho adequado. Não é permitido vidro, som alto ou alimentos na borda da piscina. Crianças sempre acompanhadas de um adulto responsável.",
  ],
];

function cuid() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

async function main() {
  const condominios = (await db.execute("SELECT id, nome, slug FROM Condominio")).rows;
  let criadas = 0;
  let puladas = 0;

  for (const condominio of condominios) {
    for (const [espaco, antecedenciaMaxDias, limiteMensalUnidade, regrasTexto] of REGRAS) {
      const existente = (
        await db.execute({
          sql: "SELECT id FROM RegraReserva WHERE condominioId = ? AND espaco = ?",
          args: [condominio.id, espaco],
        })
      ).rows[0];
      if (existente) {
        puladas += 1;
        continue;
      }
      await db.execute({
        sql: `INSERT INTO RegraReserva (id, condominioId, espaco, antecedenciaMaxDias, limiteMensalUnidade, regrasTexto, ativo, criadoEm)
              VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        args: [
          cuid(),
          condominio.id,
          espaco,
          antecedenciaMaxDias,
          limiteMensalUnidade,
          regrasTexto,
          new Date().toISOString(),
        ],
      });
      criadas += 1;
      console.log(`✓ ${condominio.nome}: regra de ${espaco} (antecedência ${antecedenciaMaxDias}d, ${limiteMensalUnidade}/mês)`);
    }
  }
  console.log(`Regras prontas — criadas: ${criadas}, já existentes: ${puladas}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
