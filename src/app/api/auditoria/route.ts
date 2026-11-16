import { db } from "@/lib/db";
import { ehGestao, json401, json403, usuarioAtual } from "@/lib/auth";
import { ROTULO_ACAO } from "@/lib/rotulos";

// Histórico de ações do condomínio — EXCLUSIVO de síndico, administração e
// administrador da plataforma. Funções personalizadas e demais perfis nunca
// acessam, nem com o módulo concedido: o histórico registra quem fez o quê
// no condomínio e não deve circular entre mãos.
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
