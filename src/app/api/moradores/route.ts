import { db } from "@/lib/db";
import { hashSenha, json401, json403, pode, usuarioAtual } from "@/lib/auth";
import { registrarAcao } from "@/lib/auditoria";

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  // Gestão vê a lista completa; a Portaria consulta para registrar encomendas.
  if (!pode(eu, "moradores")) return json403();
  const [moradores, equipe] = await Promise.all([
    db.usuario.findMany({
      where: { condominioId: eu.condominio.id, perfil: "MORADOR" },
      include: { unidade: true },
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    }),
    // Equipe com função personalizada (perfil FUNCAO no vínculo)
    db.usuario.findMany({
      where: {
        condominioId: eu.condominio.id,
        perfil: "FUNCAO",
        vinculos: { some: { condominioId: eu.condominio.id, ativo: true } },
      },
      include: {
        unidade: true,
        vinculos: { where: { condominioId: eu.condominio.id }, include: { funcao: true } },
      },
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    }),
  ]);
  return Response.json({ lista: moradores, equipe });
}

export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!pode(eu, "moradores")) return json403();

  const { nome, email, senha, telefone, bloco, numero, funcaoId } =
    await req.json().catch(() => ({}) as never);
  if (!nome?.trim() || !email?.trim() || !senha) {
    return Response.json({ erro: "Preencha nome, e-mail e senha." }, { status: 400 });
  }
  if (!funcaoId && (!bloco || !numero)) {
    return Response.json({ erro: "Informe a unidade ou selecione uma função de equipe." }, { status: 400 });
  }
  const emailNorm = String(email).trim().toLowerCase();
  const existe = await db.usuario.findFirst({
    where: { condominioId: eu.condominio.id, email: emailNorm },
  });
  if (existe) return Response.json({ erro: "Já existe alguém com este e-mail." }, { status: 409 });

  // ── Cadastro de EQUIPE com função personalizada ──────────────────
  if (funcaoId) {
    const funcao = await db.funcao.findFirst({
      where: { id: String(funcaoId), condominioId: eu.condominio.id, ativo: true },
    });
    if (!funcao) return Response.json({ erro: "Função não encontrada neste condomínio." }, { status: 404 });

    const membro = await db.usuario.create({
      data: {
        condominioId: eu.condominio.id,
        nome: String(nome).trim(),
        email: emailNorm,
        senha: hashSenha(String(senha)),
        perfil: "FUNCAO",
        telefone: telefone?.trim() || null,
      },
      include: { vinculos: { where: { condominioId: eu.condominio.id }, include: { funcao: true } } },
    });
    await db.usuarioCondominio.create({
      data: { usuarioId: membro.id, condominioId: eu.condominio.id, perfil: "FUNCAO", funcaoId: funcao.id },
    });
    const vinculo = await db.usuarioCondominio.findUnique({
      where: { usuarioId_condominioId: { usuarioId: membro.id, condominioId: eu.condominio.id } },
      include: { funcao: true },
    });

    await registrarAcao({
      condominioId: eu.condominio.id,
      usuarioId: eu.id,
      acao: "EQUIPE_CADASTRADA",
      detalhe: `${membro.nome} · ${funcao.nome}`,
    });

    return Response.json({ morador: { ...membro, funcao: vinculo?.funcao ?? funcao } });
  }

  // ── Cadastro de MORADOR (com unidade) — fluxo original preservado ──
  if (!bloco || !numero) {
    return Response.json({ erro: "Preencha nome, e-mail, senha e unidade." }, { status: 400 });
  }
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
  if (!pode(eu, "moradores")) return json403();

  const { id, ativo } = await req.json().catch(() => ({}) as never);
  // Alvo: morador OU membro da equipe (FUNCAO) do próprio condomínio —
  // nunca PLATAFORMA, SINDICO, ADMINISTRATIVO ou PORTARIA por esta rota,
  // e nunca a própria conta.
  const alvo = await db.usuario.findFirst({
    where: { id, condominioId: eu.condominio.id, perfil: { in: ["MORADOR", "FUNCAO"] } },
    include: { unidade: true },
  });
  if (!alvo) return Response.json({ erro: "Pessoa não encontrada." }, { status: 404 });
  if (alvo.id === eu.id) return json403();

  const morador = await db.usuario.update({
    where: { id },
    data: { ativo: Boolean(ativo) },
    include: { unidade: true },
  });
  if (alvo.perfil === "FUNCAO") {
    // Ativa/desativa também o vínculo, para a sessão refletir o estado.
    await db.usuarioCondominio.updateMany({
      where: { usuarioId: alvo.id, condominioId: eu.condominio.id },
      data: { ativo: Boolean(ativo) },
    });
  }

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: alvo.perfil === "FUNCAO" ? "EQUIPE_ALTERADA" : "MORADOR_ALTERADO",
    detalhe: `${morador.nome} — ${ativo ? "reativado" : "desativado"}`,
  });

  return Response.json({ morador });
}
