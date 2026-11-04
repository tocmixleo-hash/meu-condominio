import { db } from "@/lib/db";
import { ehEquipe, json401, json403, pode, usuarioAtual } from "@/lib/auth";
import { notificarUsuarios } from "@/lib/notificacoes";
import { registrarAcao } from "@/lib/auditoria";
import { hojeISO } from "@/lib/datas";

/**
 * Validação do QR Code de entrada na portaria: a equipe informa o código
 * impresso no QR (ou digita o número) e a autorização do dia é marcada
 * como UTILIZADA, com aviso imediato ao morador.
 */
export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!pode(eu, "autorizacoes") || !ehEquipe(eu.perfil)) return json403();

  const { codigo } = await req.json().catch(() => ({}) as never);
  const valor = String(codigo ?? "").trim();
  if (!valor) {
    return Response.json({ erro: "Informe ou escaneie o código do visitante." }, { status: 400 });
  }

  const autorizacao = await db.autorizacao.findFirst({
    where: { condominioId: eu.condominio.id, codigo: valor },
    include: { morador: { include: { unidade: true } } },
  });
  if (!autorizacao) {
    return Response.json(
      { erro: "Código não reconhecido neste condomínio." },
      { status: 404 },
    );
  }
  if (autorizacao.status === "CANCELADA") {
    return Response.json({ erro: "Esta autorização foi cancelada pelo morador." }, { status: 409 });
  }
  if (autorizacao.status === "UTILIZADA") {
    return Response.json({ erro: "Entrada já registrada para este código." }, { status: 409 });
  }

  const hoje = hojeISO();
  if (hoje < autorizacao.dataInicio || hoje > autorizacao.dataFim) {
    return Response.json(
      {
        erro: `Autorização válida apenas de ${autorizacao.dataInicio.split("-").reverse().join("/")} a ${autorizacao.dataFim.split("-").reverse().join("/")}.`,
      },
      { status: 409 },
    );
  }

  const atualizada = await db.autorizacao.update({
    where: { id: autorizacao.id },
    data: { status: "UTILIZADA" },
    include: { morador: { include: { unidade: true } } },
  });

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "AUTORIZACAO_ENTRADA",
    detalhe: `${atualizada.visitanteNome} · código ${valor} · morador ${atualizada.morador.nome}`,
  });
  await notificarUsuarios(eu.condominio.id, "AUTORIZACAO", [
    {
      usuarioId: atualizada.moradorId,
      titulo: "Entrada registrada",
      mensagem: `${atualizada.visitanteNome} entrou pelo código ${valor}.`,
    },
  ]);

  return Response.json({ autorizacao: atualizada });
}
