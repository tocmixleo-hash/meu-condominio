import { db } from "@/lib/db";
import { ehEquipe, json401, json403, pode, usuarioAtual } from "@/lib/auth";
import { notificarUsuarios } from "@/lib/notificacoes";
import { registrarAcao } from "@/lib/auditoria";
import { ROTULO_PRIORIDADE_OCORRENCIA } from "@/lib/rotulos";

const CATEGORIAS = ["INFRAESTRUTURA", "ELETRICA", "HIDRAULICA", "ELEVADOR", "SEGURANCA", "LIMPEZA", "OUTROS"];
const PRIORIDADES = ["BAIXA", "NORMAL", "ALTA", "URGENTE"];

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!pode(eu, "ocorrencias")) return json403();
  const lista = await db.ocorrencia.findMany({
    where: {
      condominioId: eu.condominio.id,
      // Morador acompanha apenas as próprias ocorrências; a equipe vê todas
      ...(eu.perfil === "MORADOR" ? { abertaPorId: eu.id } : {}),
    },
    include: { abertaPor: { include: { unidade: true } } },
    orderBy: { criadoEm: "desc" },
  });
  return Response.json({ lista });
}

export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!pode(eu, "ocorrencias")) return json403();

  const { titulo, descricao, categoria, prioridade, local } =
    await req.json().catch(() => ({}) as never);
  if (!titulo?.trim() || !descricao?.trim()) {
    return Response.json({ erro: "Informe título e descrição da ocorrência." }, { status: 400 });
  }

  const ocorrencia = await db.ocorrencia.create({
    data: {
      condominioId: eu.condominio.id,
      titulo: String(titulo).trim().slice(0, 160),
      descricao: String(descricao).trim().slice(0, 4000),
      categoria: CATEGORIAS.includes(categoria) ? categoria : "OUTROS",
      prioridade: PRIORIDADES.includes(prioridade) ? prioridade : "NORMAL",
      local: local?.trim()?.slice(0, 160) || null,
      abertaPorId: eu.id,
    },
    include: { abertaPor: { include: { unidade: true } } },
  });

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "OCORRENCIA_CRIADA",
    detalhe: `${ocorrencia.titulo} · ${ROTULO_PRIORIDADE_OCORRENCIA[ocorrencia.prioridade] ?? ocorrencia.prioridade}`,
  });

  // A equipe de gestão fica sabendo na hora (menos quem abriu)
  const gestao = await db.usuario.findMany({
    where: {
      condominioId: eu.condominio.id,
      ativo: true,
      perfil: { in: ["SINDICO", "ADMINISTRATIVO"] },
      id: { not: eu.id },
    },
    select: { id: true },
  });
  const unidadeTxt = ocorrencia.abertaPor.unidade
    ? `Un. ${ocorrencia.abertaPor.unidade.bloco}-${ocorrencia.abertaPor.unidade.numero} · `
    : "";
  await notificarUsuarios(
    eu.condominio.id,
    "OCORRENCIA",
    gestao.map((g) => ({
      usuarioId: g.id,
      titulo: `Nova ocorrência (${ocorrencia.prioridade.toLowerCase()})`,
      mensagem: `${unidadeTxt}${eu.nome} abriu “${ocorrencia.titulo}”.`,
    })),
  );
  await notificarUsuarios(eu.condominio.id, "OCORRENCIA", [
    {
      usuarioId: eu.id,
      titulo: "Ocorrência registrada",
      mensagem: `“${ocorrencia.titulo}” foi encaminhada à administração.`,
    },
  ]);

  return Response.json({ ocorrencia });
}

export async function PATCH(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  // Somente a equipe do condomínio atende ocorrências — o morador acompanha
  if (!pode(eu, "ocorrencias") || !ehEquipe(eu.perfil)) return json403();

  const { id, status, resolucao } = await req.json().catch(() => ({}) as never);
  const atual = await db.ocorrencia.findUnique({ where: { id } });
  if (!atual || atual.condominioId !== eu.condominio.id) {
    return Response.json({ erro: "Ocorrência não encontrada." }, { status: 404 });
  }
  if (!["EM_ATENDIMENTO", "RESOLVIDA"].includes(status)) {
    return Response.json({ erro: "Status inválido para atendimento." }, { status: 400 });
  }
  if (atual.status === "RESOLVIDA") {
    return Response.json({ erro: "Esta ocorrência já foi resolvida." }, { status: 409 });
  }

  const ocorrencia = await db.ocorrencia.update({
    where: { id },
    data: {
      status,
      resolucao: resolucao?.trim()?.slice(0, 4000) || null,
      resolvidaEm: status === "RESOLVIDA" ? new Date() : null,
    },
    include: { abertaPor: { include: { unidade: true } } },
  });

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: status === "RESOLVIDA" ? "OCORRENCIA_RESOLVIDA" : "OCORRENCIA_ATUALIZADA",
    detalhe: `${ocorrencia.titulo}${ocorrencia.resolucao ? ` · ${ocorrencia.resolucao}` : ""}`,
  });
  await notificarUsuarios(eu.condominio.id, "OCORRENCIA", [
    {
      usuarioId: ocorrencia.abertaPorId,
      titulo: status === "RESOLVIDA" ? "Ocorrência resolvida" : "Ocorrência em atendimento",
      mensagem: `“${ocorrencia.titulo}”${
        status === "RESOLVIDA" && ocorrencia.resolucao ? ` — ${ocorrencia.resolucao}` : " está sendo atendida pela equipe."
      }`,
    },
  ]);

  return Response.json({ ocorrencia });
}
