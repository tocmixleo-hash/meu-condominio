import { db } from "@/lib/db";
import { json401, json403, pode, usuarioAtual } from "@/lib/auth";
import { notificarCondominio } from "@/lib/notificacoes";
import { registrarAcao } from "@/lib/auditoria";

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!pode(eu, "comunicados")) return json403();
  const lista = await db.comunicado.findMany({
    where: { condominioId: eu.condominio.id },
    include: { autor: { select: { nome: true, perfil: true } } },
    orderBy: { criadoEm: "desc" },
  });
  return Response.json({ lista });
}

export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!pode(eu, "comunicados")) return json403();

  const { titulo, conteudo, categoria, prioridade } = await req.json().catch(() => ({}) as never);
  if (!titulo?.trim() || !conteudo?.trim()) {
    return Response.json({ erro: "Informe título e conteúdo." }, { status: 400 });
  }
  const comunicado = await db.comunicado.create({
    data: {
      condominioId: eu.condominio.id,
      titulo: String(titulo).trim(),
      conteudo: String(conteudo).trim(),
      categoria: categoria || "GERAL",
      prioridade: prioridade || "NORMAL",
      autorId: eu.id,
    },
    include: { autor: { select: { nome: true, perfil: true } } },
  });

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "COMUNICADO_CRIADO",
    detalhe: comunicado.titulo,
  });
  await notificarCondominio(eu.condominio.id, "COMUNICADO", {
    titulo: "Novo comunicado",
    mensagem: comunicado.titulo,
    excetoUsuarioId: eu.id,
  });

  return Response.json({ comunicado });
}
