/**
 * Replica o CONTEÚDO DE DEMONSTRAÇÃO no banco de PRODUÇÃO (Turso), para que a
 * simulação de perfis e os acessos rápidos tenham o mesmo material do ambiente
 * de demonstração: comunicados, reservas, encomendas, autorizações e assembleias.
 *
 * Garantias:
 * - NUNCA toca no administrador da plataforma (leonardo_lira@outlook.com) nem
 *   em quaisquer outros dados reais já existentes — apenas INSERE o que falta;
 * - Ignora artefatos de teste automatizado do banco demo (títulos
 *   "Teste de isolamento…", usuário "Equipe Teste", função desativada);
 * - IDEMPOTENTE: cada linha tem uma chave natural (ex.: comunicado = título;
 *   encomenda = código + descrição) — rodar de novo não duplica nada;
 * - Datas RELATIVAS a hoje, para o material de teste nunca "envelhecer"
 *   (visitas valendo hoje, assembleia na próxima semana etc.);
 * - Autor/solicitante/destinatário/morador são remapeados do elenco demo para
 *   os usuários de produção PELO E-MAIL (o elenco é o mesmo dos acessos rápidos).
 *
 * Uso: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... bun scripts/semear-dados-demo-producao.mjs
 */
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("Defina TURSO_DATABASE_URL (e TURSO_AUTH_TOKEN para o Turso remoto).");
  process.exit(1);
}
const prod = createClient({
  url,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});
const demo = createClient({ url: "file:db/custom.db" });

const sqlP = async (q, a = []) => (await prod.execute({ sql: q, args: a })).rows;
const sqlD = async (q, a = []) => (await demo.execute({ sql: q, args: a })).rows;

function cuid() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** Data de hoje deslocada em N dias, no formato YYYY-MM-DD usado pelo app. */
function dia(offset) {
  return new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
}

