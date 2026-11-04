/**
 * Rate limit simples em memória para o endpoint de login.
 * Em serverless o Map é por instância — é uma proteção primeira contra
 * força bruta, não um bloqueio global (para isso, use um middleware com
 * armazenamento compartilhado, ex. Upstash Redis).
 */
const JANELA_MS = 10 * 60 * 1000; // 10 minutos
const MAX_TENTATIVAS = 8;

const registros = new Map<string, { n: number; expira: number }>();

export function permitirTentativa(chave: string): boolean {
  const agora = Date.now();
  const atual = registros.get(chave);
  if (!atual || agora > atual.expira) {
    registros.set(chave, { n: 1, expira: agora + JANELA_MS });
    return true;
  }
  if (atual.n >= MAX_TENTATIVAS) return false;
  atual.n += 1;
  return true;
}

// Limpeza ocasional para o Map não crescer sem limite
export function limparRegistrosExpirados() {
  const agora = Date.now();
  for (const [chave, r] of registros) if (agora > r.expira) registros.delete(chave);
}

export function ipDaRequisicao(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim();
  return ip || "local";
}
