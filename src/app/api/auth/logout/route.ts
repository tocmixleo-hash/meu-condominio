import { COOKIE_SESSAO } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST() {
  const loja = await cookies();
  loja.delete(COOKIE_SESSAO);
  return Response.json({ ok: true });
}
