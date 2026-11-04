import { db } from "@/lib/db";
import { ehGestao, json401, json403, pode, usuarioAtual } from "@/lib/auth";
import { registrarAcao } from "@/lib/auditoria";
import { ROTULO_PERIODICIDADE } from "@/lib/rotulos";
import { hojeISO } from "@/lib/datas";

const PERIODICIDADES = ["MENSAL", "BIMESTRAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"];
const MESES: Record<string, number> = {
  MENSAL: 1,
  BIMESTRAL: 2,
  TRIMESTRAL: 3,
  SEMESTRAL: 6,
  ANUAL: 12,
};
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Soma N meses a uma data ISO (yyyy-MM-dd) mantendo o dia. */
function somarMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const total = (a * 12 + (m - 1)) + meses;
  const ano = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!pode(eu, "manutencao")) return json403();

  const hoje = hojeISO();
  const em7dias = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const lista = await db.manutencao.findMany({
    where: { condominioId: eu.condominio.id, ativo: true },
    orderBy: { proximaData: "asc" },
  });
  // Situação calculada no servidor — o cliente só exibe
  const comSituacao = lista.map((m) => ({
    ...m,
    situacao: m.proximaData < hoje ? "VENCIDA" : m.proximaData <= em7dias ? "A_VENCER" : "EM_DIA",
  }));
  return Response.json({ lista: comSituacao });
}

export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  // Agenda preventiva é decisão da gestão do condomínio
  if (!pode(eu, "manutencao") || !ehGestao(eu.perfil)) return json403();

  const { titulo, descricao, periodicidade, proximaData, responsavel } =
    await req.json().catch(() => ({}) as never);
  if (!titulo?.trim() || !ISO.test(proximaData || "") || !PERIODICIDADES.includes(periodicidade)) {
    return Response.json(
      { erro: "Informe título, próxima data e uma periodicidade válida." },
      { status: 400 },
    );
  }

  const manutencao = await db.manutencao.create({
    data: {
      condominioId: eu.condominio.id,
      titulo: String(titulo).trim().slice(0, 160),
      descricao: descricao?.trim()?.slice(0, 4000) || null,
      periodicidade,
      proximaData,
      responsavel: responsavel?.trim()?.slice(0, 160) || null,
    },
  });

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "MANUTENCAO_CRIADA",
    detalhe: `${manutencao.titulo} · ${ROTULO_PERIODICIDADE[periodicidade]} · próxima em ${proximaData}`,
  });
  return Response.json({ manutencao });
}

export async function PATCH(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!pode(eu, "manutencao") || !ehGestao(eu.perfil)) return json403();

  const { id, acao, titulo, descricao, periodicidade, proximaData, responsavel, ativo } =
    await req.json().catch(() => ({}) as never);
  const atual = await db.manutencao.findUnique({ where: { id } });
  if (!atual || atual.condominioId !== eu.condominio.id) {
    return Response.json({ erro: "Manutenção não encontrada." }, { status: 404 });
  }

  // Registrar a realização hoje: recalcula a próxima data pela periodicidade
  if (acao === "REALIZAR") {
    const hoje = hojeISO();
    const meses = MESES[atual.periodicidade] ?? 6;
    const manutencao = await db.manutencao.update({
      where: { id },
      data: { ultimaData: hoje, proximaData: somarMeses(hoje, meses) },
    });
    await registrarAcao({
      condominioId: eu.condominio.id,
      usuarioId: eu.id,
      acao: "MANUTENCAO_REALIZADA",
      detalhe: `${manutencao.titulo} · próxima em ${manutencao.proximaData}`,
    });
    return Response.json({ manutencao });
  }

  const dados: Record<string, unknown> = {};
  if (titulo !== undefined) {
    if (!String(titulo).trim()) {
      return Response.json({ erro: "O título não pode ficar vazio." }, { status: 400 });
    }
    dados.titulo = String(titulo).trim().slice(0, 160);
  }
  if (descricao !== undefined) dados.descricao = descricao?.trim()?.slice(0, 4000) || null;
  if (periodicidade !== undefined) {
    if (!PERIODICIDADES.includes(periodicidade)) {
      return Response.json({ erro: "Periodicidade inválida." }, { status: 400 });
    }
    dados.periodicidade = periodicidade;
  }
  if (proximaData !== undefined) {
    if (!ISO.test(proximaData)) {
      return Response.json({ erro: "Data inválida." }, { status: 400 });
    }
    dados.proximaData = proximaData;
  }
  if (responsavel !== undefined) dados.responsavel = responsavel?.trim()?.slice(0, 160) || null;
  if (ativo !== undefined) dados.ativo = Boolean(ativo);

  const manutencao = await db.manutencao.update({ where: { id }, data: dados });
  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "MANUTENCAO_ALTERADA",
    detalhe: `${manutencao.titulo} · próxima em ${manutencao.proximaData}`,
  });
  return Response.json({ manutencao });
}
