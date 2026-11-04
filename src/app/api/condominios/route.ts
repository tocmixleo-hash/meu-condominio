import { db } from "@/lib/db";

// Lista pública para o seletor da tela de login (sem dados sensíveis).
export async function GET() {
  const lista = await db.condominio.findMany({
    orderBy: { criadoEm: "asc" },
    select: { id: true, nome: true, slug: true, corTema: true, logo: true, foto: true },
  });
  return Response.json({ lista });
}
