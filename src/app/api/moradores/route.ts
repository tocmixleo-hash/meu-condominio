import { db } from "@/lib/db";
import { ehGestao, hashSenha, json401, json403, usuarioAtual } from "@/lib/auth";
import { registrarAcao } from "@/lib/auditoria";

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  // Gestão vê a lista completa; a Portaria consulta para registrar encomendas.
  if (!ehGestao(eu.perfil) && eu.perfil !== "PORTARIA") return json403();
  const lista = await db.usuario.findMany({
    where: { condominioId: eu.condominio.id, perfil: "MORADOR" },
    include: { unidade: true },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });
  return Response.json({ lista });
}

export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!ehGestao(eu.perfil)) return json403();

  const { nome, email, senha, telefone, bloco, numero } =
    await req.json().catch(() => ({}) as never);
  if (!nome?.trim() || !email?.trim() || !senha || !bloco || !numero) {
    return Response.json({ erro: "Preencha nome, e-mail, senha e unidade." }, { status: 400 });
  }
  const emailNorm = String(email).trim().toLowerCase();
  const existe = await db.usuario.findFirst({
    where: { condominioId: eu.condominio.id, email: emailNorm },
  });
  if (existe) return Response.json({ erro: "Já existe alguém com este e-mail." }, { status: 409 });

  let unidade = await db.unidade.findFirst({
    where: {
      condominioId: eu.condominio.id,
      bloco: String(bloco).trim().toUpperCase(),
      numero: String(numero).trim(),
    },
  });
  if (!unidade) {
    unidade = await db.unidade.create({
      data: {
        condominioId: eu.condominio.id,
        bloco: String(bloco).trim().toUpperCase(),
        numero: String(numero).trim(),
      },
    });
  }

  const morador = await db.usuario.create({
    data: {
      condominioId: eu.condominio.id,
      nome: String(nome).trim(),
      email: emailNorm,
      senha: hashSenha(String(senha)),
      perfil: "MORADOR",
      telefone: telefone?.trim() || null,
      unidadeId: unidade.id,
    },
    include: { unidade: true },
  });

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "MORADOR_CADASTRADO",
    detalhe: `${morador.nome} · Un. ${unidade.bloco}-${unidade.numero}`,
  });

  return Response.json({ morador });
}

export async function PATCH(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!ehGestao(eu.perfil)) return json403();

  const { id, ativo } = await req.json().catch(() => ({}) as never);
  const alvo = await db.usuario.findFirst({
    where: { id, condominioId: eu.condominio.id, perfil: "MORADOR" },
    include: { unidade: true },
  });
  if (!alvo) return Response.json({ erro: "Morador não encontrado." }, { status: 404 });
  if (alvo.id === eu.id) return json403();

  const morador = await db.usuario.update({
    where: { id },
    data: { ativo: Boolean(ativo) },
    include: { unidade: true },
  });

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "MORADOR_ALTERADO",
    detalhe: `${morador.nome} — ${ativo ? "reativado" : "desativado"}`,
  });

  return Response.json({ morador });
}
