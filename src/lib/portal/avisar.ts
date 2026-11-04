// Avisa o mini-serviço de WebSocket (encomenda-socket, porta 3003) para emitir
// eventos em tempo real aos moradores conectados. Falha silenciosa: se o serviço
// estiver offline, o portal segue funcionando (listas atualizam por polling).

const PORTA_SOCKET = 3003

export async function avisarSocket(
  usuarioId: string,
  evento: 'encomenda' | 'encomenda-retirada' | 'autorizacao' | 'portaria-atualizou',
  dados: unknown,
): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${PORTA_SOCKET}/notificar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuarioId, evento, dados }),
      signal: AbortSignal.timeout(2500),
    })
    return res.ok
  } catch {
    return false
  }
}
