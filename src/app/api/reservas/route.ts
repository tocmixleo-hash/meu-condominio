import { db } from "@/lib/db";
import { ehGestao, json401, json403, usuarioAtual } from "@/lib/auth";

const ESPACOS = ["SALAO_FESTAS", "CHURRASQUEIRA", "QUADRA", "PISCINA"];

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  const lista = await db.reserva.findMany({
    where: ehGestao(eu.perfil) ? {} : { solicitanteId: eu.id },
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
    where: { espaco, data, status: { in: ["PENDENTE", "CONFIRMADA"] } },
  });
  if (conflito) {
    return Response.json({ erro: "Este espaço já está reservado nessa data." }, { status: 409 });
  }

  const reserva = await db.reserva.create({
    data: { espaco, data, horario, observacoes: observacoes?.trim() || null, solicitanteId: eu.id },
    include: { solicitante: { include: { unidade: true } } },
  });
  return Response.json({ reserva });
}

export async function PATCH(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  const { id, status } = await req.json().catch(() => ({}) as never);
  const atual = await db.reserva.findUnique({ where: { id } });
  if (!atual) return Response.json({ erro: "Reserva não encontrada." }, { status: 404 });

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
  return Response.json({ reserva });
}
