import { db } from "@/lib/db";
import { COOKIE_SESSAO, criarToken, json401, usuarioAtual } from "@/lib/auth";
import { cookies } from "next/headers";
import { registrarAcao } from "@/lib/auditoria";

/**
 * Troca segura de condomínio ativo da sessão. Apenas o administrador da
 * plataforma pode alternar livremente; os demais precisam de vínculo ativo
 * com o condomínio de destino. O evento fica registrado na auditoria.
 */
export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();

  const { condominioId } = await req.json().catch(() => ({}) as never);
  const destino = String(condominioId ?? "");
  if (!destino) {
    return Response.json({ erro: "Informe o condomínio de destino." }, { status: 400 });
  }
  if (destino === eu.condominio.id) {
    return Response.json({ usuario: eu });
  }

  const existe = await db.condominio.findUnique({ where: { id: destino }, select: { id: true, nome: true } });
  if (!existe) {
    return Response.json({ erro: "Condomínio não encontrado." }, { status: 404 });
  }

  if (!eu.ehPlataforma) {
    const vinculo = eu.condominios.some((c) => c.id === destino);
    if (!vinculo) {
      return Response.json(
        { erro: "Você não tem vínculo com este condomínio." },
        { status: 403 },
      );
    }
  }

  const loja = await cookies();
  loja.set(COOKIE_SESSAO, criarToken(eu.id, destino), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.VERCEL === "1" || !!process.env.VERCEL_URL,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  await registrarAcao({
    condominioId: destino,
    usuarioId: eu.id,
    acao: "TROCA_CONDOMINIO",
    detalhe: `${eu.nome} passou a operar em ${existe.nome}`,
  });

  const { sessaoComCondominio } = await import("@/lib/auth");
  const usuario = await sessaoComCondominio(eu.id, destino);
  if (!usuario) return json401();
  return Response.json({ usuario });
}
