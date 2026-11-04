import { db } from "@/lib/db";
import { json401, json403, pode, usuarioAtual } from "@/lib/auth";
import { notificarUsuarios } from "@/lib/notificacoes";
import { registrarAcao } from "@/lib/auditoria";

function gerarCodigo(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  const lista = await db.encomenda.findMany({
    where: {
      condominioId: eu.condominio.id,
      ...(eu.perfil === "MORADOR" ? { destinatarioId: eu.id } : {}),
    },
    include: { destinatario: { include: { unidade: true } } },
    orderBy: { recebidaEm: "desc" },
  });
  return Response.json({ lista });
}

export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!pode(eu, "encomendas")) return json403();

  const { descricao, remetente, categoria, destinatarioId } = await req.json().catch(() => ({}) as never);
  if (!descricao?.trim() || !destinatarioId) {
    return Response.json({ erro: "Informe descrição e destinatário." }, { status: 400 });
  }
  const destino = await db.usuario.findFirst({
    where: { id: destinatarioId, condominioId: eu.condominio.id, perfil: "MORADOR", ativo: true },
    include: { unidade: true },
  });
  if (!destino) return Response.json({ erro: "Destinatário não encontrado." }, { status: 404 });

  let codigo = gerarCodigo();
  while (
    await db.encomenda.findFirst({
      where: { condominioId: eu.condominio.id, codigo },
    })
  ) {
    codigo = gerarCodigo();
  }

  const encomenda = await db.encomenda.create({
    data: {
      condominioId: eu.condominio.id,
      descricao: String(descricao).trim(),
      remetente: remetente?.trim() || null,
      categoria: categoria || "CORREIO",
      codigo,
      destinatarioId,
    },
    include: { destinatario: { include: { unidade: true } } },
  });

  const unidadeTxt = destino.unidade ? `Un. ${destino.unidade.bloco}-${destino.unidade.numero} · ` : "";
  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "ENCOMENDA_REGISTRADA",
    detalhe: `${encomenda.descricao} · ${unidadeTxt}${destino.nome}`,
  });
  await notificarUsuarios(eu.condominio.id, "ENCOMENDA", [
    {
      usuarioId: destinatarioId,
      titulo: "Encomenda recebida",
      mensagem: `${encomenda.descricao} está na portaria. Código de retirada ${codigo}.`,
    },
  ]);

  return Response.json({ encomenda });
}

export async function PATCH(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  const { id, acao, codigo } = await req.json().catch(() => ({}) as never);
  const atual = await db.encomenda.findUnique({ where: { id } });
  if (!atual || atual.condominioId !== eu.condominio.id) {
    return Response.json({ erro: "Encomenda não encontrada." }, { status: 404 });
  }

  if (acao === "LIBERAR_RETIRADA") {
    if (!pode(eu, "encomendas")) return json403();
    if (atual.status === "RETIRADA") {
      return Response.json({ erro: "Esta encomenda já foi retirada." }, { status: 409 });
    }
    if (String(codigo).trim() !== atual.codigo) {
      return Response.json({ erro: "Código de retirada incorreto." }, { status: 400 });
    }
    const encomenda = await db.encomenda.update({
      where: { id },
      data: { status: "RETIRADA", retiradaEm: new Date() },
      include: { destinatario: { include: { unidade: true } } },
    });

    await registrarAcao({
      condominioId: eu.condominio.id,
      usuarioId: eu.id,
      acao: "ENCOMENDA_RETIRADA",
      detalhe: `${encomenda.descricao} · código ${atual.codigo}`,
    });
    await notificarUsuarios(eu.condominio.id, "ENCOMENDA", [
      {
        usuarioId: encomenda.destinatarioId,
        titulo: "Encomenda retirada",
        mensagem: `${encomenda.descricao} foi retirada na portaria.`,
      },
    ]);

    return Response.json({ encomenda });
  }

  return json403();
}
