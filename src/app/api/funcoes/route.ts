import { db } from "@/lib/db";
import { ehPlataforma, json401, json403, usuarioAtual, MODULOS_CONCEDIVEIS } from "@/lib/auth";
import { registrarAcao } from "@/lib/auditoria";

function limparPermissoes(entrada: unknown): string[] {
  if (!Array.isArray(entrada)) return [];
  const validos = MODULOS_CONCEDIVEIS as readonly string[];
  return [...new Set(entrada.filter((m): m is string => typeof m === "string" && validos.includes(m)))];
}

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  // Lista das funções do condomínio ativo — gestão consulta; apenas a
  // plataforma altera (criação de funções é exclusiva do administrador).
  if (!ehPlataforma(eu.perfil) && !["SINDICO", "ADMINISTRATIVO"].includes(eu.perfil)) return json403();
  const lista = await db.funcao.findMany({
    where: { condominioId: eu.condominio.id },
    include: { _count: { select: { vinculos: { where: { ativo: true } } } } },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });
  return Response.json({ lista });
}

export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!ehPlataforma(eu.perfil)) return json403(); // exclusivo do administrador da plataforma

  const { nome, descricao, permissoes } = await req.json().catch(() => ({}) as never);
  if (!nome?.trim()) return Response.json({ erro: "Informe o nome da função." }, { status: 400 });
  const lista = limparPermissoes(permissoes);

  const existe = await db.funcao.findUnique({
    where: { condominioId_nome: { condominioId: eu.condominio.id, nome: String(nome).trim() } },
  });
  if (existe) return Response.json({ erro: "Já existe uma função com este nome neste condomínio." }, { status: 409 });

  const funcao = await db.funcao.create({
    data: {
      condominioId: eu.condominio.id,
      nome: String(nome).trim(),
      descricao: descricao?.trim() || null,
      permissoes: JSON.stringify(lista),
    },
  });

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "FUNCAO_CRIADA",
    detalhe: `${funcao.nome} · ${lista.length} módulo(s)`,
  });

  return Response.json({ funcao });
}

export async function PATCH(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!ehPlataforma(eu.perfil)) return json403();

  const { id, nome, descricao, permissoes, ativo } = await req.json().catch(() => ({}) as never);
  const funcao = await db.funcao.findFirst({ where: { id, condominioId: eu.condominio.id } });
  if (!funcao) return Response.json({ erro: "Função não encontrada." }, { status: 404 });

  const dados: { nome?: string; descricao?: string | null; permissoes?: string; ativo?: boolean } = {};
  if (typeof nome === "string" && nome.trim()) {
    const conflito = await db.funcao.findFirst({
      where: { condominioId: eu.condominio.id, nome: nome.trim(), NOT: { id: funcao.id } },
    });
    if (conflito) return Response.json({ erro: "Já existe uma função com este nome neste condomínio." }, { status: 409 });
    dados.nome = nome.trim();
  }
  if (descricao !== undefined) dados.descricao = String(descricao ?? "").trim() || null;
  if (permissoes !== undefined) dados.permissoes = JSON.stringify(limparPermissoes(permissoes));
  if (ativo !== undefined) dados.ativo = Boolean(ativo);

  const atualizada = await db.funcao.update({ where: { id: funcao.id }, data: dados });

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "FUNCAO_ALTERADA",
    detalhe: `${atualizada.nome}${ativo === false ? " — desativada" : ""}`,
  });

  return Response.json({ funcao: atualizada });
}

export async function DELETE(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!ehPlataforma(eu.perfil)) return json403();

  const { id } = await req.json().catch(() => ({}) as never);
  const funcao = await db.funcao.findFirst({ where: { id, condominioId: eu.condominio.id } });
  if (!funcao) return Response.json({ erro: "Função não encontrada." }, { status: 404 });

  const emUso = await db.usuarioCondominio.count({ where: { funcaoId: funcao.id, ativo: true } });
  if (emUso > 0) {
    // Não exclui função em uso — desativa, preservando o histórico dos vínculos.
    await db.funcao.update({ where: { id: funcao.id }, data: { ativo: false } });
    await registrarAcao({
      condominioId: eu.condominio.id,
      usuarioId: eu.id,
      acao: "FUNCAO_ALTERADA",
      detalhe: `${funcao.nome} — desativada (em uso por ${emUso} pessoa(s))`,
    });
    return Response.json({ ok: true, desativada: true });
  }

  await db.funcao.delete({ where: { id: funcao.id } });
  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "FUNCAO_EXCLUIDA",
    detalhe: funcao.nome,
  });
  return Response.json({ ok: true, excluida: true });
}
