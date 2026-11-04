/**
 * Seed de PRODUÇÃO (Turso) — cria a base real da plataforma, sem nenhum dado
 * fictício (decisão 4 do cliente):
 *  - os dois condomínios contratados com suas identidades visuais aprovadas;
 *  - a conta do Administrador da Plataforma (leonardo_lira@outlook.com),
 *    com senha provisória definida em SENHA_ADMIN (alterar no 1º acesso).
 *
 * Idempotente: pode ser reexecutado (usa upsert por slug/e-mail).
 *
 * Variáveis: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, SENHA_ADMIN.
 * Uso: SENHA_ADMIN="..." bun prisma/seed-producao.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("Defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN do banco Turso de produção.");
  process.exit(1);
}

const db = new PrismaClient({
  adapter: new PrismaLibSQL({
    url,
    ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
  }),
});

const hash = (senha: string) => bcrypt.hashSync(senha, 10);

const CONDOMINIOS = [
  {
    nome: "Parque California",
    slug: "california",
    corTema: "#4D403A",
    logo: "/fotos/logo-parque-california.png",
    foto: "/fotos/parque-california.jpg",
    corPrimaria: "#4D403A",
    corSecundaria: "#61514A",
    corDestaque: "#a3968d",
    corSidebar: "#4D403A",
    corFundo: "#f7f6f3",
    corTexto: "#292524",
  },
  {
    nome: "Parque Florida",
    slug: "florida",
    corTema: "#404040",
    logo: "/fotos/logo-parque-florida.png",
    foto: "/fotos/parque-florida.jpg",
    corPrimaria: "#404040",
    corSecundaria: "#525252",
    corDestaque: "#a3a3a3",
    corSidebar: "#404040",
    corFundo: "#f5f5f5",
    corTexto: "#262626",
  },
];

const ADMIN_EMAIL = "leonardo_lira@outlook.com";

async function main() {
  for (const dados of CONDOMINIOS) {
    await db.condominio.upsert({
      where: { slug: dados.slug },
      update: { ...dados },
      create: dados,
    });
    console.log(`✓ Condomínio garantido: ${dados.nome}`);
  }

  const california = await db.condominio.findUniqueOrThrow({ where: { slug: "california" } });

  const senhaAdmin = process.env.SENHA_ADMIN;
  if (!senhaAdmin || senhaAdmin.length < 8) {
    console.error("Defina SENHA_ADMIN com pelo menos 8 caracteres (senha provisória do administrador).");
    process.exit(1);
  }

  const admin = await db.usuario.upsert({
    where: { condominioId_email: { condominioId: california.id, email: ADMIN_EMAIL } },
    update: { perfil: "PLATAFORMA", ativo: true },
    create: {
      condominioId: california.id,
      nome: "Administrador da Plataforma",
      email: ADMIN_EMAIL,
      senha: hash(senhaAdmin),
      perfil: "PLATAFORMA",
    },
  });
  console.log(`✓ Administrador da Plataforma garantido: ${ADMIN_EMAIL} (id ${admin.id})`);
  console.log("⚠️  Altere a senha no primeiro acesso (menu do usuário → Alterar senha).");
  console.log("Produção pronta — nenhum dado fictício foi criado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
