import { db } from "@/lib/db";
import { json401, usuarioAtual } from "@/lib/auth";

// Sino do portal: lista as notificações do usuário logado (30 mais recentes).
export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();

  const [lista, naoLidas] = await Promise.all([
    db.notificacao.findMany({
      where: { usuarioId: eu.id },
      orderBy: { criadoEm: "desc" },
      take: 30,
    }),
    db.notificacao.count({ where: { usuarioId: eu.id, lida: false } }),
  ]);
  return Response.json({ lista, naoLidas });
}

// Marca todas (ou uma específica) como lidas.
export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  const { id } = await req.json().catch(() => ({}) as never);

  const where = id
    ? { id: String(id), usuarioId: eu.id }
    : { usuarioId: eu.id, lida: false };
  await db.notificacao.updateMany({ where, data: { lida: true } });
  return Response.json({ ok: true });
}
