import { createHash } from "crypto";
import { db } from "@/lib/db";
import { hashSenha } from "@/lib/auth";
import { registrarAcao } from "@/lib/auditoria";

/** Confirma a redefinição: token de uso único, válido por 1 hora. */
export async function POST(req: Request) {
  const { token, senha } = await req.json().catch(() => ({}) as never);
  const valor = String(token ?? "").trim();
  if (!valor || typeof senha !== "string" || senha.length < 6) {
    return Response.json(
      { erro: "Token ausente ou senha muito curta (mínimo 6 caracteres)." },
      { status: 400 },
    );
  }

  const tokenHash = createHash("sha256").update(valor).digest("hex");
  const pedido = await db.redefinicaoSenha.findUnique({ where: { tokenHash } });
  if (!pedido || pedido.usadaEm || pedido.expiraEm < new Date()) {
    return Response.json(
      { erro: "Link inválido ou expirado. Solicite uma nova redefinição." },
      { status: 400 },
    );
  }

  const usuario = await db.usuario.findUnique({ where: { id: pedido.usuarioId } });
  if (!usuario || !usuario.ativo) {
    return Response.json({ erro: "Conta não encontrada." }, { status: 404 });
  }

  await db.$transaction([
    db.usuario.update({ where: { id: usuario.id }, data: { senha: hashSenha(senha) } }),
    db.redefinicaoSenha.update({ where: { id: pedido.id }, data: { usadaEm: new Date() } }),
  ]);

  await registrarAcao({
    condominioId: usuario.condominioId,
    usuarioId: usuario.id,
    acao: "SENHA_REDEFINIDA",
    detalhe: `${usuario.nome} <${usuario.email}>`,
  });

  return Response.json({ ok: true, mensagem: "Senha redefinida! Entre com a nova senha." });
}
