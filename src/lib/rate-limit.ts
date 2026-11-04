/**
 * Rate limit simples em memória para o endpoint de login.
 * Conta apenas TENTATIVAS FALHAS — acertos limpam o contador.
 * Em serverless o Map é por instância — é uma proteção primeira contra
 * força bruta, não um bloqueio global (para isso, use um middleware com
 * armazenamento compartilhado, ex. Upstash Redis).
 */
const JANELA_MS = 10 * 60 * 1000; // 10 minutos
const MAX_FALHAS = 8;

const registros = new Map<string, { n: number; expira: number }>();

/** true se a tentativa pode seguir (sem contar tentativa). */
export function permitirTentativa(chave: string): boolean {
  const agora = Date.now();
  const atual = registros.get(chave);
  if (atual && agora <= atual.expira && atual.n >= MAX_FALHAS) return false;
  return true;
}

/** Registra uma falha de credencial para a chave. */
export function registrarFalha(chave: string) {
  const agora = Date.now();
  const atual = registros.get(chave);
  if (!atual || agora > atual.expira) {
    registros.set(chave, { n: 1, expira: agora + JANELA_MS });
  } else {
    atual.n += 1;
  }
}

/** Acertou a credencial — limpa o histórico da chave. */
export function limparTentativas(chave: string) {
  registros.delete(chave);
}

export function ipDaRequisicao(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim();
  return ip || "local";
}
