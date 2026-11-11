import { db } from "@/lib/db";
import { ehGestao, json401, json403, pode, usuarioAtual } from "@/lib/auth";
import { garantirSchema } from "@/lib/garantia-schema";
import { notificarCondominio } from "@/lib/notificacoes";
import { registrarAcao } from "@/lib/auditoria";

const CATEGORIAS = ["CONVIVENCIA", "PET", "SUSTENTABILIDADE", "SEGURANCA", "SAUDE", "GERAL"];

// Equipe de gestão que gerencia campanhas — mesma régua dos comunicados:
// acesso ao módulo E perfil de gestão (síndico/administrativo/plataforma).
// A trava dupla impede que perfis com acesso só de leitura (ex.: MORADOR,
// que tem "comunicados" para LER) publiquem pela API direto.
function podeGerenciar(eu: { perfil: string; permissoes: string[]; ehPlataforma: boolean }) {
  return pode(eu, "comunicados") && ehGestao(eu.perfil);
}

// Lista as campanhas do condomínio ativo.
// • Padrão: apenas campanhas ativas dentro do período de veiculação (banner e listas públicas).
// • ?todas=1: a equipe de gestão enxerga também as pausadas e fora do período.
export async function GET(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();

  const url = new URL(req.url);
  const querTodas = url.searchParams.get("todas") === "1";
  const agora = new Date();

  // Produção (Turso) pode estar sem tabelas de módulos novos — garante antes de consultar
  await garantirSchema();

  const lista = await db.campanha.findMany({
    where: {
      condominioId: eu.condominio.id,
      ...(querTodas && podeGerenciar(eu)
        ? {}
        : {
            ativa: true,
            AND: [
              { OR: [{ inicioEm: null }, { inicioEm: { lte: agora } }] },
              { OR: [{ fimEm: null }, { fimEm: { gte: agora } }] },
            ],
          }),
    },
    include: { autor: { select: { nome: true, perfil: true } } },
    orderBy: [{ ordem: "asc" }, { criadoEm: "desc" }],
  });

  return Response.json({ lista, gerencia: podeGerenciar(eu) });
}

// Cadastra uma campanha de conscientização (gestão do condomínio)
export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!podeGerenciar(eu)) return json403();

  const corpo = await req.json().catch(() => ({}) as never);
  const titulo = String(corpo.titulo ?? "").trim();
  const mensagem = String(corpo.mensagem ?? "").trim();
  const descricao = String(corpo.descricao ?? "").trim();
  const categoria = CATEGORIAS.includes(corpo.categoria) ? corpo.categoria : "CONVIVENCIA";
  const emoji = String(corpo.emoji ?? "📣").trim().slice(0, 8) || "📣";

  if (!titulo || !mensagem) {
    return Response.json({ erro: "Informe título e mensagem da campanha." }, { status: 400 });
  }
  if (titulo.length > 80) {
    return Response.json({ erro: "O título deve ter até 80 caracteres." }, { status: 400 });
  }
  if (mensagem.length > 200) {
    return Response.json({ erro: "A mensagem deve ter até 200 caracteres." }, { status: 400 });
  }

  // Período de veiculação opcional
  await garantirSchema();

  let inicioEm: Date | null = null;
  let fimEm: Date | null = null;
  if (corpo.inicioEm) {
    inicioEm = new Date(corpo.inicioEm);
    if (Number.isNaN(inicioEm.getTime())) {
      return Response.json({ erro: "Data de início inválida." }, { status: 400 });
    }
  }
  if (corpo.fimEm) {
    fimEm = new Date(corpo.fimEm);
    if (Number.isNaN(fimEm.getTime())) {
      return Response.json({ erro: "Data de encerramento inválida." }, { status: 400 });
    }
    fimEm = new Date(fimEm.getTime() + 24 * 3600 * 1000 - 1); // fim do dia
  }
  if (inicioEm && fimEm && inicioEm > fimEm) {
    return Response.json({ erro: "O encerramento deve ser depois do início." }, { status: 400 });
  }

  const campanha = await db.campanha.create({
    data: {
      condominioId: eu.condominio.id,
      titulo,
      mensagem,
      descricao: descricao || null,
      categoria,
      emoji,
      inicioEm,
      fimEm,
      autorId: eu.id,
    },
    include: { autor: { select: { nome: true, perfil: true } } },
  });

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "CAMPANHA_CRIADA",
    detalhe: campanha.titulo,
  });
  await notificarCondominio(eu.condominio.id, "CAMPANHA", {
    titulo: "Nova campanha em destaque",
    mensagem: campanha.titulo,
    excetoUsuarioId: eu.id,
  });

  return Response.json({ campanha });
}
