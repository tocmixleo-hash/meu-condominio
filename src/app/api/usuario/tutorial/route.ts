import { db } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";

/**
 * Marca o mini tutorial do primeiro acesso como concluído para o usuário
 * da sessão. Durante a simulação de perfis (administrador da plataforma
 * "vestindo" outro perfil) nada é gravado: o flag pertence ao usuário real
 * e a simulação controla a exibição por sessão do navegador.
 */
export async function POST() {
  const usuario = await usuarioAtual();
  if (!usuario) return Response.json({ erro: "Sessão expirada. Entre novamente." }, { status: 401 });

  if (usuario.simulando) {
    return Response.json({ ok: true, simulando: true });
  }

  await db.usuario.update({
    where: { id: usuario.id },
    data: { tutorialVisto: true },
  });
  return Response.json({ ok: true });
}
