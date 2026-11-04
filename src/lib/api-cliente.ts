/**
 * Leitura defensiva das respostas fetch do portal.
 *
 * Gateways/proxies do ambiente (ex. preview do sandbox) podem devolver corpos
 * que não são JSON (SSE "data: …", HTML de erro, 502…). Em vez de um
 * SyntaxError bruto no interface, o portal mostra uma mensagem amigável.
 */

/** Faz o parse do corpo da resposta; devolve null quando não é JSON válido. */
export async function corpoJson<T = { erro?: string }>(
  r: Response,
): Promise<T | null> {
  const tipo = r.headers.get("content-type") ?? "";
  if (!tipo.includes("json")) return null;
  try {
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

/** Mensagem amigável quando o corpo veio vazio ou ilegível. */
export function mensagemRede(status: number): string {
  if (status >= 500) {
    return "Serviço temporariamente indisponível. Tente novamente em alguns instantes.";
  }
  return `Não foi possível falar com o servidor (código ${status}). Recarregue a página e tente novamente.`;
}

/** Transforma um erro qualquer em mensagem amigável para o usuário. */
export function mensagemDeErro(e: unknown, alternativa: string): string {
  if (e instanceof TypeError) {
    return "Não foi possível conectar ao portal. Verifique a conexão e tente novamente.";
  }
  if (e instanceof Error && e.message) return e.message;
  return alternativa;
}
