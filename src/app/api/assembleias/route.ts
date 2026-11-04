import { db } from "@/lib/db";
import { json401, json403, usuarioAtual } from "@/lib/auth";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  const lista = await db.assembleia.findMany({ orderBy: [{ data: "asc" }, { criadoEm: "desc" }] });
  return Response.json({ lista });
}

export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!["SINDICO", "ADMINISTRATIVO"].includes(eu.perfil)) return json403();

  const { titulo, descricao, tipo, data, horario, local, pauta } =
    await req.json().catch(() => ({}) as never);
  if (!titulo?.trim() || !ISO.test(data || "") || !horario) {
    return Response.json({ erro: "Informe título, data e horário." }, { status: 400 });
  }
  const assembleia = await db.assembleia.create({
    data: {
      titulo: String(titulo).trim(),
      descricao: descricao?.trim() || null,
      tipo: tipo === "EXTRAORDINARIA" ? "EXTRAORDINARIA" : "ORDINARIA",
      data,
      horario,
      local: local === "VIRTUAL" ? "VIRTUAL" : "SALAO_FESTAS",
      pauta: pauta?.trim() || null,
    },
  });
  return Response.json({ assembleia });
}

export async function PATCH(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!["SINDICO", "ADMINISTRATIVO"].includes(eu.perfil)) return json403();

  const { id, status, pauta } = await req.json().catch(() => ({}) as never);
  const atual = await db.assembleia.findUnique({ where: { id } });
  if (!atual) return Response.json({ erro: "Assembleia não encontrada." }, { status: 404 });

  const dados: { status?: string; pauta?: string | null } = {};
  if (status && ["AGENDADA", "REALIZADA", "CANCELADA"].includes(status)) dados.status = status;
  if (typeof pauta === "string") dados.pauta = pauta.trim() || null;
  if (Object.keys(dados).length === 0) return Response.json({ erro: "Nada para atualizar." }, { status: 400 });

  const assembleia = await db.assembleia.update({ where: { id }, data: dados });
  return Response.json({ assembleia });
}
