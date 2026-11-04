import { db } from "@/lib/db";
import { json401, json403, pode, usuarioAtual } from "@/lib/auth";
import { notificarUsuarios } from "@/lib/notificacoes";
import { registrarAcao } from "@/lib/auditoria";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!pode(eu, "autorizacoes")) return json403();
  const lista = await db.autorizacao.findMany({
    where: {
      condominioId: eu.condominio.id,
      ...(eu.perfil === "MORADOR" ? { moradorId: eu.id } : {}),
    },
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
      condominioId: eu.condominio.id,
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

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "AUTORIZACAO_CRIADA",
    detalhe: `${autorizacao.visitanteNome} · ${dataInicio} a ${dataFim}`,
  });
  // Portaria fica sabendo da nova autorização na hora
  const portarias = await db.usuario.findMany({
    where: { condominioId: eu.condominio.id, perfil: "PORTARIA", ativo: true },
    select: { id: true },
  });
  await notificarUsuarios(eu.condominio.id, "AUTORIZACAO",
    portarias.map((p) => ({
      usuarioId: p.id,
      titulo: "Nova autorização de acesso",
      mensagem: `${autorizacao.visitanteNome} (${autorizacao.tipo.toLowerCase()}), autorizado por ${eu.nome} de ${dataInicio} a ${dataFim}.`,
    })),
  );

  return Response.json({ autorizacao });
}

export async function PATCH(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  const { id, status } = await req.json().catch(() => ({}) as never);
  const atual = await db.autorizacao.findUnique({ where: { id } });
  if (!atual || atual.condominioId !== eu.condominio.id) {
    return Response.json({ erro: "Autorização não encontrada." }, { status: 404 });
  }

  const permitido =
    status === "CANCELADA" && atual.moradorId === eu.id && atual.status === "ATIVA";
  if (!permitido) return json403();

  const autorizacao = await db.autorizacao.update({
    where: { id },
    data: { status },
    include: { morador: { include: { unidade: true } } },
  });

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "AUTORIZACAO_CANCELADA",
    detalhe: autorizacao.visitanteNome,
  });

  return Response.json({ autorizacao });
}
