import { db } from "@/lib/db";
import { json401, json403, pode, usuarioAtual } from "@/lib/auth";
import { garantirTabelaCampanha } from "@/lib/esquema-campanha";
import { notificarCondominio } from "@/lib/notificacoes";
import { registrarAcao } from "@/lib/auditoria";

const CATEGORIAS = ["CONVIVENCIA", "PET", "SUSTENTABILIDADE", "SEGURANCA", "SAUDE", "GERAL"];

// Equipe que gerencia campanhas (mesma régua dos comunicados)
function podeGerenciar(eu: { perfil: string; permissoes: string[]; ehPlataforma: boolean }) {
  return pode(eu, "comunicados");
}

async function campanhaDoCondominio(id: string, condominioId: string) {
  const campanha = await db.campanha.findUnique({ where: { id } });
  // Isolamento por condomínio: campanha de outro ambiente é tratada como inexistente
  if (!campanha || campanha.condominioId !== condominioId) return null;
  return campanha;
}

// Edita uma campanha (campos completos ou apenas liga/desliga a veiculação)
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!podeGerenciar(eu)) return json403();

  const { id } = await ctx.params;
  await garantirTabelaCampanha();
  const campanha = await campanhaDoCondominio(id, eu.condominio.id);
  if (!campanha) return Response.json({ erro: "Campanha não encontrada." }, { status: 404 });

  const corpo = await req.json().catch(() => ({}) as never);

  // Atalho de painel: pausar/retomar veiculação
  if (typeof corpo.ativa === "boolean") {
    const atualizada = await db.campanha.update({
      where: { id },
      data: { ativa: corpo.ativa },
    });
    await registrarAcao({
      condominioId: eu.condominio.id,
      usuarioId: eu.id,
      acao: corpo.ativa ? "CAMPANHA_ATIVADA" : "CAMPANHA_PAUSADA",
      detalhe: atualizada.titulo,
    });
    return Response.json({ campanha: atualizada });
  }

  // Edição completa
  const titulo = corpo.titulo !== undefined ? String(corpo.titulo).trim() : campanha.titulo;
  const mensagem = corpo.mensagem !== undefined ? String(corpo.mensagem).trim() : campanha.mensagem;
  if (!titulo || !mensagem) {
    return Response.json({ erro: "Informe título e mensagem da campanha." }, { status: 400 });
  }
  if (titulo.length > 80) {
    return Response.json({ erro: "O título deve ter até 80 caracteres." }, { status: 400 });
  }
  if (mensagem.length > 200) {
    return Response.json({ erro: "A mensagem deve ter até 200 caracteres." }, { status: 400 });
  }

  const categoria =
    corpo.categoria !== undefined && CATEGORIAS.includes(corpo.categoria)
      ? corpo.categoria
      : campanha.categoria;
  const emoji =
    corpo.emoji !== undefined ? String(corpo.emoji).trim().slice(0, 8) || "📣" : campanha.emoji;
  const descricao =
    corpo.descricao !== undefined ? String(corpo.descricao).trim() || null : campanha.descricao;

  let inicioEm = campanha.inicioEm;
  let fimEm = campanha.fimEm;
  if (corpo.inicioEm !== undefined) {
    if (corpo.inicioEm) {
      inicioEm = new Date(corpo.inicioEm);
      if (Number.isNaN(inicioEm.getTime())) {
        return Response.json({ erro: "Data de início inválida." }, { status: 400 });
      }
    } else {
      inicioEm = null;
    }
  }
  if (corpo.fimEm !== undefined) {
    if (corpo.fimEm) {
      fimEm = new Date(corpo.fimEm);
      if (Number.isNaN(fimEm.getTime())) {
        return Response.json({ erro: "Data de encerramento inválida." }, { status: 400 });
      }
      fimEm = new Date(fimEm.getTime() + 24 * 3600 * 1000 - 1); // fim do dia
    } else {
      fimEm = null;
    }
  }
  if (inicioEm && fimEm && inicioEm > fimEm) {
    return Response.json({ erro: "O encerramento deve ser depois do início." }, { status: 400 });
  }

  const atualizada = await db.campanha.update({
    where: { id },
    data: { titulo, mensagem, descricao, categoria, emoji, inicioEm, fimEm },
    include: { autor: { select: { nome: true, perfil: true } } },
  });

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "CAMPANHA_ATUALIZADA",
    detalhe: atualizada.titulo,
  });

  return Response.json({ campanha: atualizada });
}

// Exclui definitivamente uma campanha
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!podeGerenciar(eu)) return json403();

  const { id } = await ctx.params;
  await garantirTabelaCampanha();
  const campanha = await campanhaDoCondominio(id, eu.condominio.id);
  if (!campanha) return Response.json({ erro: "Campanha não encontrada." }, { status: 404 });

  await db.campanha.delete({ where: { id } });
  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "CAMPANHA_REMOVIDA",
    detalhe: campanha.titulo,
  });
  await notificarCondominio(eu.condominio.id, "CAMPANHA", {
    titulo: "Campanha encerrada",
    mensagem: campanha.titulo,
    excetoUsuarioId: eu.id,
  });

  return Response.json({ ok: true });
}
