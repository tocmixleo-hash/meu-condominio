import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { notificarUsuarios } from "@/lib/notificacoes";
import { emailConfigurado, enviarEmail } from "@/lib/email";

const DURACAO_MS = 60 * 60 * 1000; // 1 hora

/**
 * Solicitação de redefinição de senha. A resposta é SEMPRE genérica —
 * não revela se o e-mail existe (evita enumeração de contas). O link de
 * redefinição vai por e-mail quando o Resend estiver configurado; sem
 * provedor de e-mail (demonstração), o link chega como notificação in-app
 * do próprio usuário — só quem tem a sessão da conta consegue lê-lo.
 */
export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}) as never);
  const valor = String(email ?? "").trim().toLowerCase();
  if (!valor) {
    return Response.json({ erro: "Informe o e-mail da conta." }, { status: 400 });
  }

  const usuarios = await db.usuario.findMany({
    where: { email: valor, ativo: true },
    select: { id: true, nome: true, email: true },
  });

  await Promise.allSettled(
    usuarios.map(async (u) => {
      // Um pedido pendente por usuário: reutiliza a janela, não spamma
      const pendente = await db.redefinicaoSenha.findFirst({
        where: { usuarioId: u.id, usadaEm: null, expiraEm: { gt: new Date() } },
      });
      if (pendente) return;

      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await db.redefinicaoSenha.create({
        data: { usuarioId: u.id, tokenHash, expiraEm: new Date(Date.now() + DURACAO_MS) },
      });

      const origem = process.env.ORIGEM_PUBLICA ?? "https://parque-california.vercel.app";
      const link = `${origem}/redefinir?token=${token}`;
      const enviou = await enviarEmail({
        para: u.email,
        nome: u.nome,
        assunto: "Meu Condomínio — redefinição de senha",
        texto:
          `Recebemos um pedido de redefinição de senha para sua conta.\n\n` +
          `Use o link abaixo (vale por 1 hora, uso único):\n${link}\n\n` +
          `Se não foi você, ignore esta mensagem — sua senha continua a mesma.`,
      });

      // Sem provedor de e-mail: entrega o link dentro da própria conta (demo)
      if (!enviou && !emailConfigurado()) {
        // notificação in-app com o link — visível apenas logado na própria conta
        const completo = await db.usuario.findUnique({
          where: { id: u.id },
          select: { condominioId: true },
        });
        if (completo) {
          await notificarUsuarios(completo.condominioId, "SEGURANCA", [
            {
              usuarioId: u.id,
              titulo: "Redefinição de senha solicitada",
              mensagem: `Use o link para escolher uma nova senha (vale 1 hora): ${link}`,
            },
          ]);
        }
      }
    }),
  );

  return Response.json({ ok: true, mensagem: "Se o e-mail estiver cadastrado, você receberá as instruções em instantes." });
}
