import { db } from "@/lib/db";
import { ehGestao, json401, json403, usuarioAtual } from "@/lib/auth";
import { ROTULO_ACAO } from "@/lib/auditoria";

// Histórico de ações do condomínio — apenas gestão.
export async function GET(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!ehGestao(eu.perfil)) return json403();

  const url = new URL(req.url);
  const acao = url.searchParams.get("acao") ?? undefined;

  const lista = await db.auditoria.findMany({
    where: { condominioId: eu.condominio.id, ...(acao ? { acao } : {}) },
    include: { usuario: { select: { nome: true, perfil: true } } },
    orderBy: { criadoEm: "desc" },
    take: 150,
  });
  return Response.json({ lista, rotulos: ROTULO_ACAO });
}
