import { db } from "@/lib/db";
import { COOKIE_SESSAO, criarToken, hashSenha } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { email, senha } = await req.json().catch(() => ({}) as never);
  if (!email || !senha) {
    return Response.json({ erro: "Informe e-mail e senha." }, { status: 400 });
  }
  const u = await db.usuario.findUnique({
    where: { email: String(email).trim().toLowerCase() },
    include: { unidade: true },
  });
  if (!u || u.senha !== hashSenha(String(senha))) {
    return Response.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  }
  if (!u.ativo) {
    return Response.json({ erro: "Cadastro desativado. Fale com a administração." }, { status: 403 });
  }
  const loja = await cookies();
  loja.set(COOKIE_SESSAO, criarToken(u.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return Response.json({
    usuario: {
      id: u.id,
      nome: u.nome,
      email: u.email,
      perfil: u.perfil,
      unidade: u.unidade,
    },
  });
}
