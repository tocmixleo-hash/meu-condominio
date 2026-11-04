import { db } from "@/lib/db";
import { json401, json403, usuarioAtual } from "@/lib/auth";

function gerarCodigo(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  const lista = await db.encomenda.findMany({
    where: eu.perfil === "MORADOR" ? { destinatarioId: eu.id } : {},
    include: { destinatario: { include: { unidade: true } } },
    orderBy: { recebidaEm: "desc" },
  });
  return Response.json({ lista });
}

export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!["PORTARIA", "SINDICO", "ADMINISTRATIVO"].includes(eu.perfil)) return json403();

  const { descricao, remetente, categoria, destinatarioId } = await req.json().catch(() => ({}) as never);
  if (!descricao?.trim() || !destinatarioId) {
    return Response.json({ erro: "Informe descrição e destinatário." }, { status: 400 });
  }
  const destino = await db.usuario.findFirst({ where: { id: destinatarioId, perfil: "MORADOR", ativo: true } });
  if (!destino) return Response.json({ erro: "Destinatário não encontrado." }, { status: 404 });

  let codigo = gerarCodigo();
  while (await db.encomenda.findUnique({ where: { codigo } })) codigo = gerarCodigo();

  const encomenda = await db.encomenda.create({
    data: {
      descricao: String(descricao).trim(),
      remetente: remetente?.trim() || null,
      categoria: categoria || "CORREIO",
      codigo,
      destinatarioId,
    },
    include: { destinatario: { include: { unidade: true } } },
  });
  return Response.json({ encomenda });
}

export async function PATCH(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  const { id, acao, codigo } = await req.json().catch(() => ({}) as never);
  const atual = await db.encomenda.findUnique({ where: { id } });
  if (!atual) return Response.json({ erro: "Encomenda não encontrada." }, { status: 404 });

  if (acao === "LIBERAR_RETIRADA") {
    if (!["PORTARIA", "SINDICO", "ADMINISTRATIVO"].includes(eu.perfil)) return json403();
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
    return Response.json({ encomenda });
  }

  return json403();
}
