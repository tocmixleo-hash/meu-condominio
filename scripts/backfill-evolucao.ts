/**
 * Backfill idempotente da evolução multi-condomínio (P0 + P1):
 * 1. Cria um vínculo UsuarioCondominio para cada usuário sem vínculo,
 *    preservando o perfil atual (a coluna condominioId continua válida).
 * 2. Migra as paletas aprovadas do California e Florida para os campos de
 *    identidade visual do banco (presets — aparência final idêntica à atual).
 * 3. Garante a conta de demonstração do Administrador da Plataforma.
 *
 * Re-executável sem efeitos colaterais. Nenhum dado é removido.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const hash = (senha: string) => bcrypt.hashSync(senha, 10);

const PRESETS: Record<string, {
  corPrimaria: string; corSecundaria: string; corDestaque: string;
  corSidebar: string; corFundo: string; corTexto: string;
}> = {
  california: {
    corPrimaria: "#4D403A", corSecundaria: "#61514A", corDestaque: "#a3968d",
    corSidebar: "#4D403A", corFundo: "#f7f6f3", corTexto: "#292524",
  },
  florida: {
    corPrimaria: "#404040", corSecundaria: "#525252", corDestaque: "#a3a3a3",
    corSidebar: "#404040", corFundo: "#f5f5f5", corTexto: "#262626",
  },
};

async function main() {
  // 1. Backfill de vínculos
  const usuarios = await db.usuario.findMany({ include: { vinculos: true } });
  let criados = 0;
  for (const u of usuarios) {
    if (u.vinculos.length === 0) {
      await db.usuarioCondominio.create({
        data: { usuarioId: u.id, condominioId: u.condominioId, perfil: u.perfil },
      });
      criados++;
    }
  }
  console.log(`Vínculos criados: ${criados} (usuários verificados: ${usuarios.length})`);

  // Verificação por contagens: cada usuário operacional tem exatamente 1 vínculo
  const semVinculo = await db.usuario.count({ where: { vinculos: { none: {} } } });
  console.log(`Usuários sem vínculo após o backfill: ${semVinculo}`);
  if (semVinculo > 0) process.exit(1);

  // 2. Presets de identidade visual
  for (const [slug, cores] of Object.entries(PRESETS)) {
    const c = await db.condominio.findUnique({ where: { slug } });
    if (c && !c.corPrimaria) {
      await db.condominio.update({ where: { slug }, data: cores });
      console.log(`Identidade visual preset aplicada: ${slug}`);
    }
  }

  // 3. Conta do administrador da plataforma (demonstração)
  const admin = await db.usuario.findFirst({ where: { perfil: "PLATAFORMA" } });
  if (!admin) {
    const california = await db.condominio.findUnique({ where: { slug: "california" }, select: { id: true } });
    if (california) {
      await db.usuario.create({
        data: {
          condominioId: california.id,
          nome: "Administrador da Plataforma",
          email: "admin@meucondominio.com",
          senha: hash("admin123"),
          perfil: "PLATAFORMA",
        },
      });
      console.log("Administrador da plataforma de demonstração criado (admin@meucondominio.com).");
    }
  } else {
    console.log("Administrador da plataforma já existe.");
  }

  console.log("Backfill concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
