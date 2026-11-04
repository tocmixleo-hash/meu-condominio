/**
 * Rate limit do login com armazenamento no BANCO (TentativaLogin):
 * funciona entre todas as instâncias serverless — a primeira camada em
 * memória (por instância) segue como proteção extra de custo.
 * Conta apenas TENTATIVAS FALHAS — acertos limpam o contador da chave.
 */
import { db } from "@/lib/db";

const JANELA_MS = 10 * 60 * 1000; // 10 minutos
const MAX_FALHAS = 8;

/** true se a tentativa pode seguir (sem contar tentativa). */
export async function permitirTentativa(chave: string): Promise<boolean> {
  const corte = new Date(Date.now() - JANELA_MS);
  const falhas = await db.tentativaLogin.count({
    where: { chave, criadoEm: { gte: corte } },
  });
  return falhas < MAX_FALHAS;
}

/** Registra uma falha de credencial para a chave. */
export async function registrarFalha(chave: string) {
  try {
    await db.tentativaLogin.create({ data: { chave } });
    // Limpeza oportunista: descarta histórico antigo (1h) em ~10% das falhas
    if (Math.random() < 0.1) {
      await db.tentativaLogin.deleteMany({
        where: { criadoEm: { lt: new Date(Date.now() - 3_600_000) } },
      });
    }
  } catch {
    // o rate limit nunca deve derrubar o login
  }
}

/** Acertou a credencial — limpa o histórico da chave. */
export async function limparTentativas(chave: string) {
  try {
    await db.tentativaLogin.deleteMany({ where: { chave } });
  } catch {
    // idem
  }
}

export function ipDaRequisicao(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim();
  return ip || "local";
}
