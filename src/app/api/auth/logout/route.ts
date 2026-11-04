import { COOKIE_SESSAO, COOKIE_SIMULACAO } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST() {
  const loja = await cookies();
  loja.delete(COOKIE_SESSAO);
  loja.delete(COOKIE_SIMULACAO); // encerra também qualquer simulação em curso
  return Response.json({ ok: true });
}
