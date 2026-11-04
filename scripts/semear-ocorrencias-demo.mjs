/**
 * Semeia ocorrências e manutenções preventivas de DEMONSTRAÇÃO:
 * - padrão: banco demo local (db/custom.db) — para desenvolvimento e testes;
 * - com --producao: banco Turso (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN).
 *
 * IDEMPOTENTE por chave natural (condomínio + título). Nunca altera nem
 * apaga registros existentes; o administrador da plataforma não é tocado.
 *
 * Uso: bun scripts/semear-ocorrencias-demo.mjs [--producao]
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
const sql = async (q, a = []) => (await db.execute({ sql: q, args: a })).rows;

function cuid() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
const dia = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

// Elenco por slug (e-mails iguais no demo e na produção)
const MORADORES = {
  california: { m1: "maria@email.com", m2: "pedro@email.com", m3: "juliana@email.com" },
  florida: { m1: "helena@email.com", m2: "tiago@email.com", m3: "camila@email.com" },
};

const OCORRENCIAS = [
  {
    titulo: "Elevador social do Bloco A parando entre andares",
    categoria: "ELEVADOR",
    prioridade: "URGENTE",
    status: "ABERTA",
    local: "Bloco A",
    quem: "m1",
    descricao:
      "O elevador social dá um solavanco ao parar no 3º andar e às vezes não alinha com o piso. Moradores idosos têm medo de usar.",
  },
  {
    titulo: "Luz queimada na garagem G1",
    categoria: "ELETRICA",
    prioridade: "NORMAL",
    status: "EM_ATENDIMENTO",
    local: "Garagem G1 — vagas 12 a 18",
    quem: "m2",
    descricao: "Três luminárias estão queimadas perto das vagas 12 a 18. A área fica muito escura à noite.",
  },
  {
    titulo: "Calha entupida inundando a varanda do bloco B",
    categoria: "HIDRAULICA",
    prioridade: "ALTA",
    status: "RESOLVIDA",
    local: "Bloco B — cobertura",
    quem: "m3",
    descricao: "Com a chuva de sábado a calha transbordou e molhou a varanda do 4º andar.",
    resolucao: "Equipe de manutenção limpou a calha e instalou tela anti-folhas no mesmo dia.",
  },
];

const MANUTENCOES = [
  {
    titulo: "Vistoria mensal dos elevadores",
    descricao: "Checklist de segurança e lubrificação com empresa certificada.",
    periodicidade: "MENSAL",
    proximaData: dia(3),
    ultimaData: dia(-27),
    responsavel: "Elevadores Sul Ltda.",
  },
  {
    titulo: "Teste do sistema de combate a incêndio",
    descricao: "Acionamento das bombas, mangueiras e alarmes por andar.",
    periodicidade: "SEMESTRAL",
    proximaData: dia(-5),
    ultimaData: dia(-188),
    responsavel: "Fogo Zero Engenharia",
  },
  {
    titulo: "Limpeza e análise da caixa d'água",
    descricao: "Limpeza certificada com análise bacteriológica da água.",
    periodicidade: "SEMESTRAL",
    proximaData: dia(40),
    ultimaData: dia(-143),
    responsavel: "Água Clara Saneamento",
  },
];

async function main() {
  const condos = Object.fromEntries((await sql("SELECT id, slug FROM Condominio")).map((r) => [r.slug, r.id]));
  for (const slug of Object.keys(MORADORES)) {
    if (!condos[slug]) {
      console.error(`✗ Condomínio "${slug}" não encontrado — abortando.`);
      process.exit(1);
    }
  }
  let inseridos = 0;

  for (const [slug, condoId] of Object.entries(condos)) {
    if (!MORADORES[slug]) continue;
    const usuarios = Object.fromEntries(
      (await sql("SELECT id, email FROM Usuario WHERE condominioId = ?", [condoId])).map((r) => [r.email, r.id]),
    );

    for (const o of OCORRENCIAS) {
      const existe = await sql("SELECT id FROM Ocorrencia WHERE condominioId = ? AND titulo = ? LIMIT 1", [condoId, o.titulo]);
      if (existe.length > 0) continue;
      const abertaPorId = usuarios[MORADORES[slug][o.quem]];
      if (!abertaPorId) continue;
      await db.execute({
        sql: `INSERT INTO Ocorrencia (id, condominioId, titulo, descricao, categoria, prioridade, local, status, abertaPorId, resolucao, resolvidaEm, atualizadaEm, criadoEm)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          cuid(), condoId, o.titulo, o.descricao, o.categoria, o.prioridade, o.local, o.status, abertaPorId,
          o.resolucao ?? null,
          o.status === "RESOLVIDA" ? new Date(Date.now() - 2 * 86_400_000) : null,
          new Date(Date.now() - 3 * 86_400_000),
          new Date(Date.now() - 3 * 86_400_000),
        ],
      });
      console.log(`  + Ocorrência [${slug}]: ${o.titulo} (${o.status})`);
      inseridos++;
    }

    for (const m of MANUTENCOES) {
      const existe = await sql("SELECT id FROM Manutencao WHERE condominioId = ? AND titulo = ? LIMIT 1", [condoId, m.titulo]);
      if (existe.length > 0) continue;
      await db.execute({
        sql: `INSERT INTO Manutencao (id, condominioId, titulo, descricao, periodicidade, proximaData, ultimaData, responsavel, ativo, criadoEm)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        args: [cuid(), condoId, m.titulo, m.descricao, m.periodicidade, m.proximaData, m.ultimaData, m.responsavel, new Date()],
      });
      console.log(`  + Manutenção [${slug}]: ${m.titulo} (próxima ${m.proximaData})`);
      inseridos++;
    }

    // Autorizações ATIVA sem código (criadas antes do QR) ganham um código
    const semCodigo = await sql(
      "SELECT id FROM Autorizacao WHERE condominioId = ? AND status = 'ATIVA' AND codigo IS NULL",
      [condoId],
    );
    for (const a of semCodigo) {
      let codigo;
      do {
        codigo = String(Math.floor(100000 + Math.random() * 900000));
      } while (
        (await sql("SELECT id FROM Autorizacao WHERE condominioId = ? AND codigo = ? LIMIT 1", [condoId, codigo])).length > 0
      );
      await db.execute("UPDATE Autorizacao SET codigo = ? WHERE id = ?", [codigo, a.id]);
      console.log(`  ~ Autorização [${slug}] ganhou código QR ${codigo}`);
    }
  }

  console.log(`\nConcluído: ${inseridos} registro(s) inserido(s) em ${producao ? "PRODUÇÃO (Turso)" : "demo local"}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