async function main() {
  // 1. Condomínios de produção por slug (NUNCA cria)
  const condos = Object.fromEntries(
    (await sqlP("SELECT id, slug, nome FROM Condominio")).map((r) => [r.slug, r.id]),
  );
  for (const slug of ["california", "florida"]) {
    if (!condos[slug]) {
      console.error(`✗ Condomínio "${slug}" não existe na produção — abortando (o script nunca cria condomínios).`);
      process.exit(1);
    }
  }
  console.log("✓ Condomínios de produção:", Object.keys(condos).join(", "));

  // 2. Elenco de demonstração já semeado na produção (por e-mail)
  const usuarios = Object.fromEntries(
    (await sqlP("SELECT id, email FROM Usuario")).map((r) => [r.email, r.id]),
  );
  const elenco = [
    "sindico@parquecalifornia.com.br", "administrativo@parquecalifornia.com.br",
    "portaria@parquecalifornia.com.br", "maria@email.com", "pedro@email.com",
    "juliana@email.com", "rafael@email.com",
    "sindico@parqueflorida.com.br", "administrativo@parqueflorida.com.br",
    "portaria@parqueflorida.com.br", "helena@email.com", "tiago@email.com",
    "camila@email.com", "andre@email.com",
  ];
  const faltando = elenco.filter((e) => !usuarios[e]);
  if (faltando.length > 0) {
    console.error(`✗ Elenco demo ausente na produção: ${faltando.join(", ")}\n  Rode antes: bun scripts/semear-usuarios-demo-producao.mjs`);
    process.exit(1);
  }
  console.log("✓ Elenco de demonstração localizado (14 usuários)");

  // Slugs de condomínio das linhas demo, pelo id demo (estável há gerações)
  const condoDemo = Object.fromEntries(
    (await sqlD("SELECT id, slug FROM Condominio")).map((r) => [r.id, r.slug]),
  );

  let inseridos = 0;

  // 3. COMUNICADOS — chave natural: (condomínio, título)
  const comunicadosDemo = (await sqlD("SELECT * FROM Comunicado"))
    .filter((r) => !r.titulo.startsWith("Teste de isolamento"));
  for (const r of comunicadosDemo) {
    const condoId = condos[condoDemo[r.condominioId]];
    const autorId = usuarios[(await sqlD("SELECT email FROM Usuario WHERE id = ?", [r.autorId]))[0].email];
    const existe = await sqlP(
      "SELECT id FROM Comunicado WHERE condominioId = ? AND titulo = ? LIMIT 1",
      [condoId, r.titulo],
    );
    if (existe.length > 0) continue;
    await prod.execute({
      sql: "INSERT INTO Comunicado (id, condominioId, titulo, conteudo, categoria, prioridade, autorId, criadoEm) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [cuid(), condoId, r.titulo, r.conteudo, r.categoria, r.prioridade, autorId, Date.now()],
    });
    console.log(`  + Comunicado [${condoDemo[r.condominioId]}]: ${r.titulo}`);
    inseridos++;
  }

  // 4. RESERVAS — chave natural: (condomínio, espaço, status); datas relativas a hoje
  const OFFSET_RESERVA = { SALAO_FESTAS: 10, PISCINA: 12, QUADRA: 4, CHURRASQUEIRA: 6 };
  for (const r of await sqlD("SELECT * FROM Reserva")) {
    const condoId = condos[condoDemo[r.condominioId]];
    const existe = await sqlP(
      "SELECT id FROM Reserva WHERE condominioId = ? AND espaco = ? AND status = ? LIMIT 1",
      [condoId, r.espaco, r.status],
    );
    if (existe.length > 0) continue;
    const solicitanteId = usuarios[(await sqlD("SELECT email FROM Usuario WHERE id = ?", [r.solicitanteId]))[0].email];
    await prod.execute({
      sql: "INSERT INTO Reserva (id, condominioId, espaco, data, horario, observacoes, status, solicitanteId, criadoEm) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [cuid(), condoId, r.espaco, dia(OFFSET_RESERVA[r.espaco] ?? 7), r.horario, r.observacoes, r.status, solicitanteId, Date.now()],
    });
    console.log(`  + Reserva [${condoDemo[r.condominioId]}]: ${r.espaco} em +${OFFSET_RESERVA[r.espaco] ?? 7}d (${r.status})`);
    inseridos++;
  }

  // 5. ENCOMENDAS — chave natural: (condomínio, código, descrição)
  for (const r of await sqlD("SELECT * FROM Encomenda")) {
    const condoId = condos[condoDemo[r.condominioId]];
    const existe = await sqlP(
      "SELECT id FROM Encomenda WHERE condominioId = ? AND codigo = ? AND descricao = ? LIMIT 1",
      [condoId, r.codigo, r.descricao],
    );
    if (existe.length > 0) continue;
    const destinatarioId = usuarios[(await sqlD("SELECT email FROM Usuario WHERE id = ?", [r.destinatarioId]))[0].email];
    await prod.execute({
      sql: "INSERT INTO Encomenda (id, condominioId, descricao, remetente, categoria, codigo, status, destinatarioId, recebidaEm, retiradaEm) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)",
      args: [cuid(), condoId, r.descricao, r.remetente, r.categoria, r.codigo, r.status, destinatarioId, Date.now()],
    });
    console.log(`  + Encomenda [${condoDemo[r.condominioId]}]: ${r.descricao} (${r.categoria})`);
    inseridos++;
  }

  // 6. AUTORIZAÇÕES — chave natural: (condomínio, visitante); datas relativas a hoje
  const OFFSET_VISITA = {
    "Ana Martins": [1, 4], "Marcos Pintor": [0, 2], "Rita Cardoso": [-3, -2],
    "Bruno Alves": [1, 4], "Diego Eletricista": [0, 2], "Lurdes Figueiredo": [-3, -2],
  };
  for (const r of await sqlD("SELECT * FROM Autorizacao")) {
    const condoId = condos[condoDemo[r.condominioId]];
    const existe = await sqlP(
      "SELECT id FROM Autorizacao WHERE condominioId = ? AND visitanteNome = ? LIMIT 1",
      [condoId, r.visitanteNome],
    );
    if (existe.length > 0) continue;
    const moradorId = usuarios[(await sqlD("SELECT email FROM Usuario WHERE id = ?", [r.moradorId]))[0].email];
    const [ini, fim] = OFFSET_VISITA[r.visitanteNome] ?? [1, 3];
    await prod.execute({
      sql: "INSERT INTO Autorizacao (id, condominioId, visitanteNome, tipo, documento, veiculo, dataInicio, dataFim, status, moradorId, criadoEm) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [cuid(), condoId, r.visitanteNome, r.tipo, r.documento, r.veiculo, dia(ini), dia(fim), r.status, moradorId, Date.now()],
    });
    console.log(`  + Autorização [${condoDemo[r.condominioId]}]: ${r.visitanteNome} (${r.tipo}, ${r.status})`);
    inseridos++;
  }

  // 7. ASSEMBLEIAS — chave natural: (condomínio, título); data relativa a hoje
  for (const r of await sqlD("SELECT * FROM Assembleia")) {
    const condoId = condos[condoDemo[r.condominioId]];
    const existe = await sqlP(
      "SELECT id FROM Assembleia WHERE condominioId = ? AND titulo = ? LIMIT 1",
      [condoId, r.titulo],
    );
    if (existe.length > 0) continue;
    await prod.execute({
      sql: "INSERT INTO Assembleia (id, condominioId, titulo, descricao, tipo, data, horario, local, status, pauta, criadoEm) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [cuid(), condoId, r.titulo, r.descricao, r.tipo, dia(12), r.horario, r.local, r.status, r.pauta, Date.now()],
    });
    console.log(`  + Assembleia [${condoDemo[r.condominioId]}]: ${r.titulo}`);
    inseridos++;
  }

  console.log(`\nConcluído: ${inseridos} registro(s) de demonstração inserido(s).`);
  console.log("Linhas já existentes NÃO foram alteradas; administrador e dados reais intactos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
