/**
 * Semeia os USUÁRIOS DE DEMONSTRAÇÃO no banco de PRODUÇÃO (Turso), para que
 * os acessos rápidos da tela de login funcionem também no ambiente real —
 * permitindo que o administrador convide qualquer pessoa a testar.
 *
 * - Cria apenas os usuários fictícios do elenco de demonstração (nunca toca
 *   no administrador da plataforma nem em quaisquer outros dados existentes);
 * - Garante as unidades A-101, A-102, B-201, B-202 em cada condomínio;
 * - IDEMPOTENTE e FUNCIONA COMO RESET: se o usuário demo já existir, a senha
 *   volta ao valor canônico da demonstração (os acessos rápidos nunca quebram).
 *
 * Uso: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... bun scripts/semear-usuarios-demo-producao.mjs
 */
import { createClient } from "@libsql/client";
import { PrismaClient } from "@prisma/client";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("Defina TURSO_DATABASE_URL (e TURSO_AUTH_TOKEN para o Turso remoto).");
  process.exit(1);
}
const turso = createClient({
  url,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});
const demo = new PrismaClient(); // banco de demonstração local (db/custom.db)

function cuid() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// Elenco da demonstração: e-mail -> { nome, perfil, unidade }
// As SENHAS vêm do banco demo (mesmos hashes dos acessos rápidos do login).
const ELENCO = [
  // Parque California
  { email: "sindico@parquecalifornia.com.br", condo: "california", nome: "Carlos Mendes", perfil: "SINDICO", unidade: null },
  { email: "administrativo@parquecalifornia.com.br", condo: "california", nome: "Fernanda Costa", perfil: "ADMINISTRATIVO", unidade: null },
  { email: "portaria@parquecalifornia.com.br", condo: "california", nome: "Jorge Ferreira", perfil: "PORTARIA", unidade: null },
  { email: "maria@email.com", condo: "california", nome: "Maria Silva", perfil: "MORADOR", unidade: ["A", "101"] },
  { email: "pedro@email.com", condo: "california", nome: "Pedro Almeida", perfil: "MORADOR", unidade: ["A", "102"] },
  { email: "juliana@email.com", condo: "california", nome: "Juliana Rocha", perfil: "MORADOR", unidade: ["B", "201"] },
  { email: "rafael@email.com", condo: "california", nome: "Rafael Souza", perfil: "MORADOR", unidade: ["B", "202"] },
  // Parque Florida
  { email: "sindico@parqueflorida.com.br", condo: "florida", nome: "Ricardo Teixeira", perfil: "SINDICO", unidade: null },
  { email: "administrativo@parqueflorida.com.br", condo: "florida", nome: "Patrícia Nunes", perfil: "ADMINISTRATIVO", unidade: null },
  { email: "portaria@parqueflorida.com.br", condo: "florida", nome: "Sérgio Lima", perfil: "PORTARIA", unidade: null },
  { email: "helena@email.com", condo: "florida", nome: "Helena Barbosa", perfil: "MORADOR", unidade: ["A", "101"] },
  { email: "tiago@email.com", condo: "florida", nome: "Tiago Moreira", perfil: "MORADOR", unidade: ["A", "102"] },
  { email: "camila@email.com", condo: "florida", nome: "Camila Freitas", perfil: "MORADOR", unidade: ["B", "201"] },
  { email: "andre@email.com", condo: "florida", nome: "André Cardoso", perfil: "MORADOR", unidade: ["B", "202"] },
];

const UNIDADES_PADRAO = [
  ["A", "101"],
  ["A", "102"],
  ["B", "201"],
  ["B", "202"],
];

