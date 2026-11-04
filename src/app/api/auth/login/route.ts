import { db } from "@/lib/db";
import { COOKIE_SESSAO, conferirSenha, criarToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { ipDaRequisicao, permitirTentativa } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = ipDaRequisicao(req);
  if (!permitirTentativa(ip)) {
    return Response.json(
      { erro: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." },
      { status: 429 },
    );
  }

  const { email, senha, condominioId } = await req.json().catch(() => ({}) as never);
  if (!email || !senha || !condominioId) {
    return Response.json({ erro: "Informe o condomínio, e-mail e senha." }, { status: 400 });
  }

  const u = await db.usuario.findFirst({
    where: {
      email: String(email).trim().toLowerCase(),
      condominioId: String(condominioId),
    },
    include: { unidade: true, condominio: true },
  });
  if (!u || !conferirSenha(String(senha), u.senha)) {
    return Response.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  }
  if (!u.ativo) {
    return Response.json({ erro: "Cadastro desativado. Fale com a administração." }, { status: 403 });
  }

  const loja = await cookies();
  loja.set(COOKIE_SESSAO, criarToken(u.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.VERCEL === "1" || !!process.env.VERCEL_URL,
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
      condominio: {
        id: u.condominio.id,
        nome: u.condominio.nome,
        slug: u.condominio.slug,
        corTema: u.condominio.corTema,
        logo: u.condominio.logo,
        foto: u.condominio.foto,
      },
    },
  });
}
