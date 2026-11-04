import { db } from "@/lib/db";
import { json401, usuarioAtual } from "@/lib/auth";
import { hojeISO } from "@/lib/datas";

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  const cid = eu.condominio.id;

  const hoje = new Date();
  const isoHoje = hojeISO();
  const em30dias = new Date(hoje.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  const em7dias = new Date(hoje.getTime() + 7 * 86400000).toISOString().slice(0, 10);

  if (eu.perfil === "MORADOR") {
    const [encomendasAguardando, encomendasRecentes, reservasProximas, autorizacoesAtivas, comunicadosRecentes, minhasOcorrenciasAbertas, ocorrenciasRecentes] =
      await Promise.all([
        db.encomenda.count({ where: { condominioId: cid, destinatarioId: eu.id, status: "AGUARDANDO" } }),
        db.encomenda.findMany({
          where: { condominioId: cid, destinatarioId: eu.id, status: "AGUARDANDO" },
          orderBy: { recebidaEm: "desc" },
          take: 3,
        }),
        db.reserva.findMany({
          where: { condominioId: cid, solicitanteId: eu.id, data: { gte: isoHoje }, status: { in: ["PENDENTE", "CONFIRMADA"] } },
          orderBy: { data: "asc" },
          take: 3,
        }),
        db.autorizacao.findMany({
          where: { condominioId: cid, moradorId: eu.id, status: "ATIVA", dataFim: { gte: isoHoje } },
          orderBy: { criadoEm: "desc" },
          take: 3,
        }),
        db.comunicado.findMany({ where: { condominioId: cid }, orderBy: { criadoEm: "desc" }, take: 3 }),
        db.ocorrencia.count({ where: { condominioId: cid, abertaPorId: eu.id, status: { not: "RESOLVIDA" } } }),
        db.ocorrencia.findMany({
          where: { condominioId: cid, abertaPorId: eu.id },
          orderBy: { criadoEm: "desc" },
          take: 3,
        }),
      ]);

    return Response.json({
      perfil: eu.perfil,
      indicadores: [
        { rotulo: "Encomendas aguardando", valor: encomendasAguardando },
        { rotulo: "Reservas próximas", valor: reservasProximas.length },
        { rotulo: "Autorizações ativas", valor: autorizacoesAtivas.length },
        { rotulo: "Minhas ocorrências abertas", valor: minhasOcorrenciasAbertas },
      ],
      encomendasRecentes,
      reservasProximas,
      autorizacoesAtivas,
      comunicadosRecentes,
      ocorrenciasRecentes,
    });
  }

  if (eu.perfil === "PORTARIA") {
    const [encomendasAguardando, autorizacoesAtivas, visitantesHoje, encomendasRecentes, autorizacoesRecentes, ocorrenciasAbertas, ocorrenciasRecentes] =
      await Promise.all([
        db.encomenda.count({ where: { condominioId: cid, status: "AGUARDANDO" } }),
        db.autorizacao.count({ where: { condominioId: cid, status: "ATIVA", dataFim: { gte: isoHoje } } }),
        db.autorizacao.count({ where: { condominioId: cid, status: "ATIVA", dataInicio: { lte: isoHoje }, dataFim: { gte: isoHoje } } }),
        db.encomenda.findMany({
          where: { condominioId: cid, status: "AGUARDANDO" },
          include: { destinatario: { include: { unidade: true } } },
          orderBy: { recebidaEm: "desc" },
          take: 5,
        }),
        db.autorizacao.findMany({
          where: { condominioId: cid, status: "ATIVA", dataFim: { gte: isoHoje } },
          include: { morador: { include: { unidade: true } } },
          orderBy: { dataInicio: "asc" },
          take: 5,
        }),
        db.ocorrencia.count({ where: { condominioId: cid, status: { not: "RESOLVIDA" } } }),
        db.ocorrencia.findMany({
          where: { condominioId: cid, status: { not: "RESOLVIDA" } },
          include: { abertaPor: { include: { unidade: true } } },
          orderBy: { criadoEm: "desc" },
          take: 3,
        }),
      ]);

    return Response.json({
      perfil: eu.perfil,
      indicadores: [
        { rotulo: "Encomendas na portaria", valor: encomendasAguardando },
        { rotulo: "Autorizações ativas", valor: autorizacoesAtivas },
        { rotulo: "Visitantes previstos hoje", valor: visitantesHoje },
        { rotulo: "Ocorrências abertas", valor: ocorrenciasAbertas },
      ],
      encomendasRecentes,
      autorizacoesRecentes,
      ocorrenciasRecentes,
    });
  }

  // Síndico e Administrativo (Gestão)
  const [moradoresAtivos, reservasPendentes, encomendasAguardando, autorizacoesAtivas, reservasLista, assembleiasProximas, comunicadosRecentes, ocorrenciasAbertas, ocorrenciasRecentes, manutencoesPendentes] =
    await Promise.all([
      db.usuario.count({ where: { condominioId: cid, perfil: "MORADOR", ativo: true } }),
      db.reserva.count({ where: { condominioId: cid, status: "PENDENTE" } }),
      db.encomenda.count({ where: { condominioId: cid, status: "AGUARDANDO" } }),
      db.autorizacao.count({ where: { condominioId: cid, status: "ATIVA", dataFim: { gte: isoHoje } } }),
      db.reserva.findMany({
        where: { condominioId: cid, status: "PENDENTE", data: { lte: em30dias } },
        include: { solicitante: { include: { unidade: true } } },
        orderBy: { data: "asc" },
        take: 5,
      }),
      db.assembleia.findMany({
        where: { condominioId: cid, status: "AGENDADA", data: { gte: isoHoje } },
        orderBy: { data: "asc" },
        take: 3,
      }),
      db.comunicado.findMany({ where: { condominioId: cid }, orderBy: { criadoEm: "desc" }, take: 3 }),
      db.ocorrencia.count({ where: { condominioId: cid, status: { not: "RESOLVIDA" } } }),
      db.ocorrencia.findMany({
        where: { condominioId: cid, status: { not: "RESOLVIDA" } },
        include: { abertaPor: { include: { unidade: true } } },
        orderBy: { criadoEm: "desc" },
        take: 4,
      }),
      db.manutencao.count({
        where: { condominioId: cid, ativo: true, proximaData: { lte: em7dias } },
      }),
    ]);

  return Response.json({
    perfil: eu.perfil,
    indicadores: [
      { rotulo: "Moradores ativos", valor: moradoresAtivos },
      { rotulo: "Reservas pendentes", valor: reservasPendentes },
      { rotulo: "Encomendas na portaria", valor: encomendasAguardando },
      { rotulo: "Autorizações ativas", valor: autorizacoesAtivas },
      { rotulo: "Ocorrências abertas", valor: ocorrenciasAbertas },
      { rotulo: "Manutenções a vencer/vencidas", valor: manutencoesPendentes },
    ],
    reservasLista,
    assembleiasProximas,
    comunicadosRecentes,
    ocorrenciasRecentes,
  });
}
