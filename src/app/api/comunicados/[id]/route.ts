import { db } from "@/lib/db";
import { ehGestao, json401, json403, pode, usuarioAtual } from "@/lib/auth";
import { notificarCondominio } from "@/lib/notificacoes";
import { registrarAcao } from "@/lib/auditoria";

// Exclui um comunicado — tarefa da gestão do condomínio (síndico,
// administração e plataforma). A trava dupla espelha o botão da interface:
// acesso ao módulo E perfil de gestão, para MORADOR (que lê comunicados)
// ou funções de leitura não excluírem pela API direto.
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!pode(eu, "comunicados") || !ehGestao(eu.perfil)) return json403();

  const { id } = await ctx.params;
  const comunicado = await db.comunicado.findUnique({ where: { id } });
  // Isolamento por condomínio: registro de outro ambiente é tratado como inexistente
  if (!comunicado || comunicado.condominioId !== eu.condominio.id) {
    return Response.json({ erro: "Comunicado não encontrado." }, { status: 404 });
  }

  await db.comunicado.delete({ where: { id } });

  // Exclusão sempre registrada no histórico de ações (auditoria)
  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "COMUNICADO_REMOVIDO",
    detalhe: comunicado.titulo,
  });
  await notificarCondominio(eu.condominio.id, "COMUNICADO", {
    titulo: "Comunicado excluído",
    mensagem: comunicado.titulo,
    excetoUsuarioId: eu.id,
  });

  return Response.json({ ok: true });
}
