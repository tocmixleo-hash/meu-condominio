import { db } from "@/lib/db";
import { ehGestao, json401, json403, pode, usuarioAtual } from "@/lib/auth";
import { registrarAcao } from "@/lib/auditoria";
import { ROTULO_ESPACO } from "@/lib/rotulos";

const ESPACOS = ["SALAO_FESTAS", "CHURRASQUEIRA", "QUADRA", "PISCINA"];
const PADRAO = { antecedenciaMaxDias: 60, limiteMensalUnidade: 2, regrasTexto: "" };

/** Regras vigentes por espaço: configuração do condomínio ou padrão da plataforma. */
export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!pode(eu, "reservas")) return json403();

  const gravadas = await db.regraReserva.findMany({
    where: { condominioId: eu.condominio.id },
  });
  const porEspaco = Object.fromEntries(gravadas.map((r) => [r.espaco, r]));
  const lista = ESPACOS.map((espaco) => {
    const r = porEspaco[espaco];
    return {
      espaco,
      rotulo: ROTULO_ESPACO[espaco] ?? espaco,
      antecedenciaMaxDias: r?.antecedenciaMaxDias ?? PADRAO.antecedenciaMaxDias,
      limiteMensalUnidade: r?.limiteMensalUnidade ?? PADRAO.limiteMensalUnidade,
      regrasTexto: r?.regrasTexto ?? "",
      padrao: !r,
    };
  });
  return Response.json({ lista });
}

/** Gestão ajusta as regras de um espaço (cria/atualiza a configuração). */
export async function PATCH(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!pode(eu, "reservas") || !ehGestao(eu.perfil)) return json403();

  const { espaco, antecedenciaMaxDias, limiteMensalUnidade, regrasTexto } =
    await req.json().catch(() => ({}) as never);
  if (!ESPACOS.includes(espaco)) {
    return Response.json({ erro: "Espaço inválido." }, { status: 400 });
  }
  const antecedencia = Number(antecedenciaMaxDias);
  const limite = Number(limiteMensalUnidade);
  if (!Number.isInteger(antecedencia) || antecedencia < 0 || antecedencia > 365) {
    return Response.json({ erro: "Antecedência deve ser entre 0 e 365 dias." }, { status: 400 });
  }
  if (!Number.isInteger(limite) || limite < 1 || limite > 31) {
    return Response.json({ erro: "Limite mensal deve ser entre 1 e 31." }, { status: 400 });
  }

  const regra = await db.regraReserva.upsert({
    where: { condominioId_espaco: { condominioId: eu.condominio.id, espaco } },
    create: {
      condominioId: eu.condominio.id,
      espaco,
      antecedenciaMaxDias: antecedencia,
      limiteMensalUnidade: limite,
      regrasTexto: regrasTexto?.trim()?.slice(0, 2000) || null,
    },
    update: {
      antecedenciaMaxDias: antecedencia,
      limiteMensalUnidade: limite,
      regrasTexto: regrasTexto?.trim()?.slice(0, 2000) || null,
    },
  });

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "RESERVA_REGRAS",
    detalhe: `Regras de reserva — ${ROTULO_ESPACO[espaco] ?? espaco}: ${antecedencia}d de antecedência, ${limite}/mês por unidade`,
  });
  return Response.json({ regra });
}
