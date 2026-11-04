import { db } from "@/lib/db";
import { ehPlataforma, json401, json403, usuarioAtual } from "@/lib/auth";
import { registrarAcao } from "@/lib/auditoria";

// Lista pública para o seletor da tela de login (sem dados sensíveis).
export async function GET() {
  const lista = await db.condominio.findMany({
    orderBy: { criadoEm: "asc" },
    select: { id: true, nome: true, slug: true, corTema: true, logo: true, foto: true },
  });
  return Response.json({ lista });
}

// Cadastro de novo condomínio — exclusivo do administrador da plataforma.
export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!ehPlataforma(eu.perfil)) return json403();

  const { nome, corTema, logo, foto } = await req.json().catch(() => ({}) as never);
  const nomeLimpo = String(nome ?? "").trim();
  if (nomeLimpo.length < 3) {
    return Response.json(
      { erro: "Informe o nome do condomínio (mínimo de 3 caracteres)." },
      { status: 400 },
    );
  }

  // slug derivado do nome, único e seguro para URLs
  const base = nomeLimpo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "condominio";
  let slug = base;
  let tentativa = 2;
  while (await db.condominio.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${tentativa++}`;
  }

  const cor = typeof corTema === "string" && /^#[0-9a-fA-F]{6}$/.test(corTema) ? corTema : "#4D403A";

  const condominio = await db.condominio.create({
    data: {
      nome: nomeLimpo,
      slug,
      corTema: cor,
      logo: typeof logo === "string" && logo.trim() ? logo.trim() : "/fotos/logo-meu-condominio.png",
      foto: typeof foto === "string" && foto.trim() ? foto.trim() : "/fotos/parque-california.jpg",
    },
  });

  await registrarAcao({
    condominioId: condominio.id,
    usuarioId: eu.id,
    acao: "CONDOMINIO_CRIADO",
    detalhe: `${condominio.nome} (slug ${condominio.slug})`,
  });

  return Response.json({ condominio });
}
