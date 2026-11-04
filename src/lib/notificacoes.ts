import { db } from "@/lib/db";
import { emailConfigurado, enviarEmail } from "@/lib/email";

/**
 * Notificações in-app (sino do portal). Quando RESEND_API_KEY estiver
 * configurada, envia também por e-mail (fire-and-forget, nunca bloqueia
 * a resposta da API). WhatsApp poderá ser plugado no mesmo ponto.
 */

export type EntradaNotificacao = { usuarioId: string; titulo: string; mensagem: string };

export async function notificarUsuarios(
  condominioId: string,
  tipo: string,
  entradas: EntradaNotificacao[],
) {
  const validas = entradas.filter((e) => e.usuarioId);
  if (validas.length === 0) return;
  await db.notificacao.createMany({
    data: validas.map((e) => ({
      condominioId,
      usuarioId: e.usuarioId,
      tipo,
      titulo: e.titulo,
      mensagem: e.mensagem,
    })),
  });
  enviarPorEmail(validas).catch(() => null);
}

/** Notifica todos os usuários ativos do condomínio (opcionalmente exceto um). */
export async function notificarCondominio(
  condominioId: string,
  tipo: string,
  aviso: { titulo: string; mensagem: string; excetoUsuarioId?: string },
) {
  const usuarios = await db.usuario.findMany({
    where: {
      condominioId,
      ativo: true,
      ...(aviso.excetoUsuarioId ? { id: { not: aviso.excetoUsuarioId } } : {}),
    },
    select: { id: true },
  });
  await notificarUsuarios(
    condominioId,
    tipo,
    usuarios.map((u) => ({ usuarioId: u.id, titulo: aviso.titulo, mensagem: aviso.mensagem })),
  );
}

async function enviarPorEmail(entradas: EntradaNotificacao[]) {
  if (!emailConfigurado()) return;
  const usuarios = await db.usuario.findMany({
    where: { id: { in: entradas.map((e) => e.usuarioId) }, ativo: true },
    select: { id: true, email: true, nome: true },
  });
  const porId = new Map(entradas.map((e) => [e.usuarioId, e]));
  await Promise.allSettled(
    usuarios.map((u) => {
      const e = porId.get(u.id);
      if (!e) return Promise.resolve(null);
      return enviarEmail({
        para: u.email,
        nome: u.nome,
        assunto: "Meu Condomínio — você tem um novo aviso",
        texto: `${e.titulo}: ${e.mensagem}\n\nAbra o portal para mais detalhes.`,
      });
    }),
  );
}
