import { db } from "@/lib/db";
import { ehGestao, json401, json403, usuarioAtual } from "@/lib/auth";
import { notificarCondominio } from "@/lib/notificacoes";
import { registrarAcao } from "@/lib/auditoria";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  const lista = await db.assembleia.findMany({
    where: { condominioId: eu.condominio.id },
    orderBy: [{ data: "asc" }, { criadoEm: "desc" }],
  });
  return Response.json({ lista });
}

export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!ehGestao(eu.perfil)) return json403();

  const { titulo, descricao, tipo, data, horario, local, pauta } =
    await req.json().catch(() => ({}) as never);
  if (!titulo?.trim() || !ISO.test(data || "") || !horario) {
    return Response.json({ erro: "Informe título, data e horário." }, { status: 400 });
  }
  const assembleia = await db.assembleia.create({
    data: {
      condominioId: eu.condominio.id,
      titulo: String(titulo).trim(),
      descricao: descricao?.trim() || null,
      tipo: tipo === "EXTRAORDINARIA" ? "EXTRAORDINARIA" : "ORDINARIA",
      data,
      horario,
      local: local === "VIRTUAL" ? "VIRTUAL" : "SALAO_FESTAS",
      pauta: pauta?.trim() || null,
    },
  });

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "ASSEMBLEIA_CRIADA",
    detalhe: `${assembleia.titulo} · ${data}`,
  });
  await notificarCondominio(eu.condominio.id, "ASSEMBLEIA", {
    titulo: "Nova assembleia agendada",
    mensagem: `${assembleia.titulo} em ${data} às ${horario}.`,
    excetoUsuarioId: eu.id,
  });

  return Response.json({ assembleia });
}

export async function PATCH(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!ehGestao(eu.perfil)) return json403();

  const { id, status, pauta } = await req.json().catch(() => ({}) as never);
  const atual = await db.assembleia.findUnique({ where: { id } });
  if (!atual || atual.condominioId !== eu.condominio.id) {
    return Response.json({ erro: "Assembleia não encontrada." }, { status: 404 });
  }

  const dados: { status?: string; pauta?: string | null } = {};
  if (status && ["AGENDADA", "REALIZADA", "CANCELADA"].includes(status)) dados.status = status;
  if (typeof pauta === "string") dados.pauta = pauta.trim() || null;
  if (Object.keys(dados).length === 0) return Response.json({ erro: "Nada para atualizar." }, { status: 400 });

  const assembleia = await db.assembleia.update({ where: { id }, data: dados });

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "ASSEMBLEIA_ALTERADA",
    detalhe: `${assembleia.titulo}${dados.status ? ` — ${dados.status.toLowerCase()}` : ""}`,
  });

  return Response.json({ assembleia });
}
