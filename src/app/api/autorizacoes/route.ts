import { db } from "@/lib/db";
import { json401, json403, usuarioAtual } from "@/lib/auth";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  const lista = await db.autorizacao.findMany({
    where: eu.perfil === "MORADOR" ? { moradorId: eu.id } : {},
    include: { morador: { include: { unidade: true } } },
    orderBy: { criadoEm: "desc" },
  });
  return Response.json({ lista });
}

export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (eu.perfil !== "MORADOR") return json403();

  const { visitanteNome, tipo, documento, veiculo, dataInicio, dataFim } =
    await req.json().catch(() => ({}) as never);
  if (!visitanteNome?.trim() || !ISO.test(dataInicio || "") || !ISO.test(dataFim || "")) {
    return Response.json({ erro: "Informe nome do visitante e o período." }, { status: 400 });
  }
  if (dataFim < dataInicio) {
    return Response.json({ erro: "A data final deve ser depois da inicial." }, { status: 400 });
  }
  const autorizacao = await db.autorizacao.create({
    data: {
      visitanteNome: String(visitanteNome).trim(),
      tipo: tipo === "PRESTADOR" ? "PRESTADOR" : "VISITANTE",
      documento: documento?.trim() || null,
      veiculo: veiculo?.trim() || null,
      dataInicio,
      dataFim,
      moradorId: eu.id,
    },
    include: { morador: { include: { unidade: true } } },
  });
  return Response.json({ autorizacao });
}

export async function PATCH(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  const { id, status } = await req.json().catch(() => ({}) as never);
  const atual = await db.autorizacao.findUnique({ where: { id } });
  if (!atual) return Response.json({ erro: "Autorização não encontrada." }, { status: 404 });

  const permitido =
    status === "CANCELADA" && atual.moradorId === eu.id && atual.status === "ATIVA";
  if (!permitido) return json403();

  const autorizacao = await db.autorizacao.update({
    where: { id },
    data: { status },
    include: { morador: { include: { unidade: true } } },
  });
  return Response.json({ autorizacao });
}
