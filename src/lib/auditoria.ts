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
