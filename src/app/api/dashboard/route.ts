import { db } from "@/lib/db";
import { json401, usuarioAtual } from "@/lib/auth";

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();

  const hoje = new Date();
  const isoHoje = hoje.toISOString().slice(0, 10);
  const em30dias = new Date(hoje.getTime() + 30 * 86400000).toISOString().slice(0, 10);

  if (eu.perfil === "MORADOR") {
    const [encomendasAguardando, encomendasRecentes, reservasProximas, autorizacoesAtivas, comunicadosRecentes] =
      await Promise.all([
        db.encomenda.count({ where: { destinatarioId: eu.id, status: "AGUARDANDO" } }),
        db.encomenda.findMany({
          where: { destinatarioId: eu.id, status: "AGUARDANDO" },
          orderBy: { recebidaEm: "desc" },
          take: 3,
        }),
        db.reserva.findMany({
          where: { solicitanteId: eu.id, data: { gte: isoHoje }, status: { in: ["PENDENTE", "CONFIRMADA"] } },
          orderBy: { data: "asc" },
          take: 3,
        }),
        db.autorizacao.findMany({
          where: { moradorId: eu.id, status: "ATIVA", dataFim: { gte: isoHoje } },
          orderBy: { criadoEm: "desc" },
          take: 3,
        }),
        db.comunicado.findMany({ orderBy: { criadoEm: "desc" }, take: 3 }),
      ]);

    return Response.json({
      perfil: eu.perfil,
      indicadores: [
        { rotulo: "Encomendas aguardando", valor: encomendasAguardando },
        { rotulo: "Reservas próximas", valor: reservasProximas.length },
        { rotulo: "Autorizações ativas", valor: autorizacoesAtivas.length },
      ],
      encomendasRecentes,
      reservasProximas,
      autorizacoesAtivas,
      comunicadosRecentes,
    });
  }

  if (eu.perfil === "PORTARIA") {
    const [encomendasAguardando, autorizacoesAtivas, visitantesHoje, encomendasRecentes, autorizacoesRecentes] =
      await Promise.all([
        db.encomenda.count({ where: { status: "AGUARDANDO" } }),
        db.autorizacao.count({ where: { status: "ATIVA", dataFim: { gte: isoHoje } } }),
        db.autorizacao.count({ where: { status: "ATIVA", dataInicio: { lte: isoHoje }, dataFim: { gte: isoHoje } } }),
        db.encomenda.findMany({
          where: { status: "AGUARDANDO" },
          include: { destinatario: { include: { unidade: true } } },
          orderBy: { recebidaEm: "desc" },
          take: 5,
        }),
        db.autorizacao.findMany({
          where: { status: "ATIVA", dataFim: { gte: isoHoje } },
          include: { morador: { include: { unidade: true } } },
          orderBy: { dataInicio: "asc" },
          take: 5,
        }),
      ]);

    return Response.json({
      perfil: eu.perfil,
      indicadores: [
        { rotulo: "Encomendas na portaria", valor: encomendasAguardando },
        { rotulo: "Autorizações ativas", valor: autorizacoesAtivas },
        { rotulo: "Visitantes previstos hoje", valor: visitantesHoje },
      ],
      encomendasRecentes,
      autorizacoesRecentes,
    });
  }

  // Síndico e Administrativo (Gestão)
  const [moradoresAtivos, reservasPendentes, encomendasAguardando, autorizacoesAtivas, reservasLista, assembleiasProximas, comunicadosRecentes] =
    await Promise.all([
      db.usuario.count({ where: { perfil: "MORADOR", ativo: true } }),
      db.reserva.count({ where: { status: "PENDENTE" } }),
      db.encomenda.count({ where: { status: "AGUARDANDO" } }),
      db.autorizacao.count({ where: { status: "ATIVA", dataFim: { gte: isoHoje } } }),
      db.reserva.findMany({
        where: { status: "PENDENTE", data: { lte: em30dias } },
        include: { solicitante: { include: { unidade: true } } },
        orderBy: { data: "asc" },
        take: 5,
      }),
      db.assembleia.findMany({
        where: { status: "AGENDADA", data: { gte: isoHoje } },
        orderBy: { data: "asc" },
        take: 3,
      }),
      db.comunicado.findMany({ orderBy: { criadoEm: "desc" }, take: 3 }),
    ]);

  return Response.json({
    perfil: eu.perfil,
    indicadores: [
      { rotulo: "Moradores ativos", valor: moradoresAtivos },
      { rotulo: "Reservas pendentes", valor: reservasPendentes },
      { rotulo: "Encomendas na portaria", valor: encomendasAguardando },
      { rotulo: "Autorizações ativas", valor: autorizacoesAtivas },
    ],
    reservasLista,
    assembleiasProximas,
    comunicadosRecentes,
  });
}
