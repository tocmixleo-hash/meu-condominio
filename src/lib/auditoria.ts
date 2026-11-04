import { db } from "@/lib/db";

/** Registra uma ação no histórico de auditoria (nunca falha a requisição). */
export async function registrarAcao(dados: {
  condominioId: string;
  usuarioId?: string | null;
  acao: string;
  detalhe?: string | null;
}) {
  try {
    await db.auditoria.create({
      data: {
        condominioId: dados.condominioId,
        usuarioId: dados.usuarioId ?? null,
        acao: dados.acao,
        detalhe: dados.detalhe ?? null,
      },
    });
  } catch {
    // auditoria não deve bloquear a operação principal
  }
}

export const ROTULO_ACAO: Record<string, string> = {
  LOGIN: "Entrou no portal",
  COMUNICADO_CRIADO: "Publicou comunicado",
  RESERVA_CRIADA: "Solicitou reserva",
  RESERVA_CONFIRMADA: "Confirmou reserva",
  RESERVA_REJEITADA: "Rejeitou reserva",
  RESERVA_CANCELADA: "Cancelou reserva",
  ENCOMENDA_REGISTRADA: "Registrou encomenda",
  ENCOMENDA_RETIRADA: "Deu baixa em encomenda",
  AUTORIZACAO_CRIADA: "Autorizou visitante",
  AUTORIZACAO_CANCELADA: "Cancelou autorização",
  MORADOR_CADASTRADO: "Cadastrou morador",
  MORADOR_ALTERADO: "Alterou morador",
  DOCUMENTO_ENVIADO: "Enviou documento",
  DOCUMENTO_EXCLUIDO: "Excluiu documento",
  ASSEMBLEIA_CRIADA: "Agendou assembleia",
  ASSEMBLEIA_ALTERADA: "Atualizou assembleia",
};
