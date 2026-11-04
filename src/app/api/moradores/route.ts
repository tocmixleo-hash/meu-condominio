import { db } from "@/lib/db";
import { ehGestao, hashSenha, json401, json403, usuarioAtual } from "@/lib/auth";

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  // Gestão vê a lista completa; a Portaria consulta para registrar encomendas.
  if (!ehGestao(eu.perfil) && eu.perfil !== "PORTARIA") return json403();
  const lista = await db.usuario.findMany({
    where: { perfil: "MORADOR" },
    include: { unidade: true },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });
  return Response.json({ lista });
}

export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!ehGestao(eu.perfil)) return json403();

  const { nome, email, senha, telefone, bloco, numero } =
    await req.json().catch(() => ({}) as never);
  if (!nome?.trim() || !email?.trim() || !senha || !bloco || !numero) {
    return Response.json({ erro: "Preencha nome, e-mail, senha e unidade." }, { status: 400 });
  }
  const emailNorm = String(email).trim().toLowerCase();
  const existe = await db.usuario.findUnique({ where: { email: emailNorm } });
  if (existe) return Response.json({ erro: "Já existe alguém com este e-mail." }, { status: 409 });

  let unidade = await db.unidade.findFirst({
    where: { bloco: String(bloco).trim().toUpperCase(), numero: String(numero).trim() },
  });
  if (!unidade) {
    unidade = await db.unidade.create({
      data: { bloco: String(bloco).trim().toUpperCase(), numero: String(numero).trim() },
    });
  }

  const morador = await db.usuario.create({
    data: {
      nome: String(nome).trim(),
      email: emailNorm,
      senha: hashSenha(String(senha)),
      perfil: "MORADOR",
      telefone: telefone?.trim() || null,
      unidadeId: unidade.id,
    },
    include: { unidade: true },
  });
  return Response.json({ morador });
}

export async function PATCH(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!ehGestao(eu.perfil)) return json403();

  const { id, ativo } = await req.json().catch(() => ({}) as never);
  const alvo = await db.usuario.findFirst({ where: { id, perfil: "MORADOR" } });
  if (!alvo) return Response.json({ erro: "Morador não encontrado." }, { status: 404 });
  if (alvo.id === eu.id) return json403();

  const morador = await db.usuario.update({
    where: { id },
    data: { ativo: Boolean(ativo) },
    include: { unidade: true },
  });
  return Response.json({ morador });
}
