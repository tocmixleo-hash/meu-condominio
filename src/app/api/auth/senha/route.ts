import { db } from "@/lib/db";
import { conferirSenha, hashSenha, json401, usuarioAtual } from "@/lib/auth";
import { registrarAcao } from "@/lib/auditoria";

/** Alteração da própria senha (mínimo 8 caracteres). */
export async function PATCH(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();

  const { senhaAtual, novaSenha } = await req.json().catch(() => ({}) as never);
  if (!senhaAtual || !novaSenha) {
    return Response.json({ erro: "Informe a senha atual e a nova senha." }, { status: 400 });
  }
  if (String(novaSenha).length < 8) {
    return Response.json(
      { erro: "A nova senha precisa ter pelo menos 8 caracteres." },
      { status: 400 },
    );
  }

  const u = await db.usuario.findUnique({ where: { id: eu.id }, select: { senha: true } });
  if (!u || !conferirSenha(String(senhaAtual), u.senha)) {
    return Response.json({ erro: "A senha atual está incorreta." }, { status: 401 });
  }

  await db.usuario.update({
    where: { id: eu.id },
    data: { senha: hashSenha(String(novaSenha)) },
  });

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "SENHA_ALTERADA",
    detalhe: eu.nome,
  });

  return Response.json({ ok: true });
}