async function main() {
  // 1. Condomínios de produção por slug (NUNCA cria)
  const condosRes = await turso.execute("SELECT id, slug, nome FROM Condominio");
  const condoPorSlug = Object.fromEntries(condosRes.rows.map((r) => [r.slug, r.id]));
  for (const slug of ["california", "florida"]) {
    if (!condoPorSlug[slug]) {
      console.error(`✗ Condomínio "${slug}" não existe na produção — abortando (o script nunca cria condomínios).`);
      process.exit(1);
    }
  }
  console.log("✓ Condomínios de produção localizados:", Object.keys(condoPorSlug).join(", "));

  // 2. Unidades padrão em cada condomínio
  const unidadePorChave = {}; // `${condoId}|${bloco}-${numero}` -> id
  for (const slug of ["california", "florida"]) {
    const condoId = condoPorSlug[slug];
    for (const [bloco, numero] of UNIDADES_PADRAO) {
      const existe = await turso.execute({
        sql: "SELECT id FROM Unidade WHERE condominioId = ? AND bloco = ? AND numero = ?",
        args: [condoId, bloco, numero],
      });
      if (existe.rows.length > 0) {
        unidadePorChave[`${condoId}|${bloco}-${numero}`] = existe.rows[0].id;
        continue;
      }
      const id = cuid();
      await turso.execute({
        sql: "INSERT INTO Unidade (id, condominioId, bloco, numero) VALUES (?, ?, ?, ?)",
        args: [id, condoId, bloco, numero],
      });
      unidadePorChave[`${condoId}|${bloco}-${numero}`] = id;
      console.log(`  + Unidade ${bloco}-${numero} criada em ${slug}`);
    }
  }
  console.log("✓ Unidades garantidas nos dois condomínios");

  // 3. Usuários + vínculos
  let criados = 0;
  let atualizados = 0;
  for (const item of ELENCO) {
    const emailProducao = item.email;
    const emailDemo = item.demoEmailUnico ?? item.email;
    const demoUsuario = await demo.usuario.findFirst({
      where: { email: emailDemo },
      select: { senha: true, nome: true },
    });
    if (!demoUsuario) {
      console.error(`  ✗ usuário demo ausente para ${emailDemo} — pulando`);
      continue;
    }
    const condoId = condoPorSlug[item.condo];
    const unidadeId = item.unidade
      ? unidadePorChave[`${condoId}|${item.unidade[0]}-${item.unidade[1]}`]
      : null;

    const existente = await turso.execute({
      sql: "SELECT id FROM Usuario WHERE email = ?",
      args: [emailProducao],
    });

    let usuarioId;
    if (existente.rows.length > 0) {
      usuarioId = existente.rows[0].id;
      // Reset do ambiente de demonstração: senha canônica, nome, perfil,
      // unidade, ativo e tutorial (o passeio guiado volta a ser exibido)
      await turso.execute({
        sql: "UPDATE Usuario SET nome = ?, senha = ?, perfil = ?, ativo = 1, unidadeId = ?, condominioId = ?, tutorialVisto = 0 WHERE id = ?",
        args: [demoUsuario.nome, demoUsuario.senha, item.perfil, unidadeId, condoId, usuarioId],
      });
      atualizados++;
    } else {
      usuarioId = cuid();
      await turso.execute({
        sql: "INSERT INTO Usuario (id, condominioId, nome, email, senha, perfil, ativo, unidadeId) VALUES (?, ?, ?, ?, ?, ?, 1, ?)",
        args: [usuarioId, condoId, demoUsuario.nome, emailProducao, demoUsuario.senha, item.perfil, unidadeId],
      });
      criados++;
    }

    // Vínculo com o condomínio (perfil do vínculo = perfil do elenco)
    const vinculo = await turso.execute({
      sql: "SELECT id FROM UsuarioCondominio WHERE usuarioId = ? AND condominioId = ?",
      args: [usuarioId, condoId],
    });
    if (vinculo.rows.length === 0) {
      await turso.execute({
        sql: "INSERT INTO UsuarioCondominio (id, usuarioId, condominioId, perfil, ativo) VALUES (?, ?, ?, ?, 1)",
        args: [cuid(), usuarioId, condoId, item.perfil],
      });
    } else {
      await turso.execute({
        sql: "UPDATE UsuarioCondominio SET perfil = ?, ativo = 1, funcaoId = NULL WHERE id = ?",
        args: [item.perfil, vinculo.rows[0].id],
      });
    }
    console.log(`  ✓ ${item.condo}: ${demoUsuario.nome} <${emailProducao}> (${item.perfil})`);
  }

  console.log(`\nConcluído: ${criados} usuários criados, ${atualizados} atualizados/resetados.`);
  console.log("O administrador da plataforma e demais dados NÃO foram tocados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await demo.$disconnect();
  });
