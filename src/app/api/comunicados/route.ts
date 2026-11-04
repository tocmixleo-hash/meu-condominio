import { db } from "@/lib/db";
import { json401, json403, usuarioAtual } from "@/lib/auth";

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  const lista = await db.comunicado.findMany({
    include: { autor: { select: { nome: true, perfil: true } } },
    orderBy: { criadoEm: "desc" },
  });
  return Response.json({ lista });
}

export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!["SINDICO", "ADMINISTRATIVO"].includes(eu.perfil)) return json403();

  const { titulo, conteudo, categoria, prioridade } = await req.json().catch(() => ({}) as never);
  if (!titulo?.trim() || !conteudo?.trim()) {
    return Response.json({ erro: "Informe título e conteúdo." }, { status: 400 });
  }
  const comunicado = await db.comunicado.create({
    data: {
      titulo: String(titulo).trim(),
      conteudo: String(conteudo).trim(),
      categoria: categoria || "GERAL",
      prioridade: prioridade || "NORMAL",
      autorId: eu.id,
    },
    include: { autor: { select: { nome: true, perfil: true } } },
  });
  return Response.json({ comunicado });
}
