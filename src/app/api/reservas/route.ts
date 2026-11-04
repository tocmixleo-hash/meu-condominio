import { db } from "@/lib/db";
import { ehGestao, json401, json403, usuarioAtual } from "@/lib/auth";
import { notificarUsuarios } from "@/lib/notificacoes";
import { registrarAcao } from "@/lib/auditoria";
import { ROTULO_ESPACO } from "@/lib/rotulos";

const ESPACOS = ["SALAO_FESTAS", "CHURRASQUEIRA", "QUADRA", "PISCINA"];

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  const lista = await db.reserva.findMany({
    where: {
      condominioId: eu.condominio.id,
      ...(ehGestao(eu.perfil) ? {} : { solicitanteId: eu.id }),
    },
    include: { solicitante: { include: { unidade: true } } },
    orderBy: [{ data: "asc" }, { criadoEm: "desc" }],
  });
  return Response.json({ lista });
}

export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (eu.perfil !== "MORADOR") return json403();

  const { espaco, data, horario, observacoes } = await req.json().catch(() => ({}) as never);
  if (!ESPACOS.includes(espaco) || !data || !horario) {
    return Response.json({ erro: "Informe espaço, data e horário." }, { status: 400 });
  }

  const conflito = await db.reserva.findFirst({
    where: {
      condominioId: eu.condominio.id,
      espaco,
      data,
      status: { in: ["PENDENTE", "CONFIRMADA"] },
    },
  });
  if (conflito) {
    return Response.json({ erro: "Este espaço já está reservado nessa data." }, { status: 409 });
  }

  const reserva = await db.reserva.create({
    data: {
      condominioId: eu.condominio.id,
      espaco,
      data,
      horario,
      observacoes: observacoes?.trim() || null,
      solicitanteId: eu.id,
    },
    include: { solicitante: { include: { unidade: true } } },
  });

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "RESERVA_CRIADA",
    detalhe: `${ROTULO_ESPACO[espaco] ?? espaco} · ${data}`,
  });
  await notificarUsuarios(eu.condominio.id, "RESERVA", [
    { usuarioId: eu.id, titulo: "Reserva solicitada", mensagem: `${ROTULO_ESPACO[espaco] ?? espaco} em ${data} aguarda aprovação da administração.` },
  ]);

  return Response.json({ reserva });
}

export async function PATCH(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  const { id, status } = await req.json().catch(() => ({}) as never);
  const atual = await db.reserva.findUnique({ where: { id } });
  if (!atual || atual.condominioId !== eu.condominio.id) {
    return Response.json({ erro: "Reserva não encontrada." }, { status: 404 });
  }

  const permitidos =
    ehGestao(eu.perfil) && ["CONFIRMADA", "REJEITADA"].includes(status)
      ? true
      : status === "CANCELADA" && atual.solicitanteId === eu.id && atual.status === "PENDENTE";
  if (!permitidos) return json403();

  const reserva = await db.reserva.update({
    where: { id },
    data: { status },
    include: { solicitante: { include: { unidade: true } } },
  });

  const acao = `RESERVA_${status}`;
  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao,
    detalhe: `${ROTULO_ESPACO[reserva.espaco] ?? reserva.espaco} · ${reserva.data} · ${reserva.solicitante.nome}`,
  });
  await notificarUsuarios(eu.condominio.id, "RESERVA", [
    {
      usuarioId: reserva.solicitanteId,
      titulo: status === "CONFIRMADA" ? "Reserva confirmada" : status === "REJEITADA" ? "Reserva rejeitada" : "Reserva cancelada",
      mensagem: `${ROTULO_ESPACO[reserva.espaco] ?? reserva.espaco} em ${reserva.data} — novo status: ${status.toLowerCase()}.`,
    },
  ]);

  return Response.json({ reserva });
}
