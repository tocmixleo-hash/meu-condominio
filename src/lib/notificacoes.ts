import { db } from "@/lib/db";

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

async function enviarPorEmail(entradas: EntradaNotificacao[]) {
  const chave = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE;
  if (!chave || !remetente) return;
  const usuarios = await db.usuario.findMany({
    where: { id: { in: entradas.map((e) => e.usuarioId) }, ativo: true },
    select: { email: true, nome: true },
  });
  await Promise.allSettled(
    usuarios.map((u) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: remetente,
          to: u.email,
          subject: "Meu Condomínio — você tem um novo aviso",
          text: `Olá, ${u.nome.split(" ")[0]}.\n\n${entradas
            .filter((e) => true)
            .map((e) => `${e.titulo}: ${e.mensagem}`)
            .join("\n\n")}\n\nAbra o portal para mais detalhes.`,
        }),
      }),
    ),
  );
}
